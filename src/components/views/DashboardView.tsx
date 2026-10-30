import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { FinancialChart } from '../FinancialChart';
import {
  getMarketOverview,
  getMarketCandles,
  requestAIMarketSummary,
  binanceWS,
} from '../../services/marketApi';
import {
  getPaperAccount,
  getPaperOrders,
  getWatchlist,
  removeFromWatchlist,
} from '../../services/firebase';
import { MarketQuote, Candle, Timeframe } from '../../types/market';
import { PaperAccount, PaperOrder } from '../../types/trading';

interface DashboardViewProps {
  onNavigate: (view: string, instrument?: { symbol: string; market: string }) => void;
  userId: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, userId }) => {
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [recentOrders, setRecentOrders] = useState<PaperOrder[]>([]);
  const [marketOverview, setMarketOverview] = useState<{
    crypto: MarketQuote[];
    forex: MarketQuote[];
    stocks: MarketQuote[];
  }>({ crypto: [], forex: [], stocks: [] });

  const [activeSymbol, setActiveSymbol] = useState('BTC');
  const [activeMarket, setActiveMarket] = useState<'crypto' | 'stocks' | 'forex'>('crypto');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [candlesProvider, setCandlesProvider] = useState('Binance Vision');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<{
    summary: string;
    keyThemes: string[];
    marketRegime: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load account, overview, and watchlist
  const loadDashboardData = async () => {
    try {
      const [acc, ords, mkt, wList] = await Promise.all([
        getPaperAccount(userId),
        getPaperOrders(userId),
        getMarketOverview(),
        getWatchlist(userId),
      ]);
      setAccount(acc);
      setRecentOrders(ords.slice(0, 5));
      setMarketOverview(mkt);
      setWatchlist(wList);

      // AI Summary
      requestAIMarketSummary(mkt)
        .then((summary) => setAiSummary(summary))
        .catch(() => {});
    } catch (err) {
      console.warn('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  // Load chart data for active symbol
  useEffect(() => {
    let isMounted = true;
    getMarketCandles(activeSymbol, activeMarket, timeframe, 80)
      .then((res) => {
        if (isMounted) {
          setCandles(res.candles);
          setCandlesProvider(res.provider);
        }
      })
      .catch(() => {});

    // Subscribe to live websocket ticks if crypto
    let unsub: (() => void) | undefined;
    if (activeMarket === 'crypto') {
      unsub = binanceWS.subscribe(activeSymbol, (livePrice) => {
        if (!isMounted) return;
        setCandles((prev) => {
          if (!prev || prev.length === 0) return prev;
          const updated = [...prev];
          const last = { ...updated[updated.length - 1] };
          last.close = livePrice;
          if (livePrice > last.high) last.high = livePrice;
          if (livePrice < last.low) last.low = livePrice;
          updated[updated.length - 1] = last;
          return updated;
        });
      });
    }

    return () => {
      isMounted = false;
      if (unsub) unsub();
    };
  }, [activeSymbol, activeMarket, timeframe]);

  const handleRemoveWatchlist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeFromWatchlist(userId, id);
    setWatchlist((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSelectAsset = (symbol: string, market: any) => {
    setActiveSymbol(symbol);
    setActiveMarket(market);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
            EXECUTIVE DASHBOARD
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Multi-Asset Terminal • Real-Time Deterministic Intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              loadDashboardData();
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-mono text-slate-300 transition hover:bg-slate-700"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>Sync Feeds</span>
          </button>
          <button
            onClick={() => onNavigate('paper-trading', { symbol: activeSymbol, market: activeMarket })}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold font-mono text-slate-950 transition hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
          >
            <span>Trade {activeSymbol}</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Account Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {/* Total Equity */}
        <div className="col-span-2 sm:col-span-2 rounded-xl border border-slate-800 bg-[#0d1322] p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Total Account Equity</span>
            <Wallet size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-white font-mono">
            ${account?.equity?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '10,000.00'}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] font-mono">
            <span className="text-slate-400">Cash:</span>
            <span className="text-slate-200">${account?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '10,000.00'}</span>
            <span className="rounded bg-emerald-500/10 px-1 text-[10px] text-emerald-400 border border-emerald-500/20">
              USD
            </span>
          </div>
        </div>

        {/* Realized P&L */}
        <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4 shadow-lg">
          <div className="text-xs text-slate-400 font-mono">Realized P&L</div>
          <div
            className={`mt-2 text-lg sm:text-xl font-bold font-mono ${
              (account?.realizedPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {(account?.realizedPnl || 0) >= 0 ? '+' : ''}
            ${(account?.realizedPnl || 0).toFixed(2)}
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">Historical closes</div>
        </div>

        {/* Unrealized P&L */}
        <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4 shadow-lg">
          <div className="text-xs text-slate-400 font-mono">Unrealized P&L</div>
          <div
            className={`mt-2 text-lg sm:text-xl font-bold font-mono ${
              (account?.unrealizedPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {(account?.unrealizedPnl || 0) >= 0 ? '+' : ''}
            ${(account?.unrealizedPnl || 0).toFixed(2)}
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">Open mark-to-market</div>
        </div>

        {/* Win Rate */}
        <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4 shadow-lg">
          <div className="text-xs text-slate-400 font-mono">Win Rate</div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-white font-mono">
            {account?.winRate?.toFixed(1) ?? '0.0'}%
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">
            {account?.totalTrades ?? 0} total trades
          </div>
        </div>

        {/* Active Orders */}
        <div className="rounded-xl border border-slate-800 bg-[#0d1322] p-4 shadow-lg">
          <div className="text-xs text-slate-400 font-mono">Open Orders</div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-white font-mono">
            {recentOrders.filter((o) => o.status === 'OPEN').length}
          </div>
          <div className="mt-1 text-[10px] text-emerald-400 font-mono">Paper Sandbox</div>
        </div>
      </div>

      {/* Gemini AI Market Intelligence Banner */}
      {aiSummary && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300 font-mono uppercase tracking-wider">
                Gemini Macro Intelligence • Regime: {aiSummary.marketRegime}
              </span>
            </div>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 font-mono">
              Live Verified Context
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed font-sans">
            {aiSummary.summary}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {aiSummary.keyThemes?.map((theme, i) => (
              <span
                key={i}
                className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[10px] text-slate-300 font-mono"
              >
                • {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Interactive Chart + Market Watch */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Main Interactive Chart */}
        <div className="lg:col-span-2 space-y-4">
          <FinancialChart
            candles={candles}
            symbol={activeSymbol}
            provider={candlesProvider}
            selectedInterval={timeframe}
            onSelectInterval={setTimeframe}
            height={380}
          />

          {/* Quick Action Bar under chart */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => onNavigate('ai-research', { symbol: activeSymbol, market: activeMarket })}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-[#0c1220] py-2.5 text-xs font-mono font-medium text-slate-200 transition hover:border-emerald-500/40 hover:text-emerald-400"
            >
              <Sparkles size={14} className="text-emerald-400" />
              <span>AI Research Report</span>
            </button>
            <button
              onClick={() => onNavigate('risk-manager', { symbol: activeSymbol, market: activeMarket })}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-[#0c1220] py-2.5 text-xs font-mono font-medium text-slate-200 transition hover:border-emerald-500/40 hover:text-emerald-400"
            >
              <ShieldCheck size={14} className="text-cyan-400" />
              <span>Risk Sizing</span>
            </button>
            <button
              onClick={() => onNavigate('strategy-lab', { symbol: activeSymbol, market: activeMarket })}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-[#0c1220] py-2.5 text-xs font-mono font-medium text-slate-200 transition hover:border-emerald-500/40 hover:text-emerald-400"
            >
              <Activity size={14} className="text-amber-400" />
              <span>Backtest Strategy</span>
            </button>
          </div>
        </div>

        {/* Right Col: Watchlist & Multi-Market Quotes */}
        <div className="space-y-4">
          {/* Watchlist Panel */}
          <div className="rounded-xl border border-slate-800/80 bg-[#0c1220] p-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Persistent Watchlist
              </span>
              <button
                onClick={() => onNavigate('explorer')}
                className="text-[11px] text-emerald-400 hover:underline font-mono"
              >
                + Add Asset
              </button>
            </div>
            <div className="mt-2 divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
              {watchlist.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-mono">
                  No assets saved. Browse Market Explorer to add to watchlist.
                </div>
              ) : (
                watchlist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectAsset(item.symbol, item.market)}
                    className={`flex items-center justify-between py-2.5 px-2 rounded cursor-pointer transition ${
                      activeSymbol === item.symbol
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-xs font-bold text-white">{item.symbol}</div>
                      <div className="text-[10px] text-slate-400">{item.name}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] uppercase text-slate-400 font-mono">
                        {item.market}
                      </span>
                      <button
                        onClick={(e) => handleRemoveWatchlist(item.id, e)}
                        className="text-slate-400 hover:text-rose-400"
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Cross-Asset Quotes */}
          <div className="rounded-xl border border-slate-800/80 bg-[#0c1220] p-4 shadow-lg">
            <div className="text-xs font-bold text-white uppercase tracking-wider font-mono pb-2 border-b border-slate-800">
              Live Cross-Asset Monitor
            </div>
            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
              {[...(marketOverview.crypto || []), ...(marketOverview.stocks || []), ...(marketOverview.forex || [])]
                .slice(0, 7)
                .map((q) => {
                  const isPos = q.change24hPercent >= 0;
                  return (
                    <div
                      key={`${q.marketType}-${q.symbol}`}
                      onClick={() => handleSelectAsset(q.symbol, q.marketType)}
                      className="flex items-center justify-between p-2 rounded bg-slate-900/60 hover:bg-slate-800/60 cursor-pointer transition font-mono text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{q.symbol}</span>
                        <span className="text-[9px] text-slate-400 uppercase">{q.marketType}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium">${q.price?.toLocaleString()}</div>
                        <div className={`text-[10px] ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPos ? '+' : ''}
                          {q.change24hPercent}%
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Paper Orders Table */}
      <div className="rounded-xl border border-slate-800/80 bg-[#0c1220] p-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Recent Order Executions (Paper Sandbox)
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Synchronized with Cloud Firestore & verified market fills
            </p>
          </div>
          <button
            onClick={() => onNavigate('paper-trading')}
            className="text-xs font-mono text-emerald-400 hover:underline"
          >
            View All Orders →
          </button>
        </div>

        <div className="mt-3 overflow-x-auto">
          {recentOrders.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 font-mono">
              No paper orders created yet. Open Paper Trading to execute your first simulated order.
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                <tr>
                  <th className="py-2">Time</th>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentOrders.map((ord) => {
                  const isBuy = ord.side === 'BUY';
                  return (
                    <tr key={ord.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 text-slate-400">
                        {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="font-bold text-white">{ord.symbol}</td>
                      <td>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {ord.side}
                        </span>
                      </td>
                      <td className="text-slate-300">{ord.orderType}</td>
                      <td className="text-slate-200">${ord.price.toFixed(2)}</td>
                      <td className="text-slate-300">{ord.quantity}</td>
                      <td>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                          {ord.status}
                        </span>
                      </td>
                      <td
                        className={
                          (ord.realizedPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {ord.realizedPnl !== undefined ? `$${ord.realizedPnl.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
