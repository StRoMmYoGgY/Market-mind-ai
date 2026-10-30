import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Sparkles,
  Send,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Compass,
  AlertTriangle,
  CheckCircle2,
  BookmarkPlus,
  RefreshCw,
} from 'lucide-react';
import { getMarketQuote, getMarketCandles, requestAIResearch } from '../../services/marketApi';
import { generateTechnicalSnapshot } from '../../services/technicalAnalysis';
import { AIResearchReport, MarketType } from '../../types/market';

interface AiResearchViewProps {
  onNavigate: (view: string, instrument?: { symbol: string; market: string }) => void;
  initialInstrument?: { symbol: string; market: string };
}

export const AiResearchView: React.FC<AiResearchViewProps> = ({
  onNavigate,
  initialInstrument,
}) => {
  const [symbol, setSymbol] = useState(initialInstrument?.symbol || 'BTC');
  const [market, setMarket] = useState<MarketType>(
    (initialInstrument?.market as MarketType) || 'crypto'
  );
  const [timeframe, setTimeframe] = useState('1h');
  const [userQuery, setUserQuery] = useState(
    'Evaluate technical posture, bullish/bearish scenario probabilities, and invalidation levels.'
  );

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AIResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch verified quote and candles
      const [quote, candlesData] = await Promise.all([
        getMarketQuote(symbol, market),
        getMarketCandles(symbol, market, timeframe, 80),
      ]);

      // 2. Deterministically calculate technical indicators
      const technicalSnapshot = generateTechnicalSnapshot(candlesData.candles);

      // 3. Send verified context to Gemini Research Desk
      const aiReport = await requestAIResearch({
        symbol: quote.symbol,
        market: quote.marketType,
        currentPrice: quote.price,
        indicators: technicalSnapshot,
        timeframe,
        userQuery,
      });

      setReport(aiReport);
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI research report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, [symbol, market]);

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white font-sans">
              AI RESEARCH DESK
            </h1>
            <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
              Gemini 3.8 Flash
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Quantitative Research Workspace • Verified Market Feeds & Deterministic Math
          </p>
        </div>

        <button
          onClick={() => onNavigate('paper-trading', { symbol, market })}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold font-mono text-slate-950 hover:bg-emerald-400 transition"
        >
          <span>Trade {symbol}</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Asset Selection & Prompt Config */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Symbol */}
          <div>
            <label className="text-[11px] font-mono text-slate-400">Instrument Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. BTC, NVDA, EUR/USD"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Market */}
          <div>
            <label className="text-[11px] font-mono text-slate-400">Market Category</label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value as MarketType)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="crypto">Cryptocurrency (Binance Vision Spot)</option>
              <option value="stocks">US Equities (Alpha Vantage / Stooq)</option>
              <option value="forex">Foreign Exchange (Frankfurter ECB / Alpha Vantage)</option>
            </select>
          </div>

          {/* Timeframe */}
          <div>
            <label className="text-[11px] font-mono text-slate-400">Evaluation Horizon</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="15m">15m (Intraday Scalp)</option>
              <option value="1h">1h (Day Trading)</option>
              <option value="4h">4h (Swing Setup)</option>
              <option value="1d">1d (Macro Horizon)</option>
            </select>
          </div>
        </div>

        {/* Custom Analyst Prompt */}
        <div>
          <label className="text-[11px] font-mono text-slate-400">
            Research Prompt & Specific Objectives
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Ask questions about key levels, catalyst risk, or invalidation triggers..."
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
            />
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-mono font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              <Sparkles size={14} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Analyzing...' : 'Execute Research'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs font-mono text-rose-300">
          {error}
        </div>
      )}

      {/* Structured Institutional Research Report */}
      {report && (
        <div className="space-y-6">
          {/* Header Card: Asset Verification & Trend */}
          <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-white font-mono">{report.asset}</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 font-mono uppercase">
                    {report.market}
                  </span>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400 font-mono">
                    Trend: {report.trend}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400 font-mono">
                  Verified Price: <strong className="text-white">${report.latestPrice.toLocaleString()}</strong> • Timestamp: {new Date(report.timestamp).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400">
                  Data Grounding: <strong className="text-emerald-400">Verified</strong>
                </span>
              </div>
            </div>

            {/* Technical Interpretation */}
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Technical Synthesis
              </h4>
              <p className="mt-1 text-xs text-slate-200 leading-relaxed font-sans">
                {report.technicalInterpretation}
              </p>
            </div>
          </div>

          {/* Bullish vs Bearish Scenario Matrices */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Bullish Hypothesis */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-5 shadow-xl">
              <div className="flex items-center gap-2 pb-3 border-b border-emerald-500/20">
                <TrendingUp size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-300 font-mono uppercase tracking-wider">
                  Bullish Scenario (Confluence Target)
                </h3>
              </div>
              <p className="mt-3 text-xs text-slate-200 leading-relaxed font-sans">
                {report.bullishScenario}
              </p>
              <div className="mt-4 rounded-lg bg-slate-900/60 p-3 border border-emerald-500/20 text-xs font-mono">
                <div className="text-slate-400">Key Resistance Ceiling:</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">
                  ${report.supportResistance?.resistance?.toFixed(2) ?? 'N/A'}
                </div>
              </div>
            </div>

            {/* Bearish Hypothesis */}
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/10 p-5 shadow-xl">
              <div className="flex items-center gap-2 pb-3 border-b border-rose-500/20">
                <TrendingDown size={18} className="text-rose-400" />
                <h3 className="text-sm font-bold text-rose-300 font-mono uppercase tracking-wider">
                  Bearish Scenario (Invalidation & Downside)
                </h3>
              </div>
              <p className="mt-3 text-xs text-slate-200 leading-relaxed font-sans">
                {report.bearishScenario}
              </p>
              <div className="mt-4 rounded-lg bg-slate-900/60 p-3 border border-rose-500/20 text-xs font-mono">
                <div className="text-slate-400">Key Demand Floor:</div>
                <div className="text-base font-bold text-rose-400 mt-0.5">
                  ${report.supportResistance?.support?.toFixed(2) ?? 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Tactical Execution Triggers */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Potential Entry Conditions */}
            <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <h4 className="text-xs font-bold uppercase text-white font-mono">
                  Potential Entry Conditions
                </h4>
              </div>
              <p className="mt-2 text-xs text-slate-300 font-sans leading-relaxed">
                {report.potentialEntry}
              </p>
            </div>

            {/* Invalidation Trigger */}
            <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <AlertTriangle size={16} className="text-amber-400" />
                <h4 className="text-xs font-bold uppercase text-white font-mono">
                  Strict Invalidation Criteria
                </h4>
              </div>
              <p className="mt-2 text-xs text-slate-300 font-sans leading-relaxed">
                {report.invalidation}
              </p>
            </div>
          </div>

          {/* Risk Considerations & Institutional Caveats */}
          <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-xl space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Risk Management Considerations
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-300 font-mono">
                {report.riskConsiderations?.map((rc, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{rc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400 font-mono space-y-1">
              <div>
                <strong>Model Limitations:</strong> {report.limitations}
              </div>
              <div>
                <strong>Data Sources:</strong> {report.sources?.join(', ') || 'Internal Market Feed'}
              </div>
              <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
                {report.disclaimer}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
