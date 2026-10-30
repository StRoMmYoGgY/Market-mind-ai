import React, { useState, useEffect } from 'react';
import {
  LineChart as ChartIcon,
  TrendingUp,
  TrendingDown,
  Award,
  DollarSign,
  Percent,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { getPaperOrders, getPaperAccount } from '../../services/firebase';
import { PaperOrder, PaperAccount } from '../../types/trading';

interface PerformanceAnalyticsViewProps {
  userId: string;
}

export const PerformanceAnalyticsView: React.FC<PerformanceAnalyticsViewProps> = ({ userId }) => {
  const [orders, setOrders] = useState<PaperOrder[]>([]);
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [marketFilter, setMarketFilter] = useState<'all' | 'crypto' | 'stocks' | 'forex'>('all');

  useEffect(() => {
    Promise.all([getPaperOrders(userId), getPaperAccount(userId)]).then(([ords, acc]) => {
      setOrders(ords);
      setAccount(acc);
    });
  }, [userId]);

  const closedTrades = orders.filter(
    (o) => (o.status === 'CLOSED' || o.realizedPnl !== undefined) && (marketFilter === 'all' || o.market === marketFilter)
  );

  const totalTrades = closedTrades.length;
  const wins = closedTrades.filter((t) => (t.realizedPnl || 0) > 0);
  const losses = closedTrades.filter((t) => (t.realizedPnl || 0) <= 0);

  const winRate = totalTrades > 0 ? ((wins.length / totalTrades) * 100).toFixed(1) : '0.0';
  const totalRealizedPnl = closedTrades.reduce((acc, t) => acc + (t.realizedPnl || 0), 0);

  const grossWin = wins.reduce((acc, t) => acc + (t.realizedPnl || 0), 0);
  const grossLoss = Math.abs(losses.reduce((acc, t) => acc + (t.realizedPnl || 0), 0));
  const profitFactor = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : grossWin > 0 ? '99.0' : '0.0';

  const avgWin = wins.length > 0 ? (grossWin / wins.length).toFixed(2) : '0.00';
  const avgLoss = losses.length > 0 ? (grossLoss / losses.length).toFixed(2) : '0.00';
  const riskReward = Number(avgLoss) > 0 ? (Number(avgWin) / Number(avgLoss)).toFixed(2) : '0.0';

  // Bar chart data for PnL by trade
  const tradePnlData = closedTrades.map((t, i) => ({
    name: `#${i + 1} ${t.symbol}`,
    pnl: t.realizedPnl || 0,
    isWin: (t.realizedPnl || 0) >= 0,
  }));

  // Market Breakdown
  const marketBreakdown: Record<string, { trades: number; pnl: number }> = {
    crypto: { trades: 0, pnl: 0 },
    stocks: { trades: 0, pnl: 0 },
    forex: { trades: 0, pnl: 0 },
  };

  closedTrades.forEach((t) => {
    if (marketBreakdown[t.market]) {
      marketBreakdown[t.market].trades += 1;
      marketBreakdown[t.market].pnl += t.realizedPnl || 0;
    }
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-sans">
            PERFORMANCE ANALYTICS
          </h1>
          <p className="text-slate-400">
            Realized Execution Performance, Risk Efficiency & Multi-Market Expectancy
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0c1220] p-1">
          {(['all', 'crypto', 'stocks', 'forex'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMarketFilter(m)}
              className={`rounded px-3 py-1 uppercase font-bold transition ${
                marketFilter === m
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m === 'all' ? 'All' : m}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl">
          <div className="text-[10px] uppercase text-slate-400">Total Realized P&L</div>
          <div
            className={`mt-1.5 text-xl font-black ${
              totalRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalRealizedPnl >= 0 ? '+' : ''}${totalRealizedPnl.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{totalTrades} Closed Trades</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl">
          <div className="text-[10px] uppercase text-slate-400">Win Rate</div>
          <div className="mt-1.5 text-xl font-black text-white">{winRate}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{wins.length}W / {losses.length}L</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl">
          <div className="text-[10px] uppercase text-slate-400">Profit Factor</div>
          <div className="mt-1.5 text-xl font-black text-emerald-400">{profitFactor}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Gross Win / Gross Loss</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl">
          <div className="text-[10px] uppercase text-slate-400">Average Win</div>
          <div className="mt-1.5 text-xl font-black text-emerald-400">+${avgWin}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Per Winning Trade</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl">
          <div className="text-[10px] uppercase text-slate-400">Average Loss</div>
          <div className="mt-1.5 text-xl font-black text-rose-400">-${avgLoss}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Per Losing Trade</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl">
          <div className="text-[10px] uppercase text-slate-400">Realized R:R</div>
          <div className="mt-1.5 text-xl font-black text-cyan-400">{riskReward}:1</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Mathematical Expectancy</div>
        </div>
      </div>

      {/* Trade P&L Distribution Chart */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="font-bold text-white uppercase tracking-wider text-xs">
            Individual Trade Return Distribution ($)
          </span>
          <span className="text-slate-400 text-[10px]">Actual Realized Outcomes</span>
        </div>

        <div className="h-60 w-full">
          {tradePnlData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-400 text-xs">
              Execute and close paper trades to populate performance distribution.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tradePnlData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} orientation="right" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded border border-slate-700 bg-slate-900 p-2 text-xs">
                        <div>Trade: {d.name}</div>
                        <div className={d.isWin ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          Result: {d.pnl >= 0 ? '+' : ''}${d.pnl?.toFixed(2)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="pnl" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Market Class Breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(['crypto', 'stocks', 'forex'] as const).map((m) => {
          const stats = marketBreakdown[m];
          return (
            <div key={m} className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase text-xs">{m} Market</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 uppercase">
                  {stats.trades} Trades
                </span>
              </div>
              <div
                className={`mt-2 text-lg font-bold ${
                  stats.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
