import { MarketType } from './market';

export interface PaperAccount {
  userId: string;
  balance: number;
  initialBalance: number;
  currency: string;
  equity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalReturnPercent: number;
  winRate: number;
  totalTrades: number;
  updatedAt: string;
}

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';
export type OrderStatus = 'OPEN' | 'FILLED' | 'CANCELLED' | 'CLOSED';

export interface PaperOrder {
  id: string;
  userId: string;
  symbol: string;
  name?: string;
  market: MarketType;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price: number;
  executedPrice: number;
  status: OrderStatus;
  stopLoss?: number;
  takeProfit?: number;
  fee: number;
  slippage: number;
  realizedPnl?: number;
  closePrice?: number;
  providerSource: string;
  createdAt: string;
  filledAt?: string;
  closedAt?: string;
  notes?: string;
}

export interface PaperPosition {
  symbol: string;
  name?: string;
  market: MarketType;
  side: 'LONG' | 'SHORT';
  quantity: number;
  averageEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  stopLoss?: number;
  takeProfit?: number;
  openOrdersCount: number;
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
