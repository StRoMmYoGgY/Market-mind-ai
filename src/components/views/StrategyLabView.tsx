import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Percent,
  DollarSign,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { PRESET_STRATEGIES, runBacktest } from '../../services/backtestEngine';
import { getMarketCandles } from '../../services/marketApi';
import { StrategyConfig, BacktestResult } from '../../types/trading';
import { MarketType } from '../../types/market';

interface StrategyLabViewProps {
  onNavigate: (view: string, instrument?: { symbol: string; market: string }) => void;
  initialInstrument?: { symbol: string; market: string };
}

export const StrategyLabView: React.FC<StrategyLabViewProps> = ({
  onNavigate,
  initialInstrument,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<StrategyConfig>(PRESET_STRATEGIES[0]);
  const [symbol, setSymbol] = useState(initialInstrument?.symbol || selectedPreset.symbol);
  const [market, setMarket] = useState<MarketType>(
    (initialInstrument?.market as MarketType) || selectedPreset.market
  );
  const [timeframe, setTimeframe] = useState(selectedPreset.timeframe);

  // Strategy parameters
  const [capital, setCapital] = useState(selectedPreset.startingCapital);
  const [positionSizePercent, setPositionSizePercent] = useState(selectedPreset.positionSizePercent);
  const [stopLossPercent, setStopLossPercent] = useState(selectedPreset.stopLossPercent);
  const [takeProfitPercent, setTakeProfitPercent] = useState(selectedPreset.takeProfitPercent);
  const [feePercent, setFeePercent] = useState(selectedPreset.feePercent);
  const [slippagePercent, setSlippagePercent] = useState(selectedPreset.slippagePercent);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const handleRunBacktest = async () => {
    setLoading(true);
    try {
      const candlesData = await getMarketCandles(symbol, market, timeframe, 150);

      const activeConfig: StrategyConfig = {
        ...selectedPreset,
        symbol,
        market,
        timeframe,
        startingCapital: capital,
        positionSizePercent,
        stopLossPercent,
        takeProfitPercent,
        feePercent,
        slippagePercent,
      };

      const res = runBacktest(candlesData.candles, activeConfig);
      setResult(res);
    } catch (err) {
      console.warn('Backtest error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRunBacktest();
  }, [selectedPreset.id]);

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white font-sans">
              STRATEGY LAB & BACKTESTER
            </h1>
            <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-400">
              No Look-Ahead Bias
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Sequential Bar-by-Bar Algorithmic Simulation with Commission & Slippage Penalties
          </p>
        </div>

        <button
          onClick={handleRunBacktest}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-mono font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          <Play size={14} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Simulating Trades...' : 'Run Simulation'}</span>
        </button>
      </div>

      {/* Preset Strategy Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PRESET_STRATEGIES.map((strat) => {
          const isSelected = selectedPreset.id === strat.id;
          return (
            <div
              key={strat.id}
              onClick={() => {
                setSelectedPreset(strat);
                setSymbol(strat.symbol);
                setMarket(strat.market);
                setTimeframe(strat.timeframe);
                setStopLossPercent(strat.stopLossPercent);
                setTakeProfitPercent(strat.takeProfitPercent);
              }}
              className={`cursor-pointer rounded-xl border p-3.5 transition ${
                isSelected
                  ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'border-slate-800 bg-[#0c1220] hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">{strat.name}</span>
                <span className="text-[10px] uppercase font-mono text-slate-400">{strat.market}</span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400 line-clamp-2 font-sans">
                {strat.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Simulation Parameter Controls */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-white font-mono pb-2 border-b border-slate-800">
          Simulation Parameters & Friction Configuration
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6 font-mono text-xs">
          {/* Symbol */}
          <div>
            <label className="text-slate-400 text-[10px]">Asset Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white text-xs focus:border-emerald-500"
            />
          </div>

          {/* Timeframe */}
          <div>
            <label className="text-slate-400 text-[10px]">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white text-xs focus:border-emerald-500"
            >
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
          </div>

          {/* Capital */}
          <div>
            <label className="text-slate-400 text-[10px]">Starting Capital ($)</label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white text-xs focus:border-emerald-500"
            />
          </div>

          {/* Pos Size % */}
          <div>
            <label className="text-slate-400 text-[10px]">Position Size (%)</label>
            <input
              type="number"
              value={positionSizePercent}
              onChange={(e) => setPositionSizePercent(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white text-xs focus:border-emerald-500"
            />
          </div>

          {/* Stop Loss % */}
          <div>
            <label className="text-slate-400 text-[10px]">Stop-Loss (%)</label>
            <input
              type="number"
              step="0.1"
              value={stopLossPercent}
              onChange={(e) => setStopLossPercent(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white text-xs focus:border-emerald-500"
            />
          </div>

          {/* Take Profit % */}
          <div>
            <label className="text-slate-400 text-[10px]">Take-Profit (%)</label>
            <input
              type="number"
              step="0.1"
              value={takeProfitPercent}
              onChange={(e) => setTakeProfitPercent(Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white text-xs focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Friction fees */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-3">
          <div>
            Fee per execution:{' '}
            <input
              type="number"
              step="0.01"
              value={feePercent}
              onChange={(e) => setFeePercent(Number(e.target.value))}
              className="w-16 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-white"
            />
            %
          </div>
          <div>
            Slippage estimate:{' '}
            <input
              type="number"
              step="0.01"
              value={slippagePercent}
              onChange={(e) => setSlippagePercent(Number(e.target.value))}
              className="w-16 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-white"
            />
            %
          </div>
          <span className="text-slate-400">
            Penalties applied on both entry and exit.
          </span>
        </div>
      </div>

      {/* Backtest Results Dashboard */}
      {result && (
        <div className="space-y-6">
          {/* Top Performance Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 font-mono">
            {/* Net Return */}
            <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-lg">
              <div className="text-[10px] uppercase text-slate-400">Net Profit / Loss</div>
              <div
                className={`mt-1.5 text-xl font-extrabold ${
                  result.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {result.netProfit >= 0 ? '+' : ''}${result.netProfit.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400">
                {result.netReturnPercent >= 0 ? '+' : ''}{result.netReturnPercent}%
              </div>
            </div>

            {/* Win Rate */}
            <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-lg">
              <div className="text-[10px] uppercase text-slate-400">Win Rate</div>
              <div className="mt-1.5 text-xl font-extrabold text-white">
                {result.winRate}%
              </div>
              <div className="text-[10px] text-slate-400">
                {result.winningTrades}W / {result.losingTrades}L
              </div>
            </div>

            {/* Profit Factor */}
            <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-lg">
              <div className="text-[10px] uppercase text-slate-400">Profit Factor</div>
              <div className="mt-1.5 text-xl font-extrabold text-emerald-400">
                {result.profitFactor > 50 ? '∞' : result.profitFactor.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400">Gross Win / Gross Loss</div>
            </div>

            {/* Max Drawdown */}
            <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-lg">
              <div className="text-[10px] uppercase text-slate-400">Max Drawdown</div>
              <div className="mt-1.5 text-xl font-extrabold text-rose-400">
                -{result.maxDrawdownPercent}%
              </div>
              <div className="text-[10px] text-slate-400">Peak-to-Trough</div>
            </div>

            {/* Risk-Reward */}
            <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-lg">
              <div className="text-[10px] uppercase text-slate-400">Avg Trade R:R</div>
              <div className="mt-1.5 text-xl font-extrabold text-cyan-400">
                {result.riskRewardRatio}:1
              </div>
              <div className="text-[10px] text-slate-400">
                +${result.avgWin} / -${result.avgLoss}
              </div>
            </div>

            {/* Total Trades */}
            <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-lg">
              <div className="text-[10px] uppercase text-slate-400">Total Fills</div>
              <div className="mt-1.5 text-xl font-extrabold text-white">
                {result.totalTrades}
              </div>
              <div className="text-[10px] text-slate-400">{result.periodCandles} Candles</div>
            </div>
          </div>

          {/* Equity Curve Chart */}
          <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                Equity Curve Simulation ($)
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Starting: ${capital.toLocaleString()} • Final: ${(capital + result.netProfit).toLocaleString()}
              </span>
            </div>

            <div className="mt-3 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={result.equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    tick={{ fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(t) => new Date(t * 1000).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                  />
                  <YAxis
                    domain={['dataMin - 100', 'dataMax + 100']}
                    stroke="#64748b"
                    orientation="right"
                    tick={{ fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(v) => `$${v.toFixed(0)}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded border border-slate-700 bg-slate-900 p-2 text-xs font-mono">
                          <div>Date: {new Date(d.time * 1000).toLocaleDateString()}</div>
                          <div className="text-emerald-400 font-bold">Equity: ${d.equity?.toFixed(2)}</div>
                        </div>
                      );
                    }}
                  />
                  <Line type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trade-by-Trade Execution Audit Log */}
          <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl">
            <div className="text-xs font-bold uppercase tracking-wider text-white font-mono pb-3 border-b border-slate-800">
              Trade-By-Trade Historical Execution Log ({result.trades.length} Trades)
            </div>

            <div className="mt-3 overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                  <tr>
                    <th className="py-2">#</th>
                    <th>Entry Date</th>
                    <th>Exit Date</th>
                    <th>Entry ($)</th>
                    <th>Exit ($)</th>
                    <th>Qty</th>
                    <th>Gross P&L</th>
                    <th>Net P&L ($)</th>
                    <th>Return %</th>
                    <th>Exit Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {result.trades.map((t, idx) => {
                    const isWin = t.pnl > 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2 text-slate-400">{idx + 1}</td>
                        <td className="text-slate-300">
                          {new Date(t.entryTime * 1000).toLocaleDateString([], { month: 'numeric', day: 'numeric', hour: '2-digit' })}
                        </td>
                        <td className="text-slate-300">
                          {new Date(t.exitTime * 1000).toLocaleDateString([], { month: 'numeric', day: 'numeric', hour: '2-digit' })}
                        </td>
                        <td className="text-slate-200">${t.entryPrice.toFixed(2)}</td>
                        <td className="text-slate-200">${t.exitPrice.toFixed(2)}</td>
                        <td className="text-slate-300">{t.quantity.toFixed(4)}</td>
                        <td className="text-slate-400">${(t.pnl + t.fee).toFixed(2)}</td>
                        <td className={`font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isWin ? '+' : ''}${t.pnl.toFixed(2)}
                        </td>
                        <td className={isWin ? 'text-emerald-400' : 'text-rose-400'}>
                          {isWin ? '+' : ''}{t.pnlPercent}%
                        </td>
                        <td>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] uppercase font-bold ${
                              t.reason === 'take_profit'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : t.reason === 'stop_loss'
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {t.reason.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
