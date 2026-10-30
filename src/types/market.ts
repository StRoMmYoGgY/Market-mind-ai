export type MarketType = 'stocks' | 'crypto' | 'forex' | 'commodities';

export type MarketDataType = 'live' | 'delayed' | 'historical' | 'end_of_day' | 'reference';

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed?: boolean;
}

export interface MarketQuote {
  symbol: string;
  name: string;
  marketType: MarketType;
  price: number;
  bid?: number;
  ask?: number;
  spread?: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change24h: number;
  change24hPercent: number;
  currency: string;
  provider: string;
  timestamp: number;
  dataType: MarketDataType;
  dataFreshness: 'realtime' | 'fresh' | 'delayed' | 'stale';
  isTradableInPaper: boolean;
  exchange?: string;
  note?: string;
}

export interface ProviderStatus {
  id: string;
  name: string;
  marketTypes: MarketType[];
  status: 'connected' | 'degraded' | 'unconfigured' | 'error';
  lastUpdate?: number;
  latencyMs?: number;
  isPreferred?: boolean;
  isBackup?: boolean;
  requestsUsed?: number;
  error?: string;
  authRequired: boolean;
  isFree: boolean;
  supportedIntervals: string[];
  description: string;
}

export interface TechnicalSnapshot {
  sma20?: number;
  sma50?: number;
  sma200?: number;
  ema9?: number;
  ema21?: number;
  ema55?: number;
  rsi14?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollingerBands?: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    percentB: number;
  };
  atr14?: number;
  vwap?: number;
  supportLevels: number[];
  resistanceLevels: number[];
  trend: 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';
  maCross: string;
  volatilityPercent: number;
  dataSufficiency: {
    candleCount: number;
    isSufficient: boolean;
    required: number;
  };
}

export interface AIResearchReport {
  asset: string;
  market: string;
  latestPrice: number;
  timestamp: string;
  trend: string;
  technicalInterpretation: string;
  bullishScenario: string;
  bearishScenario: string;
  supportResistance: {
    support: number;
    resistance: number;
  };
  potentialEntry: string;
  invalidation: string;
  riskConsiderations: string[];
  limitations: string;
  sources: string[];
  disclaimer: string;
}

export interface ScannerResult {
  symbol: string;
  name: string;
  market: MarketType;
  price: number;
  change24hPercent: number;
  volume: number;
  trend: string;
  rsi: number;
  macdStatus: 'Bullish' | 'Bearish' | 'Neutral';
  setupTitle: string;
  setupDescription: string;
  invalidationLevel: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  profile: 'day' | 'swing' | 'long_term';
  timestamp: number;
  provider: string;
}
