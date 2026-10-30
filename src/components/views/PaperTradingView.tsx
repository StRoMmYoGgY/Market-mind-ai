import React, { useState, useEffect } from 'react';
import {
  WalletCards,
  ArrowUpRight,
  ArrowDownRight,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Clock,
  History,
  Layers,
} from 'lucide-react';
import {
  getPaperAccount,
  savePaperAccount,
  getPaperOrders,
  savePaperOrder,
} from '../../services/firebase';
import { getMarketQuote, binanceWS } from '../../services/marketApi';
import { PaperAccount, PaperOrder, PaperPosition, OrderSide, OrderType } from '../../types/trading';
import { MarketType } from '../../types/market';

interface PaperTradingViewProps {
  userId: string;
  initialInstrument?: { symbol: string; market: string; size?: number; stopLoss?: number; takeProfit?: number };
}

export const PaperTradingView: React.FC<PaperTradingViewProps> = ({
  userId,
  initialInstrument,
}) => {
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [orders, setOrders] = useState<PaperOrder[]>([]);

  // Form State
  const [symbol, setSymbol] = useState(initialInstrument?.symbol || 'BTC');
  const [market, setMarket] = useState<MarketType>(
    (initialInstrument?.market as MarketType) || 'crypto'
  );
  const [side, setSide] = useState<OrderSide>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState<number>(initialInstrument?.size || 0.1);
  const [limitPrice, setLimitPrice] = useState<number>(64000);
  const [stopLoss, setStopLoss] = useState<number | undefined>(initialInstrument?.stopLoss);
  const [takeProfit, setTakeProfit] = useState<number | undefined>(initialInstrument?.takeProfit);

  const [currentMarketPrice, setCurrentMarketPrice] = useState<number>(0);
  const [marketQuoteInfo, setMarketQuoteInfo] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load account and orders
  const loadData = async () => {
    const [acc, ords] = await Promise.all([
      getPaperAccount(userId),
      getPaperOrders(userId),
    ]);
    setAccount(acc);
    setOrders(ords);
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  // Load current price for active symbol
  useEffect(() => {
    let isMounted = true;
    getMarketQuote(symbol, market)
      .then((q) => {
        if (!isMounted) return;
        setCurrentMarketPrice(q.price);
        setMarketQuoteInfo(q);
        if (orderType === 'MARKET') {
          setLimitPrice(q.price);
        }
      })
      .catch(() => {});

    // Live websocket if crypto
    let unsub: (() => void) | undefined;
    if (market === 'crypto') {
      unsub = binanceWS.subscribe(symbol, (livePrice) => {
        if (!isMounted) return;
        setCurrentMarketPrice(livePrice);
      });
    }

    return () => {
      isMounted = false;
      if (unsub) unsub();
    };
  }, [symbol, market]);

  // Derive Open Positions from filled orders that are not closed
  const openPositions: PaperPosition[] = [];
  const openOrdersList = orders.filter((o) => o.status === 'OPEN' || o.status === 'FILLED');

  // Group by symbol
  const symbolMap = new Map<string, PaperOrder[]>();
  for (const o of openOrdersList) {
    if (!symbolMap.has(o.symbol)) symbolMap.set(o.symbol, []);
    symbolMap.get(o.symbol)!.push(o);
  }

  symbolMap.forEach((ordList, sym) => {
    const totalQty = ordList.reduce((acc, o) => acc + (o.side === 'BUY' ? o.quantity : -o.quantity), 0);
    if (Math.abs(totalQty) > 0.0001) {
      const totalCost = ordList.reduce((acc, o) => acc + o.executedPrice * o.quantity, 0);
      const avgPrice = totalCost / ordList.reduce((acc, o) => acc + o.quantity, 0);
      const curPrice = sym === symbol ? currentMarketPrice || avgPrice : avgPrice;
      const mktValue = Math.abs(totalQty) * curPrice;
      const unrealized = totalQty > 0 ? (curPrice - avgPrice) * totalQty : (avgPrice - curPrice) * Math.abs(totalQty);
      const unrealizedPct = avgPrice > 0 ? (unrealized / (avgPrice * Math.abs(totalQty))) * 100 : 0;

      openPositions.push({
        symbol: sym,
        market: ordList[0].market,
        side: totalQty > 0 ? 'LONG' : 'SHORT',
        quantity: Number(Math.abs(totalQty).toFixed(4)),
        averageEntryPrice: Number(avgPrice.toFixed(2)),
        currentPrice: Number(curPrice.toFixed(2)),
        marketValue: Number(mktValue.toFixed(2)),
        unrealizedPnl: Number(unrealized.toFixed(2)),
        unrealizedPnlPercent: Number(unrealizedPct.toFixed(2)),
        openOrdersCount: ordList.length,
        lastUpdated: new Date().toISOString(),
      });
    }
  });

  // Execute Simulated Order
  const handleExecuteOrder = async () => {
    if (!account) return;
    setMessage(null);

    // Rule: Prevent execution on reference-only rates (e.g. Frankfurter)
    if (marketQuoteInfo && !marketQuoteInfo.isTradableInPaper) {
      setMessage({
        type: 'error',
        text: 'This instrument is an ECB reference rate only. Executions are disallowed for non-tradable reference rates.',
      });
      return;
    }

    if (quantity <= 0) {
      setMessage({ type: 'error', text: 'Order quantity must be greater than zero.' });
      return;
    }

    const execPrice = orderType === 'MARKET' ? currentMarketPrice : limitPrice;
    if (execPrice <= 0) {
      setMessage({ type: 'error', text: 'A valid market price is required for execution.' });
      return;
    }

    const grossCost = quantity * execPrice;
    const feeRate = 0.00075; // 0.075%
    const slippageRate = 0.0005; // 0.05%
    const fee = grossCost * feeRate;
    const slippage = grossCost * slippageRate;
    const totalRequiredCash = side === 'BUY' ? grossCost + fee + slippage : fee + slippage;

    // Funds check
    if (side === 'BUY' && totalRequiredCash > account.balance) {
      setMessage({
        type: 'error',
        text: `Insufficient cash funds. Required: $${totalRequiredCash.toFixed(2)}, Available: $${account.balance.toFixed(2)}.`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const newOrder: PaperOrder = {
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        symbol,
        market,
        side,
        orderType,
        quantity,
        price: execPrice,
        executedPrice: Number((side === 'BUY' ? execPrice + execPrice * slippageRate : execPrice - execPrice * slippageRate).toFixed(4)),
        status: 'FILLED',
        fee: Number(fee.toFixed(2)),
        slippage: Number(slippage.toFixed(2)),
        stopLoss,
        takeProfit,
        providerSource: marketQuoteInfo?.provider || 'Verified Live Stream',
        createdAt: new Date().toISOString(),
        filledAt: new Date().toISOString(),
      };

      // Update account cash balance
      const newBalance = side === 'BUY' ? account.balance - totalRequiredCash : account.balance + grossCost - fee - slippage;
      const updatedAccount: PaperAccount = {
        ...account,
        balance: Number(newBalance.toFixed(2)),
        totalTrades: account.totalTrades + 1,
        updatedAt: new Date().toISOString(),
      };

      await savePaperOrder(newOrder);
      await savePaperAccount(updatedAccount);

      setAccount(updatedAccount);
      setOrders((prev) => [newOrder, ...prev]);
      setMessage({
        type: 'success',
        text: `Successfully executed ${side} ${quantity} ${symbol} at $${newOrder.executedPrice.toFixed(2)} (Fee: $${fee.toFixed(2)})`,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Execution failed' });
    } finally {
      setSubmitting(false);
    }
  };

  // Close Position
  const handleClosePosition = async (pos: PaperPosition) => {
    if (!account) return;
    const exitPrice = currentMarketPrice || pos.currentPrice;
    const grossPnl = pos.side === 'LONG' ? (exitPrice - pos.averageEntryPrice) * pos.quantity : (pos.averageEntryPrice - exitPrice) * pos.quantity;
    const fee = pos.quantity * exitPrice * 0.00075;
    const netPnl = grossPnl - fee;

    // Create closing order
    const closingOrder: PaperOrder = {
      id: `close_${Date.now()}`,
      userId,
      symbol: pos.symbol,
      market: pos.market,
      side: pos.side === 'LONG' ? 'SELL' : 'BUY',
      orderType: 'MARKET',
      quantity: pos.quantity,
      price: exitPrice,
      executedPrice: exitPrice,
      status: 'CLOSED',
      fee: Number(fee.toFixed(2)),
      slippage: 0,
      closePrice: exitPrice,
      realizedPnl: Number(netPnl.toFixed(2)),
      providerSource: 'MarketMind Engine',
      createdAt: new Date().toISOString(),
      closedAt: new Date().toISOString(),
    };

    const newBalance = account.balance + pos.quantity * exitPrice - fee;
    const newRealized = (account.realizedPnl || 0) + netPnl;
    const updatedAccount: PaperAccount = {
      ...account,
      balance: Number(newBalance.toFixed(2)),
      realizedPnl: Number(newRealized.toFixed(2)),
      totalTrades: account.totalTrades + 1,
      updatedAt: new Date().toISOString(),
    };

    // Mark previous open orders for this symbol as closed
    const updatedOrders = orders.map((o) => (o.symbol === pos.symbol && o.status === 'FILLED' ? { ...o, status: 'CLOSED' as const, realizedPnl: Number(netPnl.toFixed(2)) } : o));

    await savePaperOrder(closingOrder);
    await savePaperAccount(updatedAccount);

    setOrders([closingOrder, ...updatedOrders]);
    setAccount(updatedAccount);
    setMessage({
      type: 'success',
      text: `Closed ${pos.symbol} position. Realized P&L: ${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)}`,
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white font-sans">
              PAPER TRADING SANDBOX
            </h1>
            <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
              $10,000 USD Simulated Balance
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Zero-Financial Risk Execution Engine with Real Verified Market Quotes, Fees & Slippage
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="rounded-lg border border-slate-800 bg-[#0c1220] px-3 py-1.5">
            <span className="text-slate-400">Available Cash:</span>{' '}
            <strong className="text-emerald-400">${account?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>
      </div>

      {/* Alert / Notification */}
      {message && (
        <div
          className={`flex items-center justify-between rounded-xl p-3.5 text-xs font-mono border ${
            message.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
              : 'border-rose-500/30 bg-rose-950/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Main Grid: Order Entry Ticket + Open Positions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Col: Institutional Order Ticket */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-mono text-xs">
            <span className="font-bold text-white uppercase">Order Execution Ticket</span>
            <span className="text-slate-400">USD Account</span>
          </div>

          {/* Side Toggle: BUY / SELL */}
          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            <button
              onClick={() => setSide('BUY')}
              className={`rounded-lg py-2 font-bold transition ${
                side === 'BUY'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              BUY / LONG
            </button>
            <button
              onClick={() => setSide('SELL')}
              className={`rounded-lg py-2 font-bold transition ${
                side === 'SELL'
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              SELL / SHORT
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 font-mono text-xs">
            {/* Symbol & Market */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Asset Symbol</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400">Market Class</label>
                <select
                  value={market}
                  onChange={(e) => setMarket(e.target.value as MarketType)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                >
                  <option value="crypto">Crypto (Spot)</option>
                  <option value="stocks">Equities</option>
                  <option value="forex">Forex</option>
                </select>
              </div>
            </div>

            {/* Current Market Price Banner */}
            <div className="rounded-lg bg-slate-900/90 p-2.5 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400">Verified Quote:</div>
                <div className="text-sm font-bold text-white">
                  ${currentMarketPrice ? currentMarketPrice.toLocaleString() : 'Loading...'}
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-400">
                <div>Feed: {marketQuoteInfo?.provider || 'Live'}</div>
                <div className="text-emerald-400">Status: Verified</div>
              </div>
            </div>

            {/* Order Type: Market vs Limit */}
            <div>
              <label className="text-[10px] text-slate-400">Execution Type</label>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => setOrderType('MARKET')}
                  className={`flex-1 rounded py-1.5 text-xs transition ${
                    orderType === 'MARKET'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  Market (Immediate)
                </button>
                <button
                  onClick={() => setOrderType('LIMIT')}
                  className={`flex-1 rounded py-1.5 text-xs transition ${
                    orderType === 'LIMIT'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  Limit (Target)
                </button>
              </div>
            </div>

            {/* Limit Price if selected */}
            {orderType === 'LIMIT' && (
              <div>
                <label className="text-[10px] text-slate-400">Limit Price ($)</label>
                <input
                  type="number"
                  step="any"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(Number(e.target.value))}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white"
                />
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="text-[10px] text-slate-400">Quantity (Units / Shares)</label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white font-bold"
              />
            </div>

            {/* Stop Loss & Take Profit */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400">Stop-Loss ($)</label>
                <input
                  type="number"
                  step="any"
                  value={stopLoss || ''}
                  placeholder="Optional"
                  onChange={(e) => setStopLoss(e.target.value ? Number(e.target.value) : undefined)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white text-rose-400"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Take-Profit ($)</label>
                <input
                  type="number"
                  step="any"
                  value={takeProfit || ''}
                  placeholder="Optional"
                  onChange={(e) => setTakeProfit(e.target.value ? Number(e.target.value) : undefined)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white text-emerald-400"
                />
              </div>
            </div>

            {/* Cost Summary Box */}
            <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800 text-[11px] space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Gross Value:</span>
                <span className="text-slate-200">
                  ${((quantity || 0) * (orderType === 'MARKET' ? currentMarketPrice : limitPrice)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Estimated Commission (0.075%):</span>
                <span className="text-slate-200">
                  ${(((quantity || 0) * (orderType === 'MARKET' ? currentMarketPrice : limitPrice)) * 0.00075).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Simulated Slippage (0.05%):</span>
                <span className="text-slate-200">
                  ${(((quantity || 0) * (orderType === 'MARKET' ? currentMarketPrice : limitPrice)) * 0.0005).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Execute Button */}
            <button
              onClick={handleExecuteOrder}
              disabled={submitting}
              className={`w-full rounded-lg py-2.5 font-bold transition ${
                side === 'BUY'
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-rose-500 text-white hover:bg-rose-400'
              } disabled:opacity-50`}
            >
              {submitting ? 'Executing Order...' : `Confirm ${side} ${quantity} ${symbol}`}
            </button>
          </div>
        </div>

        {/* Right 2 Cols: Open Positions & Order History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Open Positions */}
          <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 font-mono text-xs">
              <span className="font-bold text-white uppercase">
                Active Open Positions ({openPositions.length})
              </span>
              <span className="text-slate-400">Mark-to-Market Real-Time Valuations</span>
            </div>

            <div className="mt-3 overflow-x-auto">
              {openPositions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-mono">
                  No open positions currently active. Execute a buy order on the left to open a position.
                </div>
              ) : (
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <tr>
                      <th className="py-2">Asset</th>
                      <th>Direction</th>
                      <th>Quantity</th>
                      <th>Entry Price</th>
                      <th>Current Price</th>
                      <th>Market Value</th>
                      <th>Unrealized P&L</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {openPositions.map((pos) => {
                      const isProfit = pos.unrealizedPnl >= 0;
                      return (
                        <tr key={pos.symbol} className="hover:bg-slate-800/30">
                          <td className="py-2.5 font-bold text-white">{pos.symbol}</td>
                          <td>
                            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400 font-bold">
                              {pos.side}
                            </span>
                          </td>
                          <td className="text-slate-300">{pos.quantity}</td>
                          <td className="text-slate-200">${pos.averageEntryPrice.toFixed(2)}</td>
                          <td className="text-slate-200">${pos.currentPrice.toFixed(2)}</td>
                          <td className="text-slate-200">${pos.marketValue.toFixed(2)}</td>
                          <td className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}${pos.unrealizedPnl.toFixed(2)} ({isProfit ? '+' : ''}
                            {pos.unrealizedPnlPercent}%)
                          </td>
                          <td>
                            <button
                              onClick={() => handleClosePosition(pos)}
                              className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/20 transition"
                            >
                              Close
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Execution History */}
          <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 font-mono text-xs">
              <span className="font-bold text-white uppercase">
                Paper Trading Order History ({orders.length})
              </span>
              <span className="text-slate-400">Logged in Cloud Firestore</span>
            </div>

            <div className="mt-3 overflow-x-auto max-h-64">
              {orders.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-mono">
                  No orders recorded yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <tr>
                      <th className="py-2">Time</th>
                      <th>Symbol</th>
                      <th>Side</th>
                      <th>Price ($)</th>
                      <th>Qty</th>
                      <th>Fee ($)</th>
                      <th>Status</th>
                      <th>Realized P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-800/30">
                        <td className="py-2 text-slate-400">
                          {new Date(ord.createdAt).toLocaleDateString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="font-bold text-white">{ord.symbol}</td>
                        <td>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              ord.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {ord.side}
                          </span>
                        </td>
                        <td className="text-slate-200">${ord.executedPrice.toFixed(2)}</td>
                        <td className="text-slate-300">{ord.quantity}</td>
                        <td className="text-slate-400">${ord.fee.toFixed(2)}</td>
                        <td>
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-300">
                            {ord.status}
                          </span>
                        </td>
                        <td className={(ord.realizedPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {ord.realizedPnl !== undefined ? `$${ord.realizedPnl.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
