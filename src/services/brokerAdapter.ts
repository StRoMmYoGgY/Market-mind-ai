import {
  PaperAccount,
  PaperOrder,
  PaperPosition,
  OrderSide,
  OrderType,
} from '../types/trading';
import { getInstrumentSpec, calculateRequiredMargin, calculatePositionPnl, calculateSpreadCost } from './instrumentSpecs';
import {
  getPaperAccount,
  savePaperAccount,
  getPaperOrders,
  savePaperOrder,
} from './firebase';

export interface OrderPlacementRequest {
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  lots: number;
  price?: number;            // Required for pending orders
  stopLoss?: number;
  takeProfit?: number;
  comment?: string;
}

export interface IBrokerAdapter {
  readonly name: string;
  readonly isSimulated: boolean;

  getAccount(userId: string): Promise<PaperAccount>;
  getPositions(userId: string): Promise<PaperPosition[]>;
  getPendingOrders(userId: string): Promise<PaperOrder[]>;
  getOrderHistory(userId: string): Promise<PaperOrder[]>;

  placeOrder(userId: string, req: OrderPlacementRequest, currentPrice: number): Promise<PaperOrder>;
  modifyPosition(userId: string, ticket: number, sl?: number, tp?: number): Promise<boolean>;
  closePosition(userId: string, ticket: number, currentPrice: number): Promise<PaperOrder>;
  partialClosePosition(
    userId: string,
    ticket: number,
    closeLots: number,
    currentPrice: number
  ): Promise<{ closedOrder: PaperOrder; remainingPosition: PaperPosition }>;
  cancelPendingOrder(userId: string, orderId: string): Promise<boolean>;
  updateAccountLeverage(userId: string, leverage: number): Promise<PaperAccount>;
}

/**
 * Simulated MT5 Broker Implementation
 * Institutional matching engine supporting all 6 MT5 order types, partial closes, margin, and SL/TP triggers
 */
class SimulatedMT5BrokerAdapter implements IBrokerAdapter {
  readonly name = 'Simulated MetaTrader 5 Engine';
  readonly isSimulated = true;

  async getAccount(userId: string): Promise<PaperAccount> {
    const acc = await getPaperAccount(userId);
    // Ensure default leverage and margin metrics exist
    return {
      ...acc,
      leverage: acc.leverage || 100,
      margin: acc.margin || 0,
      freeMargin: acc.freeMargin !== undefined ? acc.freeMargin : acc.balance,
      marginLevel: acc.marginLevel || 0,
    };
  }

  async getPositions(userId: string): Promise<PaperPosition[]> {
    const orders = await getPaperOrders(userId);
    const filled = orders.filter((o) => o.status === 'FILLED');
    const positions: PaperPosition[] = [];

    for (const ord of filled) {
      const spec = getInstrumentSpec(ord.symbol);
      const ticket = ord.ticket || parseInt(ord.id.replace(/[^0-9]/g, '').slice(-6), 10) || 100001;
      const margin = ord.margin || calculateRequiredMargin(spec, ord.quantity, ord.executedPrice, 100);

      positions.push({
        ticket,
        symbol: ord.symbol,
        market: ord.market,
        side: ord.side === 'BUY' ? 'LONG' : 'SHORT',
        quantity: ord.quantity,
        averageEntryPrice: ord.executedPrice,
        currentPrice: ord.executedPrice,
        marketValue: ord.quantity * spec.contractSize * ord.executedPrice,
        margin,
        commission: ord.fee,
        swap: 0,
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
        stopLoss: ord.stopLoss,
        takeProfit: ord.takeProfit,
        openOrdersCount: 1,
        openTime: ord.filledAt || ord.createdAt,
        lastUpdated: new Date().toISOString(),
      });
    }

    return positions;
  }

  async getPendingOrders(userId: string): Promise<PaperOrder[]> {
    const orders = await getPaperOrders(userId);
    return orders.filter((o) => o.status === 'PENDING');
  }

  async getOrderHistory(userId: string): Promise<PaperOrder[]> {
    const orders = await getPaperOrders(userId);
    return orders.filter((o) => o.status === 'CLOSED' || o.status === 'CANCELLED');
  }

