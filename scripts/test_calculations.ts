/**
 * Comprehensive Quantitative Calculation Verification Script
 * Validates deterministic technical indicators and risk math against known baselines
 */
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateVWAP,
  generateTechnicalSnapshot,
} from '../src/services/technicalAnalysis.ts';
import { calculateRisk, DEFAULT_RISK_LIMITS } from '../src/services/riskEngine.ts';
import { runBacktest, PRESET_STRATEGIES } from '../src/services/backtestEngine.ts';
import { Candle } from '../src/types/market.ts';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    testsPassed++;
    console.log(`[PASS] ${testName}`);
  } else {
    testsFailed++;
    console.error(`[FAIL] ${testName} - ${details || 'Assertion failed'}`);
  }
}

// ----------------------------------------------------
// 1. SMA Verification
// ----------------------------------------------------
const prices = [10, 20, 30, 40, 50];
const sma3 = calculateSMA(prices, 3);
assert(sma3[0] === null && sma3[1] === null, 'SMA warmup periods return null');
assert(sma3[2] === 20, 'SMA(3) of [10, 20, 30] is 20', `Got ${sma3[2]}`);
assert(sma3[3] === 30, 'SMA(3) of [20, 30, 40] is 30', `Got ${sma3[3]}`);
assert(sma3[4] === 40, 'SMA(3) of [30, 40, 50] is 40', `Got ${sma3[4]}`);

// ----------------------------------------------------
// 2. EMA Verification
// ----------------------------------------------------
const ema3 = calculateEMA(prices, 3);
// Period 3: multiplier = 2 / (3 + 1) = 0.5
// Initial EMA at index 2 = SMA(10, 20, 30) = 20
// Index 3 (price 40): (40 - 20) * 0.5 + 20 = 30
// Index 4 (price 50): (50 - 30) * 0.5 + 30 = 40
assert(ema3[2] === 20, 'Initial EMA(3) matches SMA seed = 20', `Got ${ema3[2]}`);
assert(ema3[3] === 30, 'EMA(3) next value = 30', `Got ${ema3[3]}`);
assert(ema3[4] === 40, 'EMA(3) next value = 40', `Got ${ema3[4]}`);

// ----------------------------------------------------
// 3. RSI Verification (Wilder's Smoothing)
// ----------------------------------------------------
// Test pure uptrend (all gains, zero loss -> RSI should be 100)
const uptrend = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
const rsiUp = calculateRSI(uptrend, 14);
assert(rsiUp[14] === 100, 'Pure uptrend RSI = 100', `Got ${rsiUp[14]}`);

