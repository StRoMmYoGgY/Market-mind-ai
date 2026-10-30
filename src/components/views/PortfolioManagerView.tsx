import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  PieChart as PieIcon,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Layers,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { getPaperAccount, getPaperOrders } from '../../services/firebase';
import { getMarketQuote } from '../../services/marketApi';
import { PaperAccount, PaperOrder } from '../../types/trading';

interface PortfolioManagerViewProps {
  userId: string;
  onNavigate: (view: string, instrument?: { symbol: string; market: string }) => void;
}

interface ManualHolding {
  id: string;
  symbol: string;
  name: string;
  market: 'crypto' | 'stocks' | 'forex';
  quantity: number;
  averageBuyPrice: number;
}

const COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#a855f7', '#ec4899', '#3b82f6'];

export const PortfolioManagerView: React.FC<PortfolioManagerViewProps> = ({
  userId,
  onNavigate,
}) => {
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [orders, setOrders] = useState<PaperOrder[]>([]);
  const [manualHoldings, setManualHoldings] = useState<ManualHolding[]>(() => {
    try {
      const saved = localStorage.getItem(`marketmind:manual_holdings:${userId || 'guest'}`);
      return saved ? JSON.parse(saved) : [
        { id: 'h1', symbol: 'BTC', name: 'Bitcoin', market: 'crypto', quantity: 0.25, averageBuyPrice: 62000 },
        { id: 'h2', symbol: 'NVDA', name: 'NVIDIA Corp.', market: 'stocks', quantity: 20, averageBuyPrice: 118 },
        { id: 'h3', symbol: 'EUR/USD', name: 'Euro / USD', market: 'forex', quantity: 5000, averageBuyPrice: 1.082 },
      ];
    } catch {
      return [];
    }
  });

  // Modal for new manual holding
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newMarket, setNewMarket] = useState<'crypto' | 'stocks' | 'forex'>('crypto');
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState(100);

  useEffect(() => {
    getPaperAccount(userId).then((acc) => setAccount(acc));
    getPaperOrders(userId).then((ords) => setOrders(ords));
  }, [userId]);

  const saveHoldings = (items: ManualHolding[]) => {
    setManualHoldings(items);
    localStorage.setItem(`marketmind:manual_holdings:${userId || 'guest'}`, JSON.stringify(items));
  };

  const handleAddHolding = () => {
    if (!newSymbol) return;
    const item: ManualHolding = {
      id: `hold_${Date.now()}`,
      symbol: newSymbol.toUpperCase(),
      name: newSymbol.toUpperCase(),
      market: newMarket,
      quantity: Number(newQty),
      averageBuyPrice: Number(newPrice),
    };
    saveHoldings([item, ...manualHoldings]);
    setShowAddModal(false);
    setNewSymbol('');
  };

  const handleRemoveHolding = (id: string) => {
    saveHoldings(manualHoldings.filter((h) => h.id !== id));
  };

  // Allocation data for Chart
  const marketAllocationMap: Record<string, number> = {
    crypto: 0,
    stocks: 0,
    forex: 0,
  };

  manualHoldings.forEach((h) => {
    const val = h.quantity * h.averageBuyPrice;
    marketAllocationMap[h.market] = (marketAllocationMap[h.market] || 0) + val;
  });

  const totalPortfolioValue = Object.values(marketAllocationMap).reduce((a, b) => a + b, 0);

  const pieData = Object.entries(marketAllocationMap)
    .filter(([_, val]) => val > 0)
    .map(([mkt, val]) => ({
      name: mkt.toUpperCase(),
      value: Number(val.toFixed(2)),
      percent: totalPortfolioValue > 0 ? ((val / totalPortfolioValue) * 100).toFixed(1) : 0,
    }));

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-sans">PORTFOLIO MANAGER</h1>
          <p className="text-xs text-slate-400 font-mono">
            Multi-Asset Holdings, Diversification Allocation & Synchronized Paper Trades
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-mono font-bold text-slate-950 hover:bg-emerald-400 transition"
        >
          <Plus size={14} />
          <span>Add Holding</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 font-mono">
        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl">
          <div className="text-slate-400 text-xs">Total Portfolio Value</div>
          <div className="mt-1 text-2xl font-black text-white">
            ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Cross-Asset Aggregation</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl">
          <div className="text-slate-400 text-xs">Paper Trading Cash</div>
          <div className="mt-1 text-2xl font-black text-emerald-400">
            ${account?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '10,000.00'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Simulated Available Liquidity</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl">
          <div className="text-slate-400 text-xs">Total Assets Held</div>
          <div className="mt-1 text-2xl font-black text-cyan-400">
            {manualHoldings.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Stocks, Crypto & Forex</div>
        </div>
      </div>

      {/* Allocation Breakdown and Holdings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Allocation Donut Chart */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-xl space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-white font-mono pb-2 border-b border-slate-800">
            Market Class Diversification
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-xs text-slate-400 font-mono">No holdings recorded</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded border border-slate-700 bg-slate-900 p-2 text-xs font-mono">
                          <div>{d.name}: ${d.value?.toLocaleString()}</div>
                          <div className="text-emerald-400">{d.percent}% of portfolio</div>
                        </div>
                      );
                    }}
                  />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-2 border-t border-slate-800 pt-3">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  ></span>
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <div className="text-slate-400">
                  ${item.value.toLocaleString()} ({item.percent}%)
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 2 Cols: Holdings Table */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-mono text-xs">
            <span className="font-bold text-white uppercase">
              Current Asset Holdings ({manualHoldings.length})
            </span>
            <span className="text-slate-400">Manual & Synchronized Positions</span>
          </div>

          <div className="overflow-x-auto">
            {manualHoldings.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-mono">
                No holdings currently added. Click "Add Holding" to track positions.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                  <tr>
                    <th className="py-2">Asset</th>
                    <th>Class</th>
                    <th>Quantity</th>
                    <th>Avg Cost</th>
                    <th>Total Value</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {manualHoldings.map((h) => {
                    const totalVal = h.quantity * h.averageBuyPrice;
                    return (
                      <tr key={h.id} className="hover:bg-slate-800/30">
                        <td className="py-3 font-bold text-white">{h.symbol}</td>
                        <td>
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] uppercase text-slate-300 font-bold">
                            {h.market}
                          </span>
                        </td>
                        <td className="text-slate-200">{h.quantity}</td>
                        <td className="text-slate-200">${h.averageBuyPrice.toLocaleString()}</td>
                        <td className="text-emerald-400 font-bold">${totalVal.toLocaleString()}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onNavigate('explorer', { symbol: h.symbol, market: h.market })}
                              className="text-slate-400 hover:text-emerald-400"
                              title="Explore"
                            >
                              <ArrowRight size={13} />
                            </button>
                            <button
                              onClick={() => handleRemoveHolding(h.id)}
                              className="text-slate-400 hover:text-rose-400"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
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

      {/* Add Holding Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#0f172a] p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-bold text-white uppercase">Add Manual Holding</span>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400">Asset Symbol</label>
                <input
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. SOL, AAPL, GBP/USD"
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400">Market Class</label>
                <select
                  value={newMarket}
                  onChange={(e) => setNewMarket(e.target.value as any)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                >
                  <option value="crypto">Crypto</option>
                  <option value="stocks">Stocks</option>
                  <option value="forex">Forex</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Avg Buy Price ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded px-3 py-1.5 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddHolding}
                className="rounded bg-emerald-500 px-4 py-1.5 font-bold text-slate-950 hover:bg-emerald-400"
              >
                Save Holding
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
