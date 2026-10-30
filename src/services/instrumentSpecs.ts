import { InstrumentSpecification, OrderSide } from '../types/trading';

/**
 * Institutional MT5 Instrument Specifications
 * Configures exact contract sizes, tick values, spreads, and margins per financial market
 */

export const INSTRUMENT_SPECIFICATIONS: Record<string, InstrumentSpecification> = {
  // Commodities
  XAUUSD: {
    symbol: 'XAUUSD',
    name: 'Gold / US Dollar (Spot)',
    market: 'commodities',
    contractSize: 100, // 1 Standard Lot = 100 Troy Ounces
    digits: 2,
    minLot: 0.01,
    maxLot: 100.0,
    lotStep: 0.01,
    tickSize: 0.01,
    tickValue: 1.0, // 100 oz * $0.01 = $1.00 per tick for 1.0 lot
    defaultSpreadPoints: 25, // $0.25 spread
    commissionPerLot: 6.0, // $6 round turn per lot
    quoteCurrency: 'USD',
  },
  XAGUSD: {
    symbol: 'XAGUSD',
    name: 'Silver / US Dollar (Spot)',
    market: 'commodities',
    contractSize: 5000, // 1 Standard Lot = 5,000 Troy Ounces
    digits: 3,
    minLot: 0.01,
    maxLot: 50.0,
    lotStep: 0.01,
    tickSize: 0.001,
    tickValue: 5.0, // 5,000 oz * $0.001 = $5.00 per tick for 1.0 lot
    defaultSpreadPoints: 30,
    commissionPerLot: 6.0,
    quoteCurrency: 'USD',
  },

  // Forex Majors (Standard Lot = 100,000 units of base currency)
  'EUR/USD': {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    market: 'forex',
    contractSize: 100000,
    digits: 5,
    minLot: 0.01,
    maxLot: 100.0,
    lotStep: 0.01,
    tickSize: 0.00001,
    tickValue: 1.0, // $1 per pipette, $10 per pip on 1.0 lot
    defaultSpreadPoints: 12, // 1.2 pips
    commissionPerLot: 6.0,
    quoteCurrency: 'USD',
  },
  'GBP/USD': {
    symbol: 'GBP/USD',
    name: 'British Pound / US Dollar',
    market: 'forex',
    contractSize: 100000,
    digits: 5,
    minLot: 0.01,
    maxLot: 100.0,
    lotStep: 0.01,
    tickSize: 0.00001,
    tickValue: 1.0,
    defaultSpreadPoints: 15, // 1.5 pips
    commissionPerLot: 6.0,
    quoteCurrency: 'USD',
  },
  'USD/JPY': {
    symbol: 'USD/JPY',
    name: 'US Dollar / Japanese Yen',
    market: 'forex',
    contractSize: 100000,
    digits: 3,
    minLot: 0.01,
    maxLot: 100.0,
    lotStep: 0.01,
    tickSize: 0.001,
    tickValue: 0.65,
    defaultSpreadPoints: 12,
    commissionPerLot: 6.0,
    quoteCurrency: 'JPY',
  },
  'AUD/USD': {
    symbol: 'AUD/USD',
    name: 'Australian Dollar / US Dollar',
    market: 'forex',
    contractSize: 100000,
    digits: 5,
    minLot: 0.01,
    maxLot: 100.0,
    lotStep: 0.01,
    tickSize: 0.00001,
    tickValue: 1.0,
    defaultSpreadPoints: 14,
    commissionPerLot: 6.0,
    quoteCurrency: 'USD',
  },

  // Crypto (Contract size = 1 Coin)
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin / Tether (Spot)',
    market: 'crypto',
    contractSize: 1,
    digits: 2,
    minLot: 0.01,
    maxLot: 50.0,
    lotStep: 0.01,
    tickSize: 0.01,
    tickValue: 0.01,
    defaultSpreadPoints: 50, // $0.50
    commissionPerLot: 10.0,
    quoteCurrency: 'USDT',
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum / Tether (Spot)',
    market: 'crypto',
    contractSize: 1,
    digits: 2,
    minLot: 0.01,
    maxLot: 200.0,
    lotStep: 0.01,
    tickSize: 0.01,
    tickValue: 0.01,
    defaultSpreadPoints: 15,
    commissionPerLot: 5.0,
    quoteCurrency: 'USDT',
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana / Tether (Spot)',
    market: 'crypto',
    contractSize: 1,
    digits: 2,
    minLot: 0.1,
    maxLot: 1000.0,
    lotStep: 0.1,
    tickSize: 0.01,
    tickValue: 0.01,
    defaultSpreadPoints: 10,
    commissionPerLot: 2.0,
    quoteCurrency: 'USDT',
  },

  // Equities (1 Lot = 1 Share for US Stocks)
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    market: 'stocks',
    contractSize: 1,
    digits: 2,
    minLot: 1,
    maxLot: 5000,
    lotStep: 1,
    tickSize: 0.01,
    tickValue: 0.01,
    defaultSpreadPoints: 5,
    commissionPerLot: 0.01,
    quoteCurrency: 'USD',
  },
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    market: 'stocks',
    contractSize: 1,
    digits: 2,
    minLot: 1,
    maxLot: 5000,
    lotStep: 1,
    tickSize: 0.01,
    tickValue: 0.01,
    defaultSpreadPoints: 5,
    commissionPerLot: 0.01,
    quoteCurrency: 'USD',
  },
  SPY: {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    market: 'stocks',
    contractSize: 1,
    digits: 2,
    minLot: 1,
    maxLot: 5000,
    lotStep: 1,
    tickSize: 0.01,
    tickValue: 0.01,
    defaultSpreadPoints: 3,
    commissionPerLot: 0.01,
    quoteCurrency: 'USD',
  },
};

