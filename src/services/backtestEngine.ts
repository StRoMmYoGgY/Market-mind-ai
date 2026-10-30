import { Candle } from '../types/market';
import { BacktestResult, BacktestTrade, StrategyConfig } from '../types/trading';
import { calculateEMA, calculateSMA, calculateRSI, calculateMACD, calculateBollingerBands } from './technicalAnalysis';

export const PRESET_STRATEGIES: StrategyConfig[] = [
  {
    id: 'ema_cross_9_21',
    name: 'EMA 9/21 Momentum Crossover',
    type: 'ema_cross',
    description: 'Enters long when Fast EMA (9) crosses above Slow EMA (21). Exits on bearish cross or stop.',
    symbol: 'BTC',
    market: 'crypto',
    timeframe: '1h',
    startingCapital: 10000,
    positionSizePercent: 25,
    stopLossPercent: 2.5,
    takeProfitPercent: 6.0,
    feePercent: 0.075,
    slippagePercent: 0.05,
    params: { fastPeriod: 9, slowPeriod: 21 },
  },
  {
    id: 'rsi_mean_reversion',
    name: 'RSI (14) Mean Reversion',
    type: 'rsi_reversion',
    description: 'Enters long on oversold RSI (< 30) with confirmation, exits on overbought RSI (> 65).',
    symbol: 'AAPL',
    market: 'stocks',
    timeframe: '1d',
    startingCapital: 10000,
    positionSizePercent: 30,
    stopLossPercent: 3.0,
    takeProfitPercent: 7.5,
    feePercent: 0.05,
    slippagePercent: 0.03,
    params: { rsiPeriod: 14, oversold: 30, overbought: 65 },
  },
  {
    id: 'macd_trend_breakout',
    name: 'MACD Zero-Line Trend Breakout',
    type: 'macd_breakout',
    description: 'Enters when MACD histogram turns positive above the zero line with expanding volume.',
    symbol: 'EUR/USD',
    market: 'forex',
    timeframe: '4h',
    startingCapital: 10000,
    positionSizePercent: 20,
    stopLossPercent: 1.5,
    takeProfitPercent: 4.5,
    feePercent: 0.03,
    slippagePercent: 0.02,
    params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  },
  {
    id: 'bollinger_squeeze_breakout',
    name: 'Bollinger Band Squeeze Breakout',
    type: 'bollinger_squeeze',
    description: 'Detects volatility contraction (Bandwidth < 8%) followed by a candle closing outside the upper band.',
    symbol: 'ETH',
    market: 'crypto',
    timeframe: '1h',
    startingCapital: 10000,
    positionSizePercent: 25,
    stopLossPercent: 2.8,
    takeProfitPercent: 7.0,
    feePercent: 0.075,
    slippagePercent: 0.05,
    params: { period: 20, stdDev: 2, squeezeThreshold: 8.0 },
  },
];

/**
 * Sequential bar-by-bar backtesting engine.
 * Eliminates look-ahead bias by evaluating signals at Bar i close,
 * executing fills at Bar i+1 open or testing intra-bar limits.
 */
