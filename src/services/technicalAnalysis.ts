import { Candle, TechnicalSnapshot } from '../types/market';

/**
 * Deterministic Technical Analysis Engine
 * Implements classical mathematical formulas for financial quantitative analysis
 */

// 1. Simple Moving Average (SMA)
export function calculateSMA(data: number[], period: number): (number | null)[] {
  if (data.length < period || period <= 0) {
    return data.map(() => null);
  }
  const result: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= period) {
      sum -= data[i - period];
    }
    if (i >= period - 1) {
      result.push(Number((sum / period).toFixed(4)));
    } else {
      result.push(null);
    }
  }
  return result;
}

// 2. Exponential Moving Average (EMA)
export function calculateEMA(data: number[], period: number): (number | null)[] {
  if (data.length < period || period <= 0) {
    return data.map(() => null);
  }
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);

  // Initialize first EMA with SMA of first period elements
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
    result.push(null);
  }
  let prevEma = sum / period;
  result[period - 1] = Number(prevEma.toFixed(4));

  for (let i = period; i < data.length; i++) {
    const currentEma = (data[i] - prevEma) * multiplier + prevEma;
    result.push(Number(currentEma.toFixed(4)));
    prevEma = currentEma;
  }
  return result;
}

// 3. Relative Strength Index (RSI - Wilder's Smoothing)
export function calculateRSI(closes: number[], period: number = 14): (number | null)[] {
  if (closes.length <= period) {
    return closes.map(() => null);
  }
  const rsiValues: (number | null)[] = [];
  let gains: number[] = [];
  let losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }

  // First avg gain/loss is simple mean of first `period` changes
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // First 'period' elements have no RSI
  for (let i = 0; i < period; i++) {
    rsiValues.push(null);
  }

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
  rsiValues.push(Number(rsi.toFixed(2)));

  // Wilder's smoothing for remaining
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    rsiValues.push(Number(rsi.toFixed(2)));
  }

  return rsiValues;
}

// 4. Moving Average Convergence Divergence (MACD)
export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
} {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine: (number | null)[] = [];
  const validMacdValues: number[] = [];
  const validMacdIndices: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      const val = Number((fastEMA[i]! - slowEMA[i]!).toFixed(4));
      macdLine.push(val);
      validMacdValues.push(val);
      validMacdIndices.push(i);
    } else {
      macdLine.push(null);
    }
  }

  const signalEMA = calculateEMA(validMacdValues, signalPeriod);
  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  const histogram: (number | null)[] = new Array(closes.length).fill(null);

  for (let j = 0; j < validMacdValues.length; j++) {
    const originalIndex = validMacdIndices[j];
    if (signalEMA[j] !== null) {
      signalLine[originalIndex] = signalEMA[j];
      histogram[originalIndex] = Number((macdLine[originalIndex]! - signalEMA[j]!).toFixed(4));
    }
  }

  return { macdLine, signalLine, histogram };
}

// 5. Bollinger Bands (20, 2)
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
  bandwidth: (number | null)[];
  percentB: (number | null)[];
} {
  const middle = calculateSMA(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const bandwidth: (number | null)[] = [];
  const percentB: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1 || middle[i] === null) {
      upper.push(null);
      lower.push(null);
      bandwidth.push(null);
      percentB.push(null);
      continue;
    }

    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i]!;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    const up = Number((mean + stdDevMultiplier * stdDev).toFixed(4));
    const low = Number((mean - stdDevMultiplier * stdDev).toFixed(4));
    const bw = mean > 0 ? Number((((up - low) / mean) * 100).toFixed(2)) : 0;
    const pB = up - low > 0 ? Number(((closes[i] - low) / (up - low)).toFixed(3)) : 0.5;

    upper.push(up);
    lower.push(low);
    bandwidth.push(bw);
    percentB.push(pB);
  }

  return { upper, middle, lower, bandwidth, percentB };
}