// Test pure downtrend (all losses -> RSI should be 0)
const downtrend = [25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
const rsiDown = calculateRSI(downtrend, 14);
assert(rsiDown[14] === 0, 'Pure downtrend RSI = 0', `Got ${rsiDown[14]}`);

// ----------------------------------------------------
// 4. MACD Verification
// ----------------------------------------------------
const flatPrices = new Array(50).fill(100);
const flatMACD = calculateMACD(flatPrices, 12, 26, 9);
const lastHist = flatMACD.histogram[flatMACD.histogram.length - 1];
assert(lastHist !== null && Math.abs(lastHist) < 0.001, 'Flat line MACD histogram converges to 0.0', `Got ${lastHist}`);

// ----------------------------------------------------
// 5. Bollinger Bands Verification
// ----------------------------------------------------
const constantPrices = new Array(25).fill(100);
const bbFlat = calculateBollingerBands(constantPrices, 20, 2);
const lastUpper = bbFlat.upper[bbFlat.upper.length - 1];
const lastMiddle = bbFlat.middle[bbFlat.middle.length - 1];
const lastLower = bbFlat.lower[bbFlat.lower.length - 1];
assert(lastMiddle === 100, 'BB Middle band on $100 constant is 100', `Got ${lastMiddle}`);
assert(lastUpper === 100 && lastLower === 100, 'BB Upper and Lower bands collapse to Middle when stdDev is 0', `Got ${lastUpper}, ${lastLower}`);

// ----------------------------------------------------
// 6. ATR Verification
// ----------------------------------------------------
const mockCandles: Candle[] = [];
for (let i = 0; i < 30; i++) {
  // Constant high 105, low 95, close 100 -> TR = 10
  mockCandles.push({
    time: 1000 + i * 3600,
    open: 100,
    high: 105,
    low: 95,
    close: 100,
    volume: 1000,
  });
}
const atrRes = calculateATR(mockCandles, 14);
const lastATR = atrRes[atrRes.length - 1];
assert(lastATR === 10, 'ATR on constant range of 10 is 10.0', `Got ${lastATR}`);

// ----------------------------------------------------
// 7. VWAP Verification
// ----------------------------------------------------
// Candle 1: H=10, L=8, C=9 -> Typical=9, Vol=100 -> Cumulative = 900 / 100 = 9
// Candle 2: H=12, L=10, C=11 -> Typical=11, Vol=100 -> Cumulative = (900 + 1100) / 200 = 10
const vwapCandles: Candle[] = [
  { time: 1, open: 9, high: 10, low: 8, close: 9, volume: 100 },
  { time: 2, open: 11, high: 12, low: 10, close: 11, volume: 100 },
];
const vwap = calculateVWAP(vwapCandles);
assert(vwap[0] === 9, 'VWAP bar 1 = 9.0', `Got ${vwap[0]}`);
assert(vwap[1] === 10, 'VWAP bar 2 = 10.0', `Got ${vwap[1]}`);

// ----------------------------------------------------
// 8. Risk Engine Calculations Verification
// ----------------------------------------------------
// Balance = $10,000, Risk = 2% ($200), Entry = $100, Stop = $95 (Stop distance = $5)
// Position size = $200 / $5 = 40 units
// Total exposure = 40 * $100 = $4,000 (40% of capital)
// Take Profit = $115 (Reward distance = $15)
// Risk to Reward = 15 / 5 = 3:1
const riskInput = {
  accountBalance: 10000,
  riskPercentage: 2,
  entryPrice: 100,
  stopLossPrice: 95,
  takeProfitPrice: 115,
  side: 'BUY' as const,
};
const riskResult = calculateRisk(riskInput, DEFAULT_RISK_LIMITS);
assert(riskResult.monetaryRisk === 200, 'Risk Engine Monetary Risk = $200', `Got ${riskResult.monetaryRisk}`);
assert(riskResult.positionSize === 40, 'Risk Engine Position Size = 40 units', `Got ${riskResult.positionSize}`);
assert(riskResult.totalExposure === 4000, 'Risk Engine Gross Exposure = $4000', `Got ${riskResult.totalExposure}`);
assert(riskResult.riskToRewardRatio === 3, 'Risk Engine R:R = 3:1', `Got ${riskResult.riskToRewardRatio}`);
assert(!riskResult.isRiskExceeded, 'Risk compliant within 2% max limit', 'Flagged as exceeded');

// Test Risk Violation: Risk = 5% when limit is 2%
const excessRisk = calculateRisk({ ...riskInput, riskPercentage: 5 }, DEFAULT_RISK_LIMITS);
assert(excessRisk.isRiskExceeded, 'Flags risk limit violation when risk% > 2%');
assert(excessRisk.warnings.some((w) => w.includes('exceeds maximum risk limit')), 'Includes descriptive limit warning');

// ----------------------------------------------------
// 9. Backtest Engine Verification
// ----------------------------------------------------
// Generate 60 test candles with an oscillating wave
const testCandles: Candle[] = [];
let price = 100;
for (let i = 0; i < 60; i++) {
  const change = Math.sin(i * 0.5) * 4;
  const c = price + change;
  testCandles.push({
    time: 10000 + i * 3600,
    open: price,
    high: Math.max(price, c) + 1,
    low: Math.min(price, c) - 1,
    close: c,
    volume: 10000,
  });
  price = c;
}

const backtest = runBacktest(testCandles, PRESET_STRATEGIES[0]);
assert(backtest.equityCurve.length > 0, 'Backtest outputs equity curve');
assert(backtest.equityCurve[0].equity === 10000, 'Backtest begins at initial capital');
assert(typeof backtest.winRate === 'number', 'Backtest calculates win rate');
assert(typeof backtest.maxDrawdownPercent === 'number', 'Backtest calculates maximum drawdown');

console.log(`\n========================================`);
console.log(`CALCULATION AUDIT SUMMARY:`);
console.log(`Total Passed: ${testsPassed}`);
console.log(`Total Failed: ${testsFailed}`);
console.log(`========================================\n`);

if (testsFailed > 0) {
  process.exit(1);
}