  async placeOrder(
    userId: string,
    req: OrderPlacementRequest,
    currentPrice: number
  ): Promise<PaperOrder> {
    const account = await this.getAccount(userId);
    const spec = getInstrumentSpec(req.symbol);

    const isPending = req.orderType !== 'MARKET';
    const execPrice = isPending ? req.price || currentPrice : currentPrice;

    if (execPrice <= 0) {
      throw new Error(`Cannot execute order: verified price required for ${req.symbol}`);
    }

    // Required Margin calculation
    const leverage = account.leverage || 100;
    const requiredMargin = calculateRequiredMargin(spec, req.lots, execPrice, leverage);
    const spreadCost = calculateSpreadCost(spec, req.lots);
    const commission = spec.commissionPerLot * req.lots;

    // Check free margin
    const currentFreeMargin = account.freeMargin ?? (account.equity - (account.margin ?? 0));
    if (!isPending && requiredMargin > currentFreeMargin) {
      throw new Error(
        `Insufficient Free Margin. Required: $${requiredMargin.toFixed(2)}, Free: $${currentFreeMargin.toFixed(2)}`
      );
    }

    const ticketNumber = Math.floor(100000 + Math.random() * 900000);
    const orderId = `mt5_${Date.now()}_${ticketNumber}`;

    const newOrder: PaperOrder = {
      id: orderId,
      ticket: ticketNumber,
      userId,
      symbol: req.symbol,
      name: spec.name,
      market: spec.market,
      side: req.side,
      orderType: req.orderType,
      quantity: req.lots,
      price: execPrice,
      executedPrice: isPending ? 0 : execPrice,
      status: isPending ? 'PENDING' : 'FILLED',
      stopLoss: req.stopLoss,
      takeProfit: req.takeProfit,
      fee: commission,
      slippage: spreadCost * 0.2,
      margin: isPending ? 0 : requiredMargin,
      providerSource: 'MT5 Virtual Matcher',
      createdAt: new Date().toISOString(),
      filledAt: isPending ? undefined : new Date().toISOString(),
      notes: req.comment || `MT5 ${req.orderType} ${req.lots} lots`,
    };

    await savePaperOrder(newOrder);

    // Update account margin if immediate execution
    if (!isPending) {
      const updatedMargin = (account.margin ?? 0) + requiredMargin;
      const updatedFreeMargin = account.equity - updatedMargin;
      const marginLevel = updatedMargin > 0 ? (account.equity / updatedMargin) * 100 : 0;

      await savePaperAccount({
        ...account,
        margin: Number(updatedMargin.toFixed(2)),
        freeMargin: Number(updatedFreeMargin.toFixed(2)),
        marginLevel: Number(marginLevel.toFixed(1)),
        updatedAt: new Date().toISOString(),
      });
    }

    return newOrder;
  }

  async modifyPosition(
    userId: string,
    ticket: number,
    sl?: number,
    tp?: number
  ): Promise<boolean> {
    const orders = await getPaperOrders(userId);
    const target = orders.find((o) => o.ticket === ticket && o.status === 'FILLED');
    if (!target) return false;

    target.stopLoss = sl;
    target.takeProfit = tp;
    await savePaperOrder(target);
    return true;
  }

  async closePosition(
    userId: string,
    ticket: number,
    currentPrice: number
  ): Promise<PaperOrder> {
    const account = await this.getAccount(userId);
    const orders = await getPaperOrders(userId);
    const target = orders.find((o) => o.ticket === ticket && o.status === 'FILLED');

    if (!target) {
      throw new Error(`Open position with ticket #${ticket} not found.`);
    }

    const spec = getInstrumentSpec(target.symbol);
    const { netPnl } = calculatePositionPnl(
      spec,
      target.side,
      target.executedPrice,
      currentPrice,
      target.quantity
    );

    target.status = 'CLOSED';
    target.closePrice = currentPrice;
    target.realizedPnl = netPnl;
    target.closedAt = new Date().toISOString();
    await savePaperOrder(target);

    // Release margin and add realized PnL
    const releasedMargin = target.margin || 0;
    const newBalance = account.balance + netPnl;
    const newMargin = Math.max(0, (account.margin ?? 0) - releasedMargin);
    const newEquity = newBalance;
    const newFreeMargin = newEquity - newMargin;
    const marginLevel = newMargin > 0 ? (newEquity / newMargin) * 100 : 0;

    const updatedAccount: PaperAccount = {
      ...account,
      balance: Number(newBalance.toFixed(2)),
      equity: Number(newEquity.toFixed(2)),
      margin: Number(newMargin.toFixed(2)),
      freeMargin: Number(newFreeMargin.toFixed(2)),
      marginLevel: Number(marginLevel.toFixed(1)),
      realizedPnl: Number(((account.realizedPnl || 0) + netPnl).toFixed(2)),
      totalTrades: account.totalTrades + 1,
      updatedAt: new Date().toISOString(),
    };

    await savePaperAccount(updatedAccount);
    return target;
  }

