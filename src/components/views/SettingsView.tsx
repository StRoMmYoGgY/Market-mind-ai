import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  ShieldAlert,
  RotateCcw,
  User,
  Key,
  Database,
  Lock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  savePaperAccount,
  getPaperAccount,
  getUserRiskLimits,
  saveUserRiskLimits,
  auth,
} from '../../services/firebase';
import { RiskLimits } from '../../types/trading';
import { DEFAULT_RISK_LIMITS } from '../../services/riskEngine';

interface SettingsViewProps {
  userId: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ userId }) => {
  const [limits, setLimits] = useState<RiskLimits>(DEFAULT_RISK_LIMITS);
  const [resetting, setResetting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [brokerKillSwitch, setBrokerKillSwitch] = useState(true);

  useEffect(() => {
    getUserRiskLimits(userId).then((l) => setLimits(l));
  }, [userId]);

  const handleSaveLimits = async () => {
    await saveUserRiskLimits(userId, limits);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleResetPaperAccount = async () => {
    if (confirm('Are you sure you want to reset your simulated paper trading account to $10,000 USD?')) {
      setResetting(true);
      await savePaperAccount({
        userId,
        balance: 10000,
        initialBalance: 10000,
        currency: 'USD',
        equity: 10000,
        margin: 0,
        freeMargin: 10000,
        marginLevel: 0,
        leverage: 100,
        realizedPnl: 0,
        unrealizedPnl: 0,
        totalReturnPercent: 0,
        winRate: 0,
        totalTrades: 0,
        updatedAt: new Date().toISOString(),
      });
      localStorage.removeItem(`marketmind:orders:${userId || 'guest'}`);
      setResetting(false);
      alert('Paper account balance successfully reset to $10,000.00 USD.');
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto font-mono text-xs">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl sm:text-2xl font-black text-white font-sans">PLATFORM SETTINGS</h1>
        <p className="text-slate-400">
          Account Governance, Risk Thresholds, Brokerage Separation & Sandbox Controls
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Risk Governance */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-white uppercase text-xs">
              Risk Management Safeguards
            </span>
            <button
              onClick={handleSaveLimits}
              className="rounded bg-emerald-500 px-3 py-1 font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              {saveSuccess ? 'Saved ✓' : 'Save Safeguards'}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-[10px]">Max Risk Per Trade (%)</label>
              <input
                type="number"
                step="0.1"
                value={limits.maxRiskPerTradePercent}
                onChange={(e) =>
                  setLimits({ ...limits, maxRiskPerTradePercent: Number(e.target.value) })
                }
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 text-[10px]">Daily Loss Limit ($)</label>
              <input
                type="number"
                value={limits.maxDailyLossAmount}
                onChange={(e) =>
                  setLimits({ ...limits, maxDailyLossAmount: Number(e.target.value) })
                }
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 text-[10px]">Max Drawdown Circuit Breaker (%)</label>
              <input
                type="number"
                step="0.5"
                value={limits.maxDrawdownPercent}
                onChange={(e) =>
                  setLimits({ ...limits, maxDrawdownPercent: Number(e.target.value) })
                }
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 text-[10px]">Max Portfolio Exposure (%)</label>
              <input
                type="number"
                step="5"
                value={limits.maxPortfolioExposurePercent}
                onChange={(e) =>
                  setLimits({ ...limits, maxPortfolioExposurePercent: Number(e.target.value) })
                }
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-white"
              />
            </div>
          </div>
        </div>

        {/* Paper Account Sandbox Management */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white pb-2 border-b border-slate-800">
              Paper Trading Sandbox Reset
            </div>
            <p className="mt-2 text-slate-300 font-sans leading-relaxed text-xs">
              Reset your simulated paper trading capital back to the initial starting baseline of
              $10,000 USD. This resets available cash, realized P&L, and clears paper orders.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Irreversible Action</span>
            <button
              onClick={handleResetPaperAccount}
              disabled={resetting}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/20 px-3.5 py-1.5 font-bold text-rose-300 hover:bg-rose-900/40 transition disabled:opacity-50"
            >
              <RotateCcw size={13} className={resetting ? 'animate-spin' : ''} />
              <span>Reset Sandbox to $10,000</span>
            </button>
          </div>
        </div>

        {/* Future Automated Trading & Broker Isolation */}
        <div className="col-span-1 lg:col-span-2 rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-amber-400" />
              <span className="font-bold text-white uppercase text-xs">
                Future Broker Integration Architecture (Live Real-Money Execution Disabled)
              </span>
            </div>
            <span className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] text-rose-400 font-bold">
              SECURITY LOCK ACTIVE
            </span>
          </div>

          <p className="text-slate-300 font-sans leading-relaxed text-xs">
            Per institutional safety standards (Part 18), all real-money execution is completely
            disabled in this version. The platform operates exclusively with verified market feeds
            and paper trading calculations. Future broker connectivity will require strict MFA
            authentication, verified API keys stored in server vaults, independent risk validation,
            and an instant manual kill switch.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2">
            <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
              <div className="text-slate-400 text-[10px] uppercase">Broker Kill Switch</div>
              <div className="text-emerald-400 font-bold mt-1">ARMED & ACTIVE</div>
            </div>
            <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
              <div className="text-slate-400 text-[10px] uppercase">Real-Money Execution</div>
              <div className="text-rose-400 font-bold mt-1">STRICTLY DISABLED</div>
            </div>
            <div className="rounded-lg bg-slate-900/60 p-3 border border-slate-800">
              <div className="text-slate-400 text-[10px] uppercase">Firestore User Isolation</div>
              <div className="text-emerald-400 font-bold mt-1">ENFORCED (ABAC)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