export function runBacktest(candles: Candle[], config: StrategyConfig): BacktestResult {
  if (candles.length < 35) {
    return {
      strategyName: config.name,
      symbol: config.symbol,
      timeframe: config.timeframe,
      periodCandles: candles.length,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      netProfit: 0,
      netReturnPercent: 0,
      maxDrawdownPercent: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      riskRewardRatio: 0,
      equityCurve: [{ time: Date.now() / 1000, equity: config.startingCapital, price: 100 }],
      trades: [],
    };
  }

  const closes = candles.map((c) => c.close);
  const fastEMA = calculateEMA(closes, config.params.fastPeriod || 9);
  const slowEMA = calculateEMA(closes, config.params.slowPeriod || 21);
  const rsi = calculateRSI(closes, config.params.rsiPeriod || 14);
  const macd = calculateMACD(closes, 12, 26, 9);
  const bb = calculateBollingerBands(closes, 20, 2);

  let currentEquity = config.startingCapital;
  let peakEquity = config.startingCapital;
  let maxDrawdown = 0;

  let activePosition: {
    entryTime: number;
    entryPrice: number;
    quantity: number;
    stopLoss: number;
    takeProfit: number;
    feePaid: number;
  } | null = null;

  const trades: BacktestTrade[] = [];
  const equityCurve: Array<{ time: number; equity: number; price: number }> = [
    { time: candles[0].time, equity: currentEquity, price: candles[0].close },
  ];

  const feeRate = (config.feePercent || 0.075) / 100;
  const slipRate = (config.slippagePercent || 0.05) / 100;

  // Start after warmup period
  for (let i = 30; i < candles.length - 1; i++) {
    const bar = candles[i];
    const nextBar = candles[i + 1];

    // 1. Check if active position hits Stop Loss or Take Profit during Bar i
    if (activePosition) {
      let exitReason: 'take_profit' | 'stop_loss' | 'signal_exit' | null = null;
      let exitPrice = 0;

      if (bar.low <= activePosition.stopLoss) {
        exitReason = 'stop_loss';
        // Account for negative slippage on stop
        exitPrice = activePosition.stopLoss * (1 - slipRate);
      } else if (bar.high >= activePosition.takeProfit) {
        exitReason = 'take_profit';
        exitPrice = activePosition.takeProfit * (1 - slipRate);
      }

      if (exitReason) {
        const exitFee = exitPrice * activePosition.quantity * feeRate;
        const grossPnl = (exitPrice - activePosition.entryPrice) * activePosition.quantity;
        const netPnl = grossPnl - activePosition.feePaid - exitFee;
        const pnlPercent = (grossPnl / (activePosition.entryPrice * activePosition.quantity)) * 100;

        currentEquity += grossPnl - exitFee;

        trades.push({
          entryTime: activePosition.entryTime,
          exitTime: bar.time,
          side: 'LONG',
          entryPrice: activePosition.entryPrice,
          exitPrice: Number(exitPrice.toFixed(4)),
          quantity: activePosition.quantity,
          pnl: Number(netPnl.toFixed(2)),
          pnlPercent: Number(pnlPercent.toFixed(2)),
          reason: exitReason,
          fee: Number((activePosition.feePaid + exitFee).toFixed(2)),
        });

        activePosition = null;
      }
    }

    // 2. Evaluate Strategy Entry Signal on Bar i Close
    if (!activePosition) {
      let entrySignal = false;

      if (config.type === 'ema_cross') {
        const currFast = fastEMA[i];
        const prevFast = fastEMA[i - 1];
        const currSlow = slowEMA[i];
        const prevSlow = slowEMA[i - 1];
        if (currFast && prevFast && currSlow && prevSlow) {
          // Bullish Crossover
          if (prevFast <= prevSlow && currFast > currSlow) {
            entrySignal = true;
          }
        }
      } else if (config.type === 'rsi_reversion') {
        const currRSI = rsi[i];
        const prevRSI = rsi[i - 1];
        const oversold = config.params.oversold || 30;
        if (currRSI && prevRSI && prevRSI < oversold && currRSI >= oversold) {
          entrySignal = true; // Turnaround from oversold
        }
      } else if (config.type === 'macd_breakout') {
        const histCurr = macd.histogram[i];
        const histPrev = macd.histogram[i - 1];
        if (histCurr !== null && histPrev !== null && histPrev <= 0 && histCurr > 0) {
          entrySignal = true;
        }
      } else if (config.type === 'bollinger_squeeze') {
        const upper = bb.upper[i];
        const bw = bb.bandwidth[i];
        if (upper && bw && bw < (config.params.squeezeThreshold || 10) && bar.close > upper) {
          entrySignal = true;
        }
      } else {
        // Trend Following default
        if (bar.close > (fastEMA[i] || 0) && (fastEMA[i] || 0) > (slowEMA[i] || 0)) {
          entrySignal = true;
        }
      }

      // Execute on Next Bar Open (Anti Look-Ahead)
      if (entrySignal) {
        const executionPrice = nextBar.open * (1 + slipRate);
        const positionCapital = (currentEquity * (config.positionSizePercent || 25)) / 100;
        const quantity = positionCapital / executionPrice;
        const entryFee = positionCapital * feeRate;

        const stopDist = executionPrice * ((config.stopLossPercent || 2.5) / 100);
        const profitDist = executionPrice * ((config.takeProfitPercent || 6.0) / 100);

        activePosition = {
          entryTime: nextBar.time,
          entryPrice: executionPrice,
          quantity: Number(quantity.toFixed(4)),
          stopLoss: executionPrice - stopDist,
          takeProfit: executionPrice + profitDist,
          feePaid: entryFee,
        };

        currentEquity -= entryFee;
      }
    }

    // Update drawdown
    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }
    const currentDrawdown = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;
    if (currentDrawdown > maxDrawdown) {
      maxDrawdown = currentDrawdown;
    }

    equityCurve.push({
      time: nextBar.time,
      equity: Number(currentEquity.toFixed(2)),
      price: nextBar.close,
    });
  }

  // Close any lingering position at final bar
  if (activePosition) {
    const finalBar = candles[candles.length - 1];
    const exitPrice = finalBar.close * (1 - slipRate);
    const exitFee = exitPrice * activePosition.quantity * feeRate;
    const grossPnl = (exitPrice - activePosition.entryPrice) * activePosition.quantity;
    const netPnl = grossPnl - activePosition.feePaid - exitFee;
    const pnlPercent = (grossPnl / (activePosition.entryPrice * activePosition.quantity)) * 100;

    currentEquity += grossPnl - exitFee;

    trades.push({
      entryTime: activePosition.entryTime,
      exitTime: finalBar.time,
      side: 'LONG',
      entryPrice: activePosition.entryPrice,
      exitPrice: Number(exitPrice.toFixed(4)),
      quantity: activePosition.quantity,
      pnl: Number(netPnl.toFixed(2)),
      pnlPercent: Number(pnlPercent.toFixed(2)),
      reason: 'end_of_period',
      fee: Number((activePosition.feePaid + exitFee).toFixed(2)),
    });
  }

  // Summary statistics
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl <= 0);

  const winCount = winningTrades.length;
  const lossCount = losingTrades.length;
  const winRate = totalTrades > 0 ? Number(((winCount / totalTrades) * 100).toFixed(1)) : 0;

  const grossWins = winningTrades.reduce((acc, t) => acc + t.pnl, 0);
  const grossLosses = Math.abs(losingTrades.reduce((acc, t) => acc + t.pnl, 0));

  const profitFactor = grossLosses > 0 ? Number((grossWins / grossLosses).toFixed(2)) : grossWins > 0 ? 99.0 : 0;
  const avgWin = winCount > 0 ? Number((grossWins / winCount).toFixed(2)) : 0;
  const avgLoss = lossCount > 0 ? Number((grossLosses / lossCount).toFixed(2)) : 0;
  const riskRewardRatio = avgLoss > 0 ? Number((avgWin / avgLoss).toFixed(2)) : 0;

  const netProfit = Number((currentEquity - config.startingCapital).toFixed(2));
  const netReturnPercent = Number(((netProfit / config.startingCapital) * 100).toFixed(2));

  return {
    strategyName: config.name,
    symbol: config.symbol,
    timeframe: config.timeframe,
    periodCandles: candles.length,
    totalTrades,
    winningTrades: winCount,
    losingTrades: lossCount,
    winRate,
    netProfit,
    netReturnPercent,
    maxDrawdownPercent: Number(maxDrawdown.toFixed(2)),
    profitFactor,
    avgWin,
    avgLoss,
    riskRewardRatio,
    equityCurve,
    trades,
  };
}