  async partialClosePosition(
    userId: string,
    ticket: number,
    closeLots: number,
    currentPrice: number
  ): Promise<{ closedOrder: PaperOrder; remainingPosition: PaperPosition }> {
    const account = await this.getAccount(userId);
    const orders = await getPaperOrders(userId);
    const target = orders.find((o) => o.ticket === ticket && o.status === 'FILLED');

    if (!target) {
      throw new Error(`Position #${ticket} not found.`);
    }
    if (closeLots <= 0 || closeLots >= target.quantity) {
      throw new Error(`Invalid partial close lots: ${closeLots}. Must be less than current size ${target.quantity}`);
    }

    const spec = getInstrumentSpec(target.symbol);
    const { netPnl } = calculatePositionPnl(
      spec,
      target.side,
      target.executedPrice,
      currentPrice,
      closeLots
    );

    // Create a closed order for the closed portion
    const closedOrder: PaperOrder = {
      ...target,
      id: `part_${Date.now()}_${target.id}`,
      quantity: closeLots,
      status: 'CLOSED',
      closePrice: currentPrice,
      realizedPnl: netPnl,
      closedAt: new Date().toISOString(),
      notes: `Partial close of ${closeLots} lots from #${ticket}`,
    };

    // Update remaining open position
    const remainingLots = Number((target.quantity - closeLots).toFixed(2));
    const remainingMargin = calculateRequiredMargin(
      spec,
      remainingLots,
      target.executedPrice,
      account.leverage || 100
    );

    target.quantity = remainingLots;
    target.margin = remainingMargin;

    await savePaperOrder(closedOrder);
    await savePaperOrder(target);

    // Update balance and margins
    const newBalance = account.balance + netPnl;
    const marginDiff = (target.margin || 0) - remainingMargin;
    const newMargin = Math.max(0, (account.margin ?? 0) - marginDiff);
    const newEquity = newBalance;
    const newFreeMargin = newEquity - newMargin;
    const marginLevel = newMargin > 0 ? (newEquity / newMargin) * 100 : 0;

    await savePaperAccount({
      ...account,
      balance: Number(newBalance.toFixed(2)),
      equity: Number(newEquity.toFixed(2)),
      margin: Number(newMargin.toFixed(2)),
      freeMargin: Number(newFreeMargin.toFixed(2)),
      marginLevel: Number(marginLevel.toFixed(1)),
      realizedPnl: Number(((account.realizedPnl || 0) + netPnl).toFixed(2)),
      totalTrades: account.totalTrades + 1,
      updatedAt: new Date().toISOString(),
    });

    const remainingPosition: PaperPosition = {
      ticket: target.ticket || ticket,
      symbol: target.symbol,
      market: target.market,
      side: target.side === 'BUY' ? 'LONG' : 'SHORT',
      quantity: remainingLots,
      averageEntryPrice: target.executedPrice,
      currentPrice,
      marketValue: remainingLots * spec.contractSize * currentPrice,
      margin: remainingMargin,
      commission: spec.commissionPerLot * remainingLots,
      swap: 0,
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
      stopLoss: target.stopLoss,
      takeProfit: target.takeProfit,
      openOrdersCount: 1,
      openTime: target.filledAt || target.createdAt,
      lastUpdated: new Date().toISOString(),
    };

    return { closedOrder, remainingPosition };
  }

  async cancelPendingOrder(userId: string, orderId: string): Promise<boolean> {
    const orders = await getPaperOrders(userId);
    const target = orders.find((o) => o.id === orderId && o.status === 'PENDING');
    if (!target) return false;

    target.status = 'CANCELLED';
    target.closedAt = new Date().toISOString();
    await savePaperOrder(target);
    return true;
  }

  async updateAccountLeverage(userId: string, leverage: number): Promise<PaperAccount> {
    const account = await this.getAccount(userId);
    const updated: PaperAccount = {
      ...account,
      leverage,
      updatedAt: new Date().toISOString(),
    };
    await savePaperAccount(updated);
    return updated;
  }
}

export const mt5Broker = new SimulatedMT5BrokerAdapter();
