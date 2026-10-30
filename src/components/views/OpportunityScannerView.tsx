import React, { useState, useEffect } from 'react';
import {
  Radar,
  Filter,
  ArrowUpRight,
  BookmarkPlus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { runOpportunityScan } from '../../services/scannerEngine';
import { addToWatchlist } from '../../services/firebase';
import { ScannerResult, MarketType } from '../../types/market';

interface OpportunityScannerViewProps {
  onNavigate: (view: string, instrument?: { symbol: string; market: string }) => void;
  userId: string;
}

export const OpportunityScannerView: React.FC<OpportunityScannerViewProps> = ({
  onNavigate,
  userId,
}) => {
  const [marketFilter, setMarketFilter] = useState<'all' | MarketType>('all');
  const [profileFilter, setProfileFilter] = useState<'all' | 'day' | 'swing' | 'long_term'>('all');
  const [results, setResults] = useState<ScannerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedSymbols, setSavedSymbols] = useState<Set<string>>(new Set());

  const executeScan = async () => {
    setLoading(true);
    try {
      const scanResults = await runOpportunityScan(marketFilter, profileFilter);
      setResults(scanResults);
    } catch (err) {
      console.warn('Scanner error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeScan();
  }, [marketFilter, profileFilter]);

  const handleSaveWatchlist = async (res: ScannerResult) => {
    await addToWatchlist({
      id: `${userId}_${res.market}_${res.symbol}_${Date.now()}`,
      userId,
      symbol: res.symbol,
      name: res.name,
      market: res.market,
      notes: `${res.setupTitle} (${res.profile.toUpperCase()})`,
      addedAt: new Date().toISOString(),
    });
    setSavedSymbols((prev) => new Set(prev).add(res.symbol));
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white font-sans">
              OPPORTUNITY SCANNER
            </h1>
            <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-mono text-cyan-400">
              Multi-Market Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Algorithmic Scanning across Day Trading, Swing Trading & Long-Term Investment Profiles
          </p>
        </div>

        <button
          onClick={executeScan}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-mono font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Scanning Universe...' : 'Refresh Scan'}</span>
        </button>
      </div>

      {/* Filter Matrix */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 pb-2 border-b border-slate-800">
          <Filter size={14} />
          <span>Active Scanner Filters</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Market Filter */}
          <div>
            <label className="text-[11px] font-mono text-slate-400">Asset Class</label>
            <div className="mt-1 flex flex-wrap gap-1.5 font-mono text-xs">
              {(['all', 'crypto', 'stocks', 'forex'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMarketFilter(m)}
                  className={`rounded-lg px-3 py-1.5 uppercase transition font-medium ${
                    marketFilter === m
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {m === 'all' ? 'All Markets' : m}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy Profile Filter */}
          <div>
            <label className="text-[11px] font-mono text-slate-400">Horizon Profile</label>
            <div className="mt-1 flex flex-wrap gap-1.5 font-mono text-xs">
              {[
                { id: 'all', label: 'All Profiles' },
                { id: 'day', label: 'Day Trading (Momentum)' },
                { id: 'swing', label: 'Swing Trading (Trend/Pullback)' },
                { id: 'long_term', label: 'Long-Term (Macro Trend)' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProfileFilter(p.id as any)}
                  className={`rounded-lg px-3 py-1.5 transition font-medium ${
                    profileFilter === p.id
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Identified Opportunities: <strong className="text-white">{results.length}</strong> setups</span>
          <span>Never automatically executes orders</span>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-12 text-center text-xs font-mono text-slate-400">
            Running quantitative scan across Binance Vision, Alpha Vantage, and Frankfurter ECB feeds...
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-12 text-center text-xs font-mono text-slate-400">
            No instruments currently match the selected strategy criteria. Try selecting "All Profiles" or "All Markets".
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((res, idx) => {
              const isSaved = savedSymbols.has(res.symbol);
              return (
                <div
                  key={`${res.market}-${res.symbol}-${res.profile}-${idx}`}
                  className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl flex flex-col justify-between transition hover:border-slate-700"
                >
                  <div>
                    {/* Header: Symbol & Profile Badge */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-white font-mono">{res.symbol}</span>
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] uppercase text-slate-400 font-mono">
                            {res.market}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">{res.name}</div>
                      </div>

                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold font-mono uppercase ${
                          res.profile === 'day'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : res.profile === 'swing'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {res.profile === 'day' ? 'Day Trade' : res.profile === 'swing' ? 'Swing' : 'Long-Term'}
                      </span>
                    </div>

                    {/* Price & Change */}
                    <div className="mt-3 flex items-center justify-between border-y border-slate-800/80 py-2 font-mono text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px]">Price:</span>{' '}
                        <strong className="text-white">${res.price.toLocaleString()}</strong>
                      </div>
                      <div
                        className={`font-semibold ${
                          res.change24hPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {res.change24hPercent >= 0 ? '+' : ''}
                        {res.change24hPercent}%
                      </div>
                    </div>

                    {/* Technical Indicators */}
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                      <div className="rounded bg-slate-900/80 p-1.5 border border-slate-800">
                        <div className="text-slate-400">RSI</div>
                        <div className="font-bold text-white mt-0.5">{res.rsi}</div>
                      </div>
                      <div className="rounded bg-slate-900/80 p-1.5 border border-slate-800">
                        <div className="text-slate-400">MACD</div>
                        <div className="font-bold text-emerald-400 mt-0.5">{res.macdStatus}</div>
                      </div>
                      <div className="rounded bg-slate-900/80 p-1.5 border border-slate-800">
                        <div className="text-slate-400">Trend</div>
                        <div className="font-bold text-cyan-400 mt-0.5 truncate">{res.trend}</div>
                      </div>
                    </div>

                    {/* Setup Title & Description */}
                    <div className="mt-3 space-y-1">
                      <h4 className="text-xs font-bold text-slate-200 font-mono">
                        {res.setupTitle}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        {res.setupDescription}
                      </p>
                    </div>

                    {/* Invalidation & Risk */}
                    <div className="mt-3 rounded-lg bg-slate-900/60 p-2 border border-slate-800 text-[10px] font-mono flex items-center justify-between">
                      <span className="text-slate-400">Invalidation Level:</span>
                      <strong className="text-rose-400">${res.invalidationLevel}</strong>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-3">
                    <button
                      onClick={() => handleSaveWatchlist(res)}
                      className={`flex-1 flex items-center justify-center gap-1 rounded-lg border py-1.5 text-xs font-mono transition ${
                        isSaved
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                          : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {isSaved ? <Check size={13} /> : <BookmarkPlus size={13} />}
                      <span>{isSaved ? 'Saved' : 'Watchlist'}</span>
                    </button>

                    <button
                      onClick={() => onNavigate('ai-research', { symbol: res.symbol, market: res.market })}
                      title="AI Research Desk"
                      className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition"
                    >
                      <Activity size={15} />
                    </button>

                    <button
                      onClick={() => onNavigate('paper-trading', { symbol: res.symbol, market: res.market })}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-mono font-bold text-slate-950 hover:bg-emerald-400 transition"
                    >
                      Trade
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
