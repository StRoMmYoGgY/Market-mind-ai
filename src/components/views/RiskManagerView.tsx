import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Calculator,
  ArrowRight,
  AlertTriangle,
  Info,
  DollarSign,
  Percent,
  Sliders,
  CheckCircle,
} from 'lucide-react';
import { calculateRisk, DEFAULT_RISK_LIMITS } from '../../services/riskEngine';
import { getUserRiskLimits, saveUserRiskLimits, getPaperAccount } from '../../services/firebase';
import { getMarketQuote } from '../../services/marketApi';
import { RiskLimits, OrderSide } from '../../types/trading';

interface RiskManagerViewProps {
  onNavigate: (view: string, instrument?: { symbol: string; market: string; size?: number; stopLoss?: number; takeProfit?: number }) => void;
  userId: string;
  initialInstrument?: { symbol: string; market: string };
}

export const RiskManagerView: React.FC<RiskManagerViewProps> = ({
  onNavigate,
  userId,
  initialInstrument,
}) => {
  const [symbol, setSymbol] = useState(initialInstrument?.symbol || 'BTC');
  const [market, setMarket] = useState(initialInstrument?.market || 'crypto');
  const [accountBalance, setAccountBalance] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1.5);
  const [entryPrice, setEntryPrice] = useState(64000);
  const [stopLossPrice, setStopLossPrice] = useState(62500);
  const [takeProfitPrice, setTakeProfitPrice] = useState(68000);
  const [side, setSide] = useState<OrderSide>('BUY');

  // Configurable Institutional Limits
  const [limits, setLimits] = useState<RiskLimits>(DEFAULT_RISK_LIMITS);
  const [showConfig, setShowConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load account balance & user risk limits
  useEffect(() => {
    getPaperAccount(userId).then((acc) => {
      if (acc && acc.balance > 0) setAccountBalance(acc.balance);
    });
    getUserRiskLimits(userId).then((l) => setLimits(l));

    // Fetch current price for symbol
    getMarketQuote(symbol, market as any)
      .then((q) => {
        setEntryPrice(q.price);
        if (side === 'BUY') {
          setStopLossPrice(Number((q.price * 0.975).toFixed(2)));
          setTakeProfitPrice(Number((q.price * 1.05).toFixed(2)));
        } else {
          setStopLossPrice(Number((q.price * 1.025).toFixed(2)));
          setTakeProfitPrice(Number((q.price * 0.95).toFixed(2)));
        }
      })
      .catch(() => {});
  }, [symbol, market, userId]);

  // Real calculation
  const calc = calculateRisk(
    {
      accountBalance,
      riskPercentage: riskPercent,
      entryPrice,
      stopLossPrice,
      takeProfitPrice,
      side,
    },
    limits
  );

  const handleSaveLimits = async () => {
    await saveUserRiskLimits(userId, limits);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSendToTrade = () => {
    onNavigate('paper-trading', {
      symbol,
      market,
      size: calc.positionSize,
      stopLoss: stopLossPrice,
      takeProfit: takeProfitPrice,
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white font-sans">
              INSTITUTIONAL RISK MANAGER
            </h1>
            <span className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] font-mono text-rose-400">
              Zero-Capital Loss Guard
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Deterministic Position Sizing, Monetary Capital-at-Risk & Portfolio Boundary Enforcement
          </p>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-mono font-medium text-slate-200 hover:bg-slate-700 transition"
        >
          <Sliders size={13} />
          <span>{showConfig ? 'Hide Governance Limits' : 'Configure Risk Limits'}</span>
        </button>
      </div>

      {/* Governance Settings (Collapsible) */}
      {showConfig && (
        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white font-mono uppercase">
              Configurable Institutional Limits
            </span>
            <button
              onClick={handleSaveLimits}
              className="flex items-center gap-1.5 rounded bg-emerald-500 px-3 py-1 text-xs font-mono font-bold text-slate-950 hover:bg-emerald-400"
            >
              {saveSuccess ? <CheckCircle size={13} /> : null}
              <span>{saveSuccess ? 'Saved to Cloud' : 'Save Limits'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 font-mono text-xs">
            <div>
              <label className="text-slate-400 text-[10px]">Max Risk Per Trade (%)</label>
              <input
                type="number"
                step="0.5"
                value={limits.maxRiskPerTradePercent}
                onChange={(e) =>
                  setLimits({ ...limits, maxRiskPerTradePercent: Number(e.target.value) })
                }
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 text-[10px]">Max Daily Loss ($)</label>
              <input
                type="number"
                value={limits.maxDailyLossAmount}
                onChange={(e) =>
                  setLimits({ ...limits, maxDailyLossAmount: Number(e.target.value) })
                }
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 text-[10px]">Max Drawdown (%)</label>
              <input
                type="number"
                step="1"
                value={limits.maxDrawdownPercent}
                onChange={(e) =>
                  setLimits({ ...limits, maxDrawdownPercent: Number(e.target.value) })
                }
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 text-[10px]">Max Exposure (%)</label>
              <input
                type="number"
                step="5"
                value={limits.maxPortfolioExposurePercent}
                onChange={(e) =>
                  setLimits({ ...limits, maxPortfolioExposurePercent: Number(e.target.value) })
                }
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Risk Calculator Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Input Variables */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-xl space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-white font-mono pb-2 border-b border-slate-800">
            Trade Sizing Parameters
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            {/* Symbol */}
            <div>
              <label className="text-slate-400 text-[10px]">Asset Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white font-bold"
              />
            </div>

            {/* Direction */}
            <div>
              <label className="text-slate-400 text-[10px]">Direction</label>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={() => {
                    setSide('BUY');
                    setStopLossPrice(Number((entryPrice * 0.975).toFixed(2)));
                    setTakeProfitPrice(Number((entryPrice * 1.05).toFixed(2)));
                  }}
                  className={`flex-1 rounded py-2 text-xs font-bold transition ${
                    side === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  LONG (BUY)
                </button>
                <button
                  onClick={() => {
                    setSide('SELL');
                    setStopLossPrice(Number((entryPrice * 1.025).toFixed(2)));
                    setTakeProfitPrice(Number((entryPrice * 0.95).toFixed(2)));
                  }}
                  className={`flex-1 rounded py-2 text-xs font-bold transition ${
                    side === 'SELL'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  SHORT (SELL)
                </button>
              </div>
            </div>

            {/* Account Capital */}
            <div>
              <label className="text-slate-400 text-[10px]">Account Balance ($)</label>
              <input
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(Number(e.target.value))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </div>

            {/* Risk Percentage */}
            <div>
              <label className="text-slate-400 text-[10px]">Risk Per Trade (%)</label>
              <input
                type="number"
                step="0.1"
                value={riskPercent}
                onChange={(e) => setRiskPercent(Number(e.target.value))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </div>

            {/* Entry Price */}
            <div>
              <label className="text-slate-400 text-[10px]">Entry Price ($)</label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Number(e.target.value))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              />
            </div>

            {/* Stop Loss */}
            <div>
              <label className="text-slate-400 text-[10px]">Stop-Loss Price ($)</label>
              <input
                type="number"
                step="any"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(Number(e.target.value))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white font-bold text-rose-400"
              />
            </div>

            {/* Take Profit */}
            <div className="col-span-2">
              <label className="text-slate-400 text-[10px]">Take-Profit Target ($)</label>
              <input
                type="number"
                step="any"
                value={takeProfitPrice}
                onChange={(e) => setTakeProfitPrice(Number(e.target.value))}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white font-bold text-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Right: Calculated Risk Output & Boundary Validation */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-mono text-xs">
              <span className="font-bold text-white uppercase">Quantitative Sizing Output</span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                  calc.isRiskExceeded
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {calc.isRiskExceeded ? 'LIMIT BREACHED' : 'PARAMETERS COMPLIANT'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs">
              {/* Monetary Risk */}
              <div className="rounded-lg bg-slate-900/80 p-3 border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Monetary Risk ($)</div>
                <div className="mt-1 text-xl font-black text-rose-400">
                  ${calc.monetaryRisk.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Exact max loss if stopped out
                </div>
              </div>

              {/* Recommended Position Size */}
              <div className="rounded-lg bg-slate-900/80 p-3 border border-emerald-500/30">
                <div className="text-slate-400 text-[10px] uppercase">Calculated Position Size</div>
                <div className="mt-1 text-xl font-black text-emerald-400">
                  {calc.positionSize.toLocaleString()} <span className="text-xs font-normal text-slate-400">units</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Size = Risk / Distance
                </div>
              </div>

              {/* Total Exposure */}
              <div className="rounded-lg bg-slate-900/80 p-3 border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Gross Capital Exposure</div>
                <div className="mt-1 text-base font-bold text-white">
                  ${calc.totalExposure.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {calc.exposurePercent}% of account
                </div>
              </div>

              {/* Risk-Reward */}
              <div className="rounded-lg bg-slate-900/80 p-3 border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase">Risk-To-Reward Ratio</div>
                <div
                  className={`mt-1 text-base font-bold ${
                    calc.riskToRewardRatio >= 1.5 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {calc.riskToRewardRatio > 0 ? `${calc.riskToRewardRatio}:1` : 'N/A'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Profit: +${calc.potentialProfit.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Warnings Alert Box */}
            {calc.warnings.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs font-mono space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <AlertTriangle size={14} />
                  <span>Institutional Risk Warnings</span>
                </div>
                {calc.warnings.map((w, idx) => (
                  <div key={idx} className="text-slate-300 text-[11px]">
                    • {w}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action: Send to Paper Trade */}
          <button
            onClick={handleSendToTrade}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-xs font-mono font-bold text-slate-950 hover:bg-emerald-400 transition"
          >
            <span>Transfer Sized Order to Paper Trading Sandbox</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