// 6. Average True Range (ATR)
export function calculateATR(candles: Candle[], period: number = 14): (number | null)[] {
  if (candles.length <= period) {
    return candles.map(() => null);
  }

  const trValues: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prevClose),
      Math.abs(current.low - prevClose)
    );
    trValues.push(tr);
  }

  // Initial ATR is simple average of first period TRs
  const atrValues: (number | null)[] = [];
  for (let i = 0; i < period; i++) {
    atrValues.push(null);
  }

  let prevATR = trValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
  atrValues.push(Number(prevATR.toFixed(4)));

  // Wilder's smoothing
  for (let i = period; i < trValues.length; i++) {
    const currentATR = (prevATR * (period - 1) + trValues[i]) / period;
    atrValues.push(Number(currentATR.toFixed(4)));
    prevATR = currentATR;
  }

  return atrValues;
}

// 7. Volume Weighted Average Price (VWAP)
export function calculateVWAP(candles: Candle[]): (number | null)[] {
  let cumulativeTypicalVolume = 0;
  let cumulativeVolume = 0;
  const vwapValues: (number | null)[] = [];

  for (const c of candles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = c.volume || 1;
    cumulativeTypicalVolume += typicalPrice * vol;
    cumulativeVolume += vol;

    if (cumulativeVolume > 0) {
      vwapValues.push(Number((cumulativeTypicalVolume / cumulativeVolume).toFixed(4)));
    } else {
      vwapValues.push(null);
    }
  }

  return vwapValues;
}

// 8. Support and Resistance Level Detection via Pivot Clusters
export function calculateSupportResistance(
  candles: Candle[],
  window: number = 5
): { supportLevels: number[]; resistanceLevels: number[] } {
  if (candles.length < window * 2 + 1) {
    const last = candles[candles.length - 1];
    return {
      supportLevels: last ? [Number((last.close * 0.98).toFixed(2))] : [],
      resistanceLevels: last ? [Number((last.close * 1.02).toFixed(2))] : [],
    };
  }

  const pivotHighs: number[] = [];
  const pivotLows: number[] = [];

  for (let i = window; i < candles.length - window; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;

    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= window; j++) {
      if (candles[i - j].high >= currentHigh || candles[i + j].high >= currentHigh) {
        isHigh = false;
      }
      if (candles[i - j].low <= currentLow || candles[i + j].low <= currentLow) {
        isLow = false;
      }
    }

    if (isHigh) pivotHighs.push(currentHigh);
    if (isLow) pivotLows.push(currentLow);
  }

  const currentPrice = candles[candles.length - 1].close;

  // Cluster nearby levels (within 1.5% threshold)
  function clusterLevels(levels: number[], isSupport: boolean): number[] {
    const filtered = isSupport
      ? levels.filter((lvl) => lvl <= currentPrice)
      : levels.filter((lvl) => lvl >= currentPrice);
    
    filtered.sort((a, b) => (isSupport ? b - a : a - b));

    const clusters: number[] = [];
    for (const lvl of filtered) {
      const exists = clusters.some((c) => Math.abs(c - lvl) / c < 0.015);
      if (!exists) {
        clusters.push(Number(lvl.toFixed(2)));
      }
      if (clusters.length >= 3) break;
    }
    return clusters;
  }

  let support = clusterLevels(pivotLows, true);
  let resistance = clusterLevels(pivotHighs, false);

  if (support.length === 0) support = [Number((currentPrice * 0.975).toFixed(2))];
  if (resistance.length === 0) resistance = [Number((currentPrice * 1.025).toFixed(2))];

  return { supportLevels: support, resistanceLevels: resistance };
}