/**
 * Retrieve instrument specification by symbol or fallback to generic
 */
export function getInstrumentSpec(symbol: string): InstrumentSpecification {
  const clean = symbol.toUpperCase().replace('/', '');
  if (INSTRUMENT_SPECIFICATIONS[clean]) {
    return INSTRUMENT_SPECIFICATIONS[clean];
  }
  if (INSTRUMENT_SPECIFICATIONS[symbol]) {
    return INSTRUMENT_SPECIFICATIONS[symbol];
  }

  // Fallbacks by pattern
  if (clean.includes('XAU') || clean.includes('GOLD')) {
    return INSTRUMENT_SPECIFICATIONS.XAUUSD;
  }
  if (clean.includes('XAG') || clean.includes('SILVER')) {
    return INSTRUMENT_SPECIFICATIONS.XAGUSD;
  }
  if (clean.includes('BTC')) return INSTRUMENT_SPECIFICATIONS.BTC;
  if (clean.includes('ETH')) return INSTRUMENT_SPECIFICATIONS.ETH;
  if (clean.includes('EUR') || clean.includes('GBP') || clean.includes('JPY') || clean.includes('USD')) {
    return INSTRUMENT_SPECIFICATIONS['EUR/USD'];
  }

  // Generic Stock
  return {
    symbol: symbol.toUpperCase(),
    name: `${symbol.toUpperCase()} Asset`,
    market: 'stocks',
    contractSize: 1,
    digits: 2,
    minLot: 1,
    maxLot: 10000,
    lotStep: 1,
    tickSize: 0.01,
    tickValue: 0.01,
    defaultSpreadPoints: 5,
    commissionPerLot: 0.02,
    quoteCurrency: 'USD',
  };
}

/**
 * Calculate Required Margin in USD for an order
 * Formula: (Lots * Contract Size * Price) / Leverage
 */
export function calculateRequiredMargin(
  spec: InstrumentSpecification,
  lots: number,
  price: number,
  leverage: number = 100
): number {
  if (lots <= 0 || price <= 0 || leverage <= 0) return 0;
  const notionalValue = lots * spec.contractSize * price;
  return Number((notionalValue / leverage).toFixed(2));
}

/**
 * Calculate Floating or Realized Profit/Loss
 * Formula:
 * For LONG: (Current Price - Entry Price) * Lots * Contract Size
 * For SHORT: (Entry Price - Current Price) * Lots * Contract Size
 */
export function calculatePositionPnl(
  spec: InstrumentSpecification,
  side: OrderSide | 'LONG' | 'SHORT',
  entryPrice: number,
  currentPrice: number,
  lots: number
): { grossPnl: number; netPnl: number; pnlPercent: number } {
  if (lots <= 0 || entryPrice <= 0 || currentPrice <= 0) {
    return { grossPnl: 0, netPnl: 0, pnlPercent: 0 };
  }

  const isBuy = side === 'BUY' || side === 'LONG';
  const priceDiff = isBuy ? currentPrice - entryPrice : entryPrice - currentPrice;
  const grossPnl = priceDiff * lots * spec.contractSize;

  // Deduct standard round-turn commission
  const commission = spec.commissionPerLot * lots;
  const netPnl = grossPnl - commission;

  const costBasis = entryPrice * lots * spec.contractSize;
  const pnlPercent = costBasis > 0 ? (grossPnl / costBasis) * 100 : 0;

  return {
    grossPnl: Number(grossPnl.toFixed(2)),
    netPnl: Number(netPnl.toFixed(2)),
    pnlPercent: Number(pnlPercent.toFixed(2)),
  };
}

/**
 * Calculate spread cost in USD
 */
export function calculateSpreadCost(
  spec: InstrumentSpecification,
  lots: number
): number {
  const spreadInPrice = spec.defaultSpreadPoints * Math.pow(10, -spec.digits);
  return Number((spreadInPrice * lots * spec.contractSize).toFixed(2));
}
