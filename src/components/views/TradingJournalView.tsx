import React, { useState, useEffect } from 'react';
import {
  BookOpenText,
  Plus,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Brain,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
} from 'lucide-react';
import { getTradingJournals, saveTradingJournal } from '../../services/firebase';
import { requestAIJournalReview } from '../../services/marketApi';
import { TradingJournalEntry } from '../../types/trading';

interface TradingJournalViewProps {
  userId: string;
}

export const TradingJournalView: React.FC<TradingJournalViewProps> = ({ userId }) => {
  const [journals, setJournals] = useState<TradingJournalEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loadingAiReview, setLoadingAiReview] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  // New Journal Form
  const [symbol, setSymbol] = useState('BTC');
  const [market, setMarket] = useState<'crypto' | 'stocks' | 'forex'>('crypto');
  const [approach, setApproach] = useState<'Day Trading' | 'Swing Trading' | 'Long-term'>('Swing Trading');
  const [strategy, setStrategy] = useState('EMA 9/21 Momentum Pullback');
  const [entryPrice, setEntryPrice] = useState(64500);
  const [exitPrice, setExitPrice] = useState(67200);
  const [stopLoss, setStopLoss] = useState(63200);
  const [takeProfit, setTakeProfit] = useState(67500);
  const [plannedRisk, setPlannedRisk] = useState(150);
  const [actualResult, setActualResult] = useState(405);
  const [rationale, setRationale] = useState('Clean 4H consolidation above 21 EMA with bullish divergence on RSI.');
  const [behavioralNotes, setBehavioralNotes] = useState('Calm entry, did not chase the initial candle breakout.');
  const [mistakes, setMistakes] = useState('Could have trailed stop slightly tighter after hitting 1.5R target.');
  const [lessonsLearned, setLessonsLearned] = useState('Patience on retests yields superior mathematical expectancy.');

  const loadJournals = async () => {
    const list = await getTradingJournals(userId);
    setJournals(list);
  };

  useEffect(() => {
    loadJournals();
  }, [userId]);

  const handleSaveEntry = async () => {
    const entry: TradingJournalEntry = {
      id: `journal_${Date.now()}`,
      userId,
      symbol: symbol.toUpperCase(),
      market,
      approach,
      strategy,
      entryPrice: Number(entryPrice),
      exitPrice: exitPrice ? Number(exitPrice) : undefined,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
      plannedRisk: Number(plannedRisk),
      actualResult: actualResult !== undefined ? Number(actualResult) : undefined,
      tradeRationale: rationale,
      behavioralNotes,
      mistakes,
      lessonsLearned,
      createdAt: new Date().toISOString(),
    };

    await saveTradingJournal(entry);
    setJournals([entry, ...journals]);
    setShowAddModal(false);
  };

  const handleRunAiPsychReview = async () => {
    if (journals.length === 0) return;
    setLoadingAiReview(true);
    try {
      const res = await requestAIJournalReview(journals);
      setAiAnalysis(res);
    } catch (err) {
      console.warn('AI review error:', err);
    } finally {
      setLoadingAiReview(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white font-sans">
              TRADING JOURNAL & PSYCHOLOGY
            </h1>
            <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
              Discipline & Rationale Tracking
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Persistent Trade Reflections, Execution Mistake Audits & Gemini AI Behavioral Analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAiPsychReview}
            disabled={loadingAiReview || journals.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-950/20 px-3.5 py-1.5 text-xs font-mono font-bold text-purple-300 hover:bg-purple-900/30 disabled:opacity-50 transition"
          >
            <Sparkles size={14} className={loadingAiReview ? 'animate-spin' : ''} />
            <span>{loadingAiReview ? 'Reviewing Journal...' : 'AI Behavioral Audit'}</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-mono font-bold text-slate-950 hover:bg-emerald-400 transition"
          >
            <Plus size={14} />
            <span>Log Trade Entry</span>
          </button>
        </div>
      </div>

      {/* AI Behavioral Audit Banner */}
      {aiAnalysis && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-5 shadow-xl space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
            <div className="flex items-center gap-2 text-purple-300 font-bold uppercase">
              <Brain size={16} />
              <span>Gemini Chief Risk Officer & Behavioral Review</span>
            </div>
            <span className="text-[10px] text-purple-400">Pattern Synthesis</span>
          </div>

          <p className="text-slate-200 leading-relaxed font-sans text-xs">
            {aiAnalysis.overallAssessment}
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
            <div className="rounded-lg bg-slate-900/60 p-3 border border-purple-500/20">
              <div className="text-rose-400 font-bold mb-1 uppercase text-[10px]">
                Detected Execution Inefficiencies
              </div>
              <ul className="space-y-1 text-slate-300 text-[11px]">
                {aiAnalysis.recurringMistakes?.map((m: string, i: number) => (
                  <li key={i}>• {m}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg bg-slate-900/60 p-3 border border-purple-500/20">
              <div className="text-emerald-400 font-bold mb-1 uppercase text-[10px]">
                Actionable Behavioral Improvements
              </div>
              <ul className="space-y-1 text-slate-300 text-[11px]">
                {aiAnalysis.actionableRecommendations?.map((a: string, i: number) => (
                  <li key={i}>• {a}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Journal Entries List */}
      <div className="space-y-4">
        {journals.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-12 text-center text-xs font-mono text-slate-400">
            No journal entries recorded yet. Click "Log Trade Entry" to reflect on your trades and enable AI psychological pattern recognition.
          </div>
        ) : (
          journals.map((entry) => {
            const isProfit = (entry.actualResult || 0) >= 0;
            return (
              <div
                key={entry.id}
                className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-xl space-y-3 font-mono text-xs transition hover:border-slate-700"
              >
                {/* Header: Symbol, Strategy, Date, P&L */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-bold text-white">{entry.symbol}</span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase text-slate-300">
                      {entry.market}
                    </span>
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                      {entry.approach}
                    </span>
                    <span className="text-slate-400">• Strategy: {entry.strategy}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[11px]">
                      {new Date(entry.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {entry.actualResult !== undefined && (
                      <span
                        className={`font-bold text-sm ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isProfit ? '+' : ''}${entry.actualResult.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Numerical Execution Metrics */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                  <div>
                    <span className="text-slate-400">Entry:</span>{' '}
                    <strong className="text-white">${entry.entryPrice}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Exit:</span>{' '}
                    <strong className="text-white">${entry.exitPrice || 'Open'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Stop-Loss:</span>{' '}
                    <strong className="text-rose-400">${entry.stopLoss || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Take-Profit:</span>{' '}
                    <strong className="text-emerald-400">${entry.takeProfit || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Planned Risk:</span>{' '}
                    <strong className="text-slate-200">${entry.plannedRisk}</strong>
                  </div>
                </div>

                {/* Qualitative Reflections */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1 font-sans text-xs">
                  <div>
                    <div className="font-mono text-[10px] uppercase text-slate-400 font-bold">
                      Trade Rationale & Premise
                    </div>
                    <p className="mt-1 text-slate-200 leading-relaxed">{entry.tradeRationale}</p>
                  </div>

                  <div>
                    <div className="font-mono text-[10px] uppercase text-slate-400 font-bold">
                      Emotional & Behavioral State
                    </div>
                    <p className="mt-1 text-slate-200 leading-relaxed">{entry.behavioralNotes}</p>
                  </div>

                  {entry.mistakes && (
                    <div>
                      <div className="font-mono text-[10px] uppercase text-rose-400 font-bold">
                        Mistakes & Flaws
                      </div>
                      <p className="mt-1 text-slate-300 leading-relaxed">{entry.mistakes}</p>
                    </div>
                  )}

                  {entry.lessonsLearned && (
                    <div>
                      <div className="font-mono text-[10px] uppercase text-emerald-400 font-bold">
                        Lessons Learned
                      </div>
                      <p className="mt-1 text-slate-300 leading-relaxed">{entry.lessonsLearned}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Log Trade Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-[#0f172a] p-5 shadow-2xl space-y-4 font-mono text-xs my-8">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-bold text-white uppercase">New Journal Entry</span>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">Symbol</label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Market</label>
                  <select
                    value={market}
                    onChange={(e) => setMarket(e.target.value as any)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                  >
                    <option value="crypto">Crypto</option>
                    <option value="stocks">Stocks</option>
                    <option value="forex">Forex</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Approach</label>
                  <select
                    value={approach}
                    onChange={(e) => setApproach(e.target.value as any)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                  >
                    <option value="Day Trading">Day Trading</option>
                    <option value="Swing Trading">Swing Trading</option>
                    <option value="Long-term">Long-Term</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400">Strategy Setup Name</label>
                <input
                  type="text"
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">Entry ($)</label>
                  <input
                    type="number"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Exit ($)</label>
                  <input
                    type="number"
                    value={exitPrice}
                    onChange={(e) => setExitPrice(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Planned Risk ($)</label>
                  <input
                    type="number"
                    value={plannedRisk}
                    onChange={(e) => setPlannedRisk(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Net Result ($)</label>
                  <input
                    type="number"
                    value={actualResult}
                    onChange={(e) => setActualResult(Number(e.target.value))}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400">Trade Rationale</label>
                <textarea
                  rows={2}
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white font-sans text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400">Emotional / Behavioral State</label>
                <textarea
                  rows={2}
                  value={behavioralNotes}
                  onChange={(e) => setBehavioralNotes(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white font-sans text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-rose-400">Mistakes</label>
                  <input
                    type="text"
                    value={mistakes}
                    onChange={(e) => setMistakes(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white font-sans text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-emerald-400">Lessons Learned</label>
                  <input
                    type="text"
                    value={lessonsLearned}
                    onChange={(e) => setLessonsLearned(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white font-sans text-xs"
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
                onClick={handleSaveEntry}
                className="rounded bg-emerald-500 px-4 py-1.5 font-bold text-slate-950 hover:bg-emerald-400"
              >
                Log Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
