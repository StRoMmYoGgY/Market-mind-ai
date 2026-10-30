import { MarketType } from './market';

export interface PaperAccount {
  userId: string;
  balance: number;
  initialBalance: number;
  currency: string;
  equity: number;
  margin?: number;       // Used Margin
  freeMargin?: number;   // Free Margin
  marginLevel?: number;  // (Equity / Margin) * 100
  leverage?: number;     // e.g. 100 for 1:100
  realizedPnl: number;
  unrealizedPnl: number;
  totalReturnPercent: number;
  winRate: number;
  totalTrades: number;
  updatedAt: string;
}

export type OrderSide = 'BUY' | 'SELL';
export type OrderType =
  | 'MARKET'
  | 'LIMIT'
  | 'BUY_LIMIT'
  | 'SELL_LIMIT'
  | 'BUY_STOP'
  | 'SELL_STOP'
  | 'BUY_STOP_LIMIT'
  | 'SELL_STOP_LIMIT';

export type OrderStatus = 'OPEN' | 'PENDING' | 'FILLED' | 'CANCELLED' | 'CLOSED';

export interface InstrumentSpecification {
  symbol: string;
  name: string;
  market: MarketType;
  contractSize: number;       // e.g. 100 for XAUUSD, 100,000 for Forex, 1 for Stocks
  digits: number;             // decimal places (e.g. 2 for Gold, 5 for Forex)
  minLot: number;
  maxLot: number;
  lotStep: number;
  tickSize: number;
  tickValue: number;          // USD value per 1 lot move of 1 tick
  defaultSpreadPoints: number;
  commissionPerLot: number;   // e.g. $7.00 round turn
  quoteCurrency: string;
}

export interface PaperOrder {
  id: string;
  ticket?: number;
  userId: string;
  symbol: string;
  name?: string;
  market: MarketType;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;           // Volume / Lots
  price: number;              // Target / Limit / Stop price
  executedPrice: number;
  status: OrderStatus;
  stopLoss?: number;
  takeProfit?: number;
  fee: number;
  slippage: number;
  margin?: number;
  realizedPnl?: number;
  closePrice?: number;
  providerSource: string;
  createdAt: string;
  filledAt?: string;
  closedAt?: string;
  notes?: string;
}

export interface PaperPosition {
  ticket?: number;
  symbol: string;
  name?: string;
  market: MarketType;
  side: 'LONG' | 'SHORT';
  quantity: number;           // Volume in lots
  averageEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  margin?: number;             // Allocated margin
  commission?: number;
  swap?: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  stopLoss?: number;
  takeProfit?: number;
  openOrdersCount: number;
  openTime?: string;
  lastUpdated: string;
}

export interface TradingJournalEntry {
  id: string;
  userId: string;
  symbol: string;
  market: MarketType;
  approach: 'Day Trading' | 'Swing Trading' | 'Long-term';
  strategy: string;
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  plannedRisk: number;
  actualResult?: number;
  tradeRationale: string;
  behavioralNotes: string;
  mistakes: string;
  lessonsLearned: string;
  createdAt: string;
  aiReview?: string;
}

export interface StrategyConfig {
  id: string;
  name: string;
  type: 'ema_cross' | 'sma_cross' | 'rsi_reversion' | 'macd_breakout' | 'bollinger_squeeze' | 'trend_following';
  description: string;
  symbol: string;
  market: MarketType;
  timeframe: string;
  startingCapital: number;
  positionSizePercent: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  feePercent: number;
  slippagePercent: number;
  params: Record<string, number>;
}

export interface BacktestTrade {
  entryTime: number;
  exitTime: number;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  reason: 'take_profit' | 'stop_loss' | 'signal_exit' | 'end_of_period';
  fee: number;
}

export interface BacktestResult {
  strategyName: string;
  symbol: string;
  timeframe: string;
  periodCandles: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  netProfit: number;
  netReturnPercent: number;
  maxDrawdownPercent: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  riskRewardRatio: number;
  equityCurve: Array<{ time: number; equity: number; price: number }>;
  trades: BacktestTrade[];
}

export interface RiskLimits {
  maxRiskPerTradePercent: number; // e.g. 2%
  maxDailyLossAmount: number;     // e.g. $500
  maxDrawdownPercent: number;     // e.g. 10%
  maxPortfolioExposurePercent: number; // e.g. 80%
  maxAssetConcentrationPercent: number; // e.g. 25%
}

export interface RiskCalculationInput {
  accountBalance: number;
  riskPercentage: number;
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice?: number;
  side: OrderSide;
  feePercent?: number;
  slippagePercent?: number;
}

export interface RiskCalculationResult {
  monetaryRisk: number;
  positionSize: number;
  totalExposure: number;
  exposurePercent: number;
  potentialProfit: number;
  potentialLoss: number;
  riskToRewardRatio: number;
  estimatedFee: number;
  estimatedSlippage: number;
  isRiskExceeded: boolean;
  warnings: string[];
}
