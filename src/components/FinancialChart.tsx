import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Candle, Timeframe } from '../types/market';
import {
  calculateEMA,
  calculateSMA,
  calculateBollingerBands,
  calculateRSI,
} from '../services/technicalAnalysis';
import { Layers, TrendingUp, BarChart2, Eye, EyeOff } from 'lucide-react';

interface FinancialChartProps {
  candles: Candle[];
  symbol: string;
  provider: string;
  selectedInterval: Timeframe;
  onSelectInterval: (interval: Timeframe) => void;
  height?: number;
}

export const FinancialChart: React.FC<FinancialChartProps> = ({
  candles,
  symbol,
  provider,
  selectedInterval,
  onSelectInterval,
  height = 420,
}) => {
  const [showEMA9, setShowEMA9] = useState(true);
  const [showEMA21, setShowEMA21] = useState(true);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');

  if (!candles || candles.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-slate-800 bg-[#0d1322] text-xs text-slate-400 font-mono">
        Loading verified market data...
      </div>
    );
  }

  // Pre-calculate technical indicators
  const closes = candles.map((c) => c.close);
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const sma50 = calculateSMA(closes, 50);
  const bb = calculateBollingerBands(closes, 20, 2);
  const rsi = calculateRSI(closes, 14);

  // Format data for Recharts
  const chartData = candles.map((c, i) => {
    const date = new Date(c.time * 1000);
    const timeLabel =
      selectedInterval === '1d' || selectedInterval === '1w'
        ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    return {
      time: timeLabel,
      timestamp: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      price: c.close,
      volume: c.volume,
      isGreen: c.close >= c.open,
      ema9: ema9[i] ?? undefined,
      ema21: ema21[i] ?? undefined,
      sma50: sma50[i] ?? undefined,
      bbUpper: bb.upper[i] ?? undefined,
      bbMiddle: bb.middle[i] ?? undefined,
      bbLower: bb.lower[i] ?? undefined,
      rsi: rsi[i] ?? undefined,
    };
  });

  const intervals: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

  // Min and max for domain
  const prices = candles.map((c) => c.close);
  const minPrice = Math.min(...candles.map((c) => c.low));
  const maxPrice = Math.max(...candles.map((c) => c.high));
  const padding = (maxPrice - minPrice) * 0.05 || 1;

  const latest = chartData[chartData.length - 1];
  const first = chartData[0];
  const netChange = latest.close - first.open;
  const netChangePercent = ((netChange / first.open) * 100).toFixed(2);
  const isPositive = netChange >= 0;

  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0c1220] p-4 shadow-xl">
      {/* Chart Top Bar: Symbol, Price, Timeframe Pills, Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        {/* Left: Ticker & Price Header */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white font-mono">{symbol}</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                {selectedInterval.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-extrabold text-white font-mono">
                ${latest.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
              <span
                className={`text-xs font-mono font-semibold ${
                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositive ? '+' : ''}
                {netChangePercent}%
              </span>
            </div>
          </div>

          <div className="hidden border-l border-slate-800 pl-4 sm:block text-[11px] text-slate-400 font-mono">
            <div>High: ${maxPrice.toFixed(2)}</div>
            <div>Low: ${minPrice.toFixed(2)}</div>
          </div>
        </div>

        {/* Center: Timeframe Selectors */}
        <div className="flex items-center rounded-lg bg-slate-900/90 p-0.5 border border-slate-800">
          {intervals.map((tf) => (
            <button
              key={tf}
              onClick={() => onSelectInterval(tf)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium font-mono transition ${
                selectedInterval === tf
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Right: Indicator Overlay Toggles */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
          <button
            onClick={() => setShowEMA9(!showEMA9)}
            className={`rounded px-2 py-0.5 transition border ${
              showEMA9
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                : 'text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            EMA 9
          </button>
          <button
            onClick={() => setShowEMA21(!showEMA21)}
            className={`rounded px-2 py-0.5 transition border ${
              showEMA21
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            EMA 21
          </button>
          <button
            onClick={() => setShowSMA50(!showSMA50)}
            className={`rounded px-2 py-0.5 transition border ${
              showSMA50
                ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                : 'text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            SMA 50
          </button>
          <button
            onClick={() => setShowBB(!showBB)}
            className={`rounded px-2 py-0.5 transition border ${
              showBB
                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                : 'text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            Bollinger (20,2)
          </button>
          <button
            onClick={() => setShowRSI(!showRSI)}
            className={`rounded px-2 py-0.5 transition border ${
              showRSI
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            RSI
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="mt-3 w-full" style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="priceLineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              tick={{ fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              domain={[minPrice - padding, maxPrice + padding]}
              stroke="#64748b"
              orientation="right"
              tick={{ fontSize: 10, fontFamily: 'monospace' }}
              tickFormatter={(v) => `$${Number(v).toFixed(v > 10 ? 2 : 4)}`}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg border border-slate-700 bg-[#0f172a]/95 p-3 text-xs shadow-2xl backdrop-blur-md font-mono">
                    <div className="text-slate-400 pb-1 mb-1 border-b border-slate-800 font-bold">
                      {d.time}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div className="text-slate-400">Open: <span className="text-white">${d.open?.toFixed(2)}</span></div>
                      <div className="text-slate-400">High: <span className="text-emerald-400">${d.high?.toFixed(2)}</span></div>
                      <div className="text-slate-400">Low: <span className="text-rose-400">${d.low?.toFixed(2)}</span></div>
                      <div className="text-slate-400">Close: <span className="text-white font-bold">${d.close?.toFixed(2)}</span></div>
                      <div className="text-slate-400 col-span-2">Vol: <span className="text-slate-300">{d.volume?.toLocaleString()}</span></div>
                      {d.ema9 && <div className="text-cyan-400">EMA9: ${d.ema9}</div>}
                      {d.ema21 && <div className="text-amber-400">EMA21: ${d.ema21}</div>}
                      {d.rsi && <div className="text-emerald-400">RSI: {d.rsi}</div>}
                    </div>
                  </div>
                );
              }}
            />

            {/* Price Line */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: '#34d399', strokeWidth: 2 }}
            />

            {/* Moving Averages */}
            {showEMA9 && (
              <Line
                type="monotone"
                dataKey="ema9"
                stroke="#06b6d4"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="2 2"
              />
            )}
            {showEMA21 && (
              <Line
                type="monotone"
                dataKey="ema21"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
              />
            )}
            {showSMA50 && (
              <Line
                type="monotone"
                dataKey="sma50"
                stroke="#a855f7"
                strokeWidth={1.5}
                dot={false}
              />
            )}

            {/* Bollinger Bands */}
            {showBB && (
              <>
                <Line type="monotone" dataKey="bbUpper" stroke="#6366f1" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                <Line type="monotone" dataKey="bbLower" stroke="#6366f1" strokeWidth={1} strokeDasharray="3 3" dot={false} />
              </>
            )}

            {/* Volume Overlay at bottom */}
            {showVolume && (
              <Bar
                dataKey="volume"
                yAxisId={0}
                opacity={0.2}
                fill="#3b82f6"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Optional RSI Sub-Chart */}
      {showRSI && (
        <div className="mt-3 border-t border-slate-800 pt-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
            <span>Relative Strength Index (RSI 14)</span>
            <span className="text-emerald-400 font-bold">{latest.rsi ?? 'N/A'}</span>
          </div>
          <div className="h-20 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" opacity={0.4} />
                <YAxis domain={[0, 100]} ticks={[30, 50, 70]} orientation="right" tick={{ fontSize: 9, fontFamily: 'monospace' }} stroke="#64748b" />
                <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="3 3" />
                <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="rsi" stroke="#10b981" strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Chart Footer: Provider & Freshness Notice */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          <span>Feed: <strong className="text-slate-300">{provider}</strong></span>
        </div>
        <div>
          Last Sync: {new Date(latest.timestamp * 1000).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};