// 9. Trend Identification & Comprehensive Technical Snapshot
export function generateTechnicalSnapshot(candles: Candle[]): TechnicalSnapshot {
  const count = candles.length;
  const isSufficient = count >= 30;

  if (count === 0) {
    return {
      supportLevels: [],
      resistanceLevels: [],
      trend: 'Neutral',
      maCross: 'None',
      volatilityPercent: 0,
      dataSufficiency: { candleCount: 0, isSufficient: false, required: 30 },
    };
  }

  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];

  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);

  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema55 = calculateEMA(closes, 55);

  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes, 12, 26, 9);
  const bb = calculateBollingerBands(closes, 20, 2);
  const atr = calculateATR(candles, 14);
  const vwap = calculateVWAP(candles);

  const { supportLevels, resistanceLevels } = calculateSupportResistance(candles);

  const lastSMA20 = sma20[sma20.length - 1] ?? undefined;
  const lastSMA50 = sma50[sma50.length - 1] ?? undefined;
  const lastSMA200 = sma200[sma200.length - 1] ?? undefined;

  const lastEMA9 = ema9[ema9.length - 1] ?? undefined;
  const lastEMA21 = ema21[ema21.length - 1] ?? undefined;
  const lastEMA55 = ema55[ema55.length - 1] ?? undefined;

  const lastRSI = rsi[rsi.length - 1] ?? undefined;
  const lastATR = atr[atr.length - 1] ?? undefined;
  const lastVWAP = vwap[vwap.length - 1] ?? undefined;

  const lastMACDVal = macd.macdLine[macd.macdLine.length - 1] ?? 0;
  const lastSignalVal = macd.signalLine[macd.signalLine.length - 1] ?? 0;
  const lastHistVal = macd.histogram[macd.histogram.length - 1] ?? 0;

  const lastBBUpper = bb.upper[bb.upper.length - 1] ?? undefined;
  const lastBBMiddle = bb.middle[bb.middle.length - 1] ?? undefined;
  const lastBBLower = bb.lower[bb.lower.length - 1] ?? undefined;
  const lastBBBandwidth = bb.bandwidth[bb.bandwidth.length - 1] ?? 0;
  const lastBBPercentB = bb.percentB[bb.percentB.length - 1] ?? 0.5;

  // Trend detection logic
  let trendScore = 0;
  if (lastEMA9 && lastEMA21) {
    if (lastEMA9 > lastEMA21) trendScore += 2;
    else trendScore -= 2;
  }
  if (lastSMA50 && currentPrice > lastSMA50) trendScore += 1;
  else if (lastSMA50) trendScore -= 1;

  if (lastSMA200 && currentPrice > lastSMA200) trendScore += 2;
  else if (lastSMA200) trendScore -= 2;

  if (lastRSI) {
    if (lastRSI > 55) trendScore += 1;
    else if (lastRSI < 45) trendScore -= 1;
  }

  let trend: TechnicalSnapshot['trend'] = 'Neutral';
  if (trendScore >= 4) trend = 'Strong Bullish';
  else if (trendScore >= 2) trend = 'Bullish';
  else if (trendScore <= -4) trend = 'Strong Bearish';
  else if (trendScore <= -2) trend = 'Bearish';

  // MA Cross
  let maCross = 'Neutral alignment';
  if (lastEMA9 && lastEMA21) {
    const prevEMA9 = ema9[ema9.length - 2] ?? lastEMA9;
    const prevEMA21 = ema21[ema21.length - 2] ?? lastEMA21;
    if (prevEMA9 <= prevEMA21 && lastEMA9 > lastEMA21) {
      maCross = 'EMA 9/21 Bullish Cross';
    } else if (prevEMA9 >= prevEMA21 && lastEMA9 < lastEMA21) {
      maCross = 'EMA 9/21 Bearish Death Cross';
    } else if (lastEMA9 > lastEMA21) {
      maCross = 'Bullish EMA Stack (9 > 21)';
    } else {
      maCross = 'Bearish EMA Stack (9 < 21)';
    }
  }

  const volatilityPercent = lastATR && currentPrice > 0 ? Number(((lastATR / currentPrice) * 100).toFixed(2)) : 1.5;

  return {
    sma20: lastSMA20,
    sma50: lastSMA50,
    sma200: lastSMA200,
    ema9: lastEMA9,
    ema21: lastEMA21,
    ema55: lastEMA55,
    rsi14: lastRSI,
    macd: {
      macd: Number(lastMACDVal.toFixed(4)),
      signal: Number(lastSignalVal.toFixed(4)),
      histogram: Number(lastHistVal.toFixed(4)),
    },
    bollingerBands:
      lastBBUpper && lastBBMiddle && lastBBLower
        ? {
            upper: lastBBUpper,
            middle: lastBBMiddle,
            lower: lastBBLower,
            bandwidth: lastBBBandwidth,
            percentB: lastBBPercentB,
          }
        : undefined,
    atr14: lastATR,
    vwap: lastVWAP,
    supportLevels,
    resistanceLevels,
    trend,
    maCross,
    volatilityPercent,
    dataSufficiency: {
      candleCount: count,
      isSufficient,
      required: 30,
    },
  };
}
