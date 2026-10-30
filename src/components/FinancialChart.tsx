import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, CrosshairMode, ColorType } from 'lightweight-charts';
import {
  calculateATR,
  calculateBollingerBands,
  calculateEMA,
  calculateMACD,
  calculateRSI,
  calculateSMA,
  calculateVWAP,
} from '../services/technicalAnalysis';
import { Candle, Timeframe } from '../types/market';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CandlestickChart,
  Crosshair,
  Fullscreen,
  LineChart,
  Minus,
  PencilLine,
  Plus,
  RotateCcw,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface FinancialChartProps {
  candles: Candle[];
  symbol: string;
  provider: string;
  selectedInterval: Timeframe;
  onSelectInterval: (interval: Timeframe) => void;
  height?: number;
  loading?: boolean;
  error?: string | null;
  marketLabel?: string;
  lastUpdated?: number;
  onSymbolChange?: (symbol: string) => void;
  onTradeAction?: (side: 'BUY' | 'SELL') => void;
  userId?: string;
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];

const formatPrice = (value: number | null | undefined, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: 4 })}`;
};

const toTimeStamp = (unixTs: number) => Math.floor(unixTs) as any;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const FinancialChart: React.FC<FinancialChartProps> = ({
  candles,
  symbol,
  provider,
  selectedInterval,
  onSelectInterval,
  height = 520,
  loading = false,
  error = null,
  marketLabel,
  lastUpdated,
  onSymbolChange,
  onTradeAction,
  userId,
}) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const [chartMode, setChartMode] = useState<'candles' | 'line'>('candles');
  const [showEMA9, setShowEMA9] = useState(true);
  const [showEMA21, setShowEMA21] = useState(true);
  const [showEMA55, setShowEMA55] = useState(false);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showSMA200, setShowSMA200] = useState(false);
  const [showBB, setShowBB] = useState(true);
  const [showVWAP, setShowVWAP] = useState(false);
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(true);
  const [showATR, setShowATR] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [drawings, setDrawings] = useState<Array<{ id: string; price: number; label: string }>>([]);

  const symbolOptions = useMemo(
    () => ['BTC', 'ETH', 'SOL', 'XAUUSD', 'EUR/USD', 'GBP/USD', 'NVDA', 'AAPL', 'MSFT', 'TSLA'],
    []
  );

  useEffect(() => {
    if (!userId) return;
    const savedKey = `marketmind:chart-drawings:${userId}:${symbol}`;
    try {
      const raw = localStorage.getItem(savedKey);
      if (raw) setDrawings(JSON.parse(raw));
    } catch {
      // ignore local storage issues
    }
  }, [symbol, userId]);

  useEffect(() => {
    if (!userId || drawings.length === 0) return;
    const savedKey = `marketmind:chart-drawings:${userId}:${symbol}`;
    try {
      localStorage.setItem(savedKey, JSON.stringify(drawings));
    } catch {
      // ignore local storage issues
    }
  }, [drawings, symbol, userId]);

  const closes = candles.map((c) => c.close);
  const ema9 = useMemo(() => calculateEMA(closes, 9), [closes]);
  const ema21 = useMemo(() => calculateEMA(closes, 21), [closes]);
  const ema55 = useMemo(() => calculateEMA(closes, 55), [closes]);
  const sma50 = useMemo(() => calculateSMA(closes, 50), [closes]);
  const sma200 = useMemo(() => calculateSMA(closes, 200), [closes]);
  const bollinger = useMemo(() => calculateBollingerBands(closes, 20, 2), [closes]);
  const vwap = useMemo(() => calculateVWAP(candles), [candles]);
  const rsi = useMemo(() => calculateRSI(closes, 14), [closes]);
  const macd = useMemo(() => calculateMACD(closes, 12, 26, 9), [closes]);
  const atr = useMemo(() => calculateATR(candles, 14), [candles]);

  const latest = candles[candles.length - 1];
  const first = candles[0];
  const minPrice = candles.length ? Math.min(...candles.map((c) => c.low)) : 0;
  const maxPrice = candles.length ? Math.max(...candles.map((c) => c.high)) : 0;
  const pricePadding = candles.length > 1 ? ((maxPrice - minPrice) || 1) * 0.12 : 1;
  const priceRange = candles.length ? { min: minPrice - pricePadding, max: maxPrice + pricePadding } : { min: 0, max: 1 };

  const indicatorSummary = useMemo(() => {
    const lastRSI = rsi[rsi.length - 1];
    const lastATR = atr[atr.length - 1];
    const lastVWAP = vwap[vwap.length - 1];
    const lastMACD = macd.macdLine[macd.macdLine.length - 1];
    const lastSignal = macd.signalLine[macd.signalLine.length - 1];
    return {
      latestRSI: lastRSI,
      latestATR: lastATR,
      latestVWAP: lastVWAP,
      latestMACD: lastMACD,
      latestSignal: lastSignal,
      latestClose: latest?.close,
    };
  }, [atr, latest, macd, rsi, vwap]);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#0c1220' },
        textColor: '#cbd5e1',
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.14)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.14)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: '#334155',
        visible: true,
        scaleMargins: { top: 0.12, bottom: 0.18 },
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceLineColor: '#94a3b8',
      lastValueVisible: true,
    });

    const candleData = candles.map((c) => ({
      time: toTimeStamp(c.time) as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeries.setData(candleData);

    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
        color: '#3b82f6',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.72, bottom: 0 },
        borderColor: '#334155',
      });
      volumeSeries.setData(
        candles.map((c) => ({
          time: toTimeStamp(c.time) as any,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(34, 197, 94, 0.38)' : 'rgba(239, 68, 68, 0.38)',
        }))
      );
    }

    if (chartMode === 'line') {
      const lineSeries = chart.addLineSeries({
        color: '#34d399',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        lastValueVisible: true,
      });
      lineSeries.setData(candles.map((c) => ({ time: toTimeStamp(c.time) as any, value: c.close })));
    }

    if (showEMA9) {
      const series = chart.addLineSeries({ color: '#22d3ee', lineWidth: 1.5 });
      series.setData(
        candles.map((c, idx) => ({ time: toTimeStamp(c.time) as any, value: ema9[idx] ?? null })).filter((p) => p.value !== null) as any
      );
    }

    if (showEMA21) {
      const series = chart.addLineSeries({ color: '#fbbf24', lineWidth: 1.5 });
      series.setData(
        candles.map((c, idx) => ({ time: toTimeStamp(c.time) as any, value: ema21[idx] ?? null })).filter((p) => p.value !== null) as any
      );
    }

    if (showEMA55) {
      const series = chart.addLineSeries({ color: '#8b5cf6', lineWidth: 1.5 });
      series.setData(
        candles.map((c, idx) => ({ time: toTimeStamp(c.time) as any, value: ema55[idx] ?? null })).filter((p) => p.value !== null) as any
      );
    }

    if (showSMA50) {
      const series = chart.addLineSeries({ color: '#a78bfa', lineWidth: 1.25 });
      series.setData(
        candles.map((c, idx) => ({ time: toTimeStamp(c.time) as any, value: sma50[idx] ?? null })).filter((p) => p.value !== null) as any
      );
    }

    if (showSMA200) {
      const series = chart.addLineSeries({ color: '#f472b6', lineWidth: 1.1 });
      series.setData(
        candles.map((c, idx) => ({ time: toTimeStamp(c.time) as any, value: sma200[idx] ?? null })).filter((p) => p.value !== null) as any
      );
    }

    if (showBB) {
      const upper = chart.addLineSeries({ color: '#818cf8', lineWidth: 1 });
      upper.setData(
        candles.map((c, idx) => ({ time: toTimeStamp(c.time) as any, value: bollinger.upper[idx] ?? null })).filter((p) => p.value !== null) as any
      );
      const lower = chart.addLineSeries({ color: '#818cf8', lineWidth: 1 });
      lower.setData(
        candles.map((c, idx) => ({ time: toTimeStamp(c.time) as any, value: bollinger.lower[idx] ?? null })).filter((p) => p.value !== null) as any
      );
    }

    if (showVWAP) {
      const series = chart.addLineSeries({ color: '#14b8a6', lineWidth: 1.4 });
      series.setData(
        candles.map((c, idx) => ({ time: toTimeStamp(c.time) as any, value: vwap[idx] ?? null })).filter((p) => p.value !== null) as any
      );
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width && height) chart.applyOptions({ width, height });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [
    candles,
    showATR,
    showBB,
    showEMA21,
    showEMA55,
    showEMA9,
    showSMA200,
    showSMA50,
    showVWAP,
    showVolume,
    chartMode,
    bollinger,
    ema21,
    ema55,
    ema9,
    sma200,
    sma50,
    vwap,
  ]);

  const addHorizontalDrawing = () => {
    const price = latest?.close ?? 0;
    const next = { id: `${Date.now()}`, price, label: `H ${price.toFixed(2)}` };
    setDrawings((prev) => [...prev.slice(-9), next]);
  };

  const clearDrawings = () => setDrawings([]);
  const zoomIn = () => chartRef.current?.timeScale().zoom(1.15);
  const zoomOut = () => chartRef.current?.timeScale().zoom(-1.15);
  const resetView = () => chartRef.current?.timeScale().fitContent();

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-5 text-sm text-slate-400 shadow-2xl">
        <div className="flex items-center justify-center gap-3">
          <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
          Loading verified market data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 text-sm text-rose-300 shadow-2xl">
        Market data error: {error}
      </div>
    );
  }

  if (!candles || candles.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#0c1220] p-5 text-sm text-slate-400 shadow-2xl">
        No historical OHLC data available for {symbol}. Try a different symbol or timeframe.
      </div>
    );
  }

  const firstClose = first?.close ?? latest.close;
  const netChange = latest.close - firstClose;
  const netPct = firstClose ? (netChange / firstClose) * 100 : 0;
  const isUp = latest.close >= firstClose;

  return (
    <div className={`rounded-2xl border border-slate-800 bg-[#0c1220] shadow-2xl ${isFullscreen ? 'fixed inset-0 z-[100] m-0 rounded-none' : ''}`}>
      <div className="border-b border-slate-800 bg-[#111b2a]/90 p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1.5">
              <span className="text-sm font-bold text-white">{symbol}</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-slate-300">{selectedInterval}</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-800 px-2 py-1.5 text-xs text-slate-300">
              <span>{marketLabel || 'Market'}</span>
              <span className="text-slate-500">•</span>
              <span>{provider}</span>
            </div>
            <div className="text-lg font-black text-white">{formatPrice(latest.close)}</div>
            <div className={`text-xs font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isUp ? '+' : ''}{netPct.toFixed(2)}% ({isUp ? '+' : ''}{netChange.toFixed(2)})
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={symbol}
              onChange={(e) => onSymbolChange?.(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none"
            >
              {symbolOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <div className="flex flex-wrap items-center rounded-lg border border-slate-700 bg-slate-900/80 p-0.5">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => onSelectInterval(tf)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase transition ${
                    selectedInterval === tf ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tf.replace('1M', 'MN1').replace('1m', 'M1').replace('5m', 'M5').replace('15m', 'M15').replace('30m', 'M30').replace('1h', 'H1').replace('4h', 'H4').replace('1d', 'D1').replace('1w', 'W1')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/80 p-1">
              <button type="button" onClick={() => setChartMode('candles')} className={`rounded-md p-2 ${chartMode === 'candles' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'}`} title="Candles"><CandlestickChart size={15} /></button>
              <button type="button" onClick={() => setChartMode('line')} className={`rounded-md p-2 ${chartMode === 'line' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'}`} title="Line"><LineChart size={15} /></button>
              <button type="button" onClick={zoomOut} className="rounded-md p-2 text-slate-400 hover:text-white" title="Zoom out"><Minus size={15} /></button>
              <button type="button" onClick={zoomIn} className="rounded-md p-2 text-slate-400 hover:text-white" title="Zoom in"><Plus size={15} /></button>
              <button type="button" onClick={resetView} className="rounded-md p-2 text-slate-400 hover:text-white" title="Reset view"><RotateCcw size={15} /></button>
              <button type="button" onClick={() => setIsFullscreen((prev) => !prev)} className="rounded-md p-2 text-slate-400 hover:text-white" title="Fullscreen"><Fullscreen size={15} /></button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-300">
          <button type="button" onClick={() => setShowEMA9((p) => !p)} className={`rounded border px-2 py-1 ${showEMA9 ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-slate-700 text-slate-400'}`}>EMA 9</button>
          <button type="button" onClick={() => setShowEMA21((p) => !p)} className={`rounded border px-2 py-1 ${showEMA21 ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-slate-700 text-slate-400'}`}>EMA 21</button>
          <button type="button" onClick={() => setShowEMA55((p) => !p)} className={`rounded border px-2 py-1 ${showEMA55 ? 'border-violet-500/40 bg-violet-500/10 text-violet-300' : 'border-slate-700 text-slate-400'}`}>EMA 55</button>
          <button type="button" onClick={() => setShowSMA50((p) => !p)} className={`rounded border px-2 py-1 ${showSMA50 ? 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300' : 'border-slate-700 text-slate-400'}`}>SMA 50</button>
          <button type="button" onClick={() => setShowSMA200((p) => !p)} className={`rounded border px-2 py-1 ${showSMA200 ? 'border-pink-500/40 bg-pink-500/10 text-pink-300' : 'border-slate-700 text-slate-400'}`}>SMA 200</button>
          <button type="button" onClick={() => setShowBB((p) => !p)} className={`rounded border px-2 py-1 ${showBB ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300' : 'border-slate-700 text-slate-400'}`}>Bollinger</button>
          <button type="button" onClick={() => setShowVWAP((p) => !p)} className={`rounded border px-2 py-1 ${showVWAP ? 'border-teal-500/40 bg-teal-500/10 text-teal-300' : 'border-slate-700 text-slate-400'}`}>VWAP</button>
          <button type="button" onClick={() => setShowVolume((p) => !p)} className={`rounded border px-2 py-1 ${showVolume ? 'border-blue-500/40 bg-blue-500/10 text-blue-300' : 'border-slate-700 text-slate-400'}`}>Volume</button>
          <button type="button" onClick={() => setShowRSI((p) => !p)} className={`rounded border px-2 py-1 ${showRSI ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-slate-400'}`}>RSI</button>
          <button type="button" onClick={() => setShowMACD((p) => !p)} className={`rounded border px-2 py-1 ${showMACD ? 'border-sky-500/40 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400'}`}>MACD</button>
          <button type="button" onClick={() => setShowATR((p) => !p)} className={`rounded border px-2 py-1 ${showATR ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-slate-700 text-slate-400'}`}>ATR</button>
          <button type="button" onClick={addHorizontalDrawing} className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:border-slate-500"><PencilLine size={12} className="inline mr-1" /> Draw</button>
          <button type="button" onClick={clearDrawings} className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:border-slate-500"><Trash2 size={12} className="inline mr-1" /> Clear</button>
          <button type="button" onClick={() => onTradeAction?.('BUY')} className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-300"><ArrowUpRight size={12} className="inline mr-1" /> BUY</button>
          <button type="button" onClick={() => onTradeAction?.('SELL')} className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-rose-300"><ArrowDownRight size={12} className="inline mr-1" /> SELL</button>
        </div>
      </div>

      <div className="relative">
        <div ref={chartContainerRef} style={{ height: `${isFullscreen ? window.innerHeight - 140 : height}px`, minHeight: '320px', width: '100%' }} />

        {drawings.length > 0 && (
          <div className="pointer-events-none absolute inset-0">
            {drawings.map((drawing) => {
              const y = clamp(((priceRange.max - drawing.price) / (priceRange.max - priceRange.min || 1)) * 100, 4, 96);
              return (
                <div key={drawing.id} className="absolute left-0 right-0 flex items-center" style={{ top: `${y}%` }}>
                  <div className="h-px flex-1 bg-amber-300/80" />
                  <span className="ml-2 rounded bg-slate-900/80 px-1 text-[10px] text-amber-300">{drawing.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showRSI && (
        <div className="border-t border-slate-800 bg-[#0b1220] px-3 py-2">
          <div className="mb-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="inline-flex items-center gap-2"><BarChart3 size={12} /> Relative Strength Index (14)</span>
            <span className="font-bold text-emerald-300">{indicatorSummary.latestRSI !== undefined ? indicatorSummary.latestRSI.toFixed(2) : 'N/A'}</span>
          </div>
          <div className="h-20 rounded-lg border border-slate-800 bg-[#0c1220] p-2">
            <div className="flex h-full items-end gap-1 overflow-hidden">
              {rsi.map((value, idx) => {
                if (value === null) return null;
                const height = clamp((value / 100) * 100, 10, 100);
                return <span key={`${symbol}-rsi-${idx}`} className="flex-1 rounded-t bg-emerald-400/80" style={{ height: `${height}%` }} title={value.toFixed(2)} />;
              })}
            </div>
          </div>
        </div>
      )}

      {showMACD && (
        <div className="border-t border-slate-800 bg-[#0b1220] px-3 py-2">
          <div className="mb-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="inline-flex items-center gap-2"><TrendingUp size={12} /> MACD (12,26,9)</span>
            <span className="font-bold text-sky-300">{indicatorSummary.latestMACD !== undefined ? indicatorSummary.latestMACD.toFixed(4) : 'N/A'}</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono">
            <span>Signal: {indicatorSummary.latestSignal !== undefined ? indicatorSummary.latestSignal.toFixed(4) : 'N/A'}</span>
            <span>Hist: {macd.histogram[macd.histogram.length - 1] !== null ? macd.histogram[macd.histogram.length - 1]?.toFixed(4) : 'N/A'}</span>
          </div>
        </div>
      )}

      {showATR && (
        <div className="border-t border-slate-800 bg-[#0b1220] px-3 py-2">
          <div className="mb-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="inline-flex items-center gap-2"><Zap size={12} /> Average True Range</span>
            <span className="font-bold text-amber-300">{indicatorSummary.latestATR !== undefined ? indicatorSummary.latestATR.toFixed(4) : 'N/A'}</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 px-3 py-2 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          <span>Feed: <strong className="text-slate-200">{provider}</strong></span>
        </div>
        <div className="flex items-center gap-3">
          <span>Source: {provider}</span>
          <span>•</span>
          <span>Updated: {lastUpdated ? new Date(lastUpdated * 1000).toLocaleTimeString() : new Date((latest?.time ?? Date.now() / 1000) * 1000).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default FinancialChart;
