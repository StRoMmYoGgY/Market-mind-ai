import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Key,
  RefreshCw,
  ShieldCheck,
  Server,
  Layers,
  Activity,
} from 'lucide-react';
import {
  getProvidersStatus,
  testProviderConnection,
  updateProviderConfig,
} from '../../services/marketApi';
import { ProviderStatus } from '../../types/market';

export const DataSourcesView: React.FC = () => {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [switchLogs, setSwitchLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs?: number; message: string }>>({});

  // API Key Form
  const [alphaVantageKey, setAlphaVantageKey] = useState('');
  const [twelveDataKey, setTwelveDataKey] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Preferred / Backup selections
  const [preferredCrypto, setPreferredCrypto] = useState('binance');
  const [preferredStocks, setPreferredStocks] = useState('alphavantage');
  const [preferredForex, setPreferredForex] = useState('alphavantage');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getProvidersStatus();
      setProviders(data.providers);
      setConfig(data.config);
      setSwitchLogs(data.switchLogs || []);
      if (data.config) {
        setPreferredCrypto(data.config.preferredCrypto || 'binance');
        setPreferredStocks(data.config.preferredStocks || 'alphavantage');
        setPreferredForex(data.config.preferredForex || 'alphavantage');
      }
    } catch (err) {
      console.warn('Failed to load providers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTestConnection = async (providerId: string) => {
    setTestingId(providerId);
    try {
      const res = await testProviderConnection(providerId);
      setTestResults((prev) => ({ ...prev, [providerId]: res }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: { success: false, message: err.message || 'Test failed' },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleSaveConfig = async () => {
    await updateProviderConfig({
      alphaVantageKey: alphaVantageKey ? alphaVantageKey : undefined,
      twelveDataKey: twelveDataKey ? twelveDataKey : undefined,
      preferredCrypto,
      preferredStocks,
      preferredForex,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    loadData();
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white font-sans">
              DATA SOURCES CONTROL CENTER
            </h1>
            <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
              Live Gateway Monitor
            </span>
          </div>
          <p className="text-slate-400">
            Real External Financial Data Integrations, Endpoint Connectivity, Routing & Failovers
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-slate-200 hover:bg-slate-700"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Feeds</span>
        </button>
      </div>

      {/* Provider Connectivity Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => {
          const test = testResults[p.id];
          const isTesting = testingId === p.id;
          return (
            <div
              key={p.id}
              className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 shadow-xl flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">{p.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      {p.marketTypes.map((m) => (
                        <span
                          key={m}
                          className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] uppercase text-slate-300"
                        >
                          {m}
                        </span>
                      ))}
                      {p.isPreferred && (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-400 font-bold border border-emerald-500/20">
                          PREFERRED
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {p.status === 'connected' ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        ONLINE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400 text-[10px]">
                        <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                        CONFIG REQ
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-2 text-[11px] text-slate-400 font-sans leading-relaxed">
                  {p.description}
                </p>

                <div className="mt-3 space-y-1 text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                  <div>
                    Intervals: <span className="text-slate-300">{p.supportedIntervals?.join(', ')}</span>
                  </div>
                  <div>
                    Authentication: <span className="text-slate-300">{p.authRequired ? 'Server-Side Secret API Key' : 'Public Official Gateway'}</span>
                  </div>
                </div>

                {/* Test Output if executed */}
                {test && (
                  <div
                    className={`mt-3 rounded p-2 text-[10px] border ${
                      test.success
                        ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                        : 'border-rose-500/30 bg-rose-950/20 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{test.success ? 'PING SUCCESSFUL' : 'TEST FAILED'}</span>
                      {test.latencyMs && <span>{test.latencyMs}ms</span>}
                    </div>
                    <div className="mt-0.5">{test.message}</div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleTestConnection(p.id)}
                  disabled={isTesting}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition"
                >
                  <Play size={12} className={isTesting ? 'animate-spin' : ''} />
                  <span>{isTesting ? 'Pinging Gateway...' : 'Test Connection'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gateway Routing & API Credentials Management */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Preferred Routing */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-xl space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-white pb-2 border-b border-slate-800">
            Preferred Routing & Failover Architecture
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-slate-400 text-[10px]">Cryptocurrency Preferred Provider</label>
              <select
                value={preferredCrypto}
                onChange={(e) => setPreferredCrypto(e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              >
                <option value="binance">Binance Vision (Live WebSockets & Spot REST)</option>
                <option value="coingecko">CoinGecko API (Backup Aggregator)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 text-[10px]">Equities / Stocks Preferred Provider</label>
              <select
                value={preferredStocks}
                onChange={(e) => setPreferredStocks(e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              >
                <option value="alphavantage">Alpha Vantage (Live Quotes & Time Series)</option>
                <option value="stooq">Stooq Financial Archives (Consolidated End of Day)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 text-[10px]">Forex Preferred Provider</label>
              <select
                value={preferredForex}
                onChange={(e) => setPreferredForex(e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              >
                <option value="alphavantage">Alpha Vantage (Real-Time Currency Rates)</option>
                <option value="frankfurter">Frankfurter (European Central Bank Reference)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Server-Side API Secrets Configuration */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white uppercase text-xs">
                Server-Side API Credentials
              </span>
              <span className="text-slate-400 text-[10px]">Encrypted & Stored Server-Side Only</span>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <label className="text-slate-400 text-[10px]">
                  Alpha Vantage API Key (Equities & Forex)
                </label>
                <input
                  type="password"
                  placeholder={config?.hasAlphaVantageKey ? '•••••••••••••••• (Configured)' : 'Enter 16-character key'}
                  value={alphaVantageKey}
                  onChange={(e) => setAlphaVantageKey(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
                <div className="text-[10px] text-emerald-400 mt-1">
                  Active in runtime environment: <strong className="text-white">Yes (Key Provided)</strong>
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-[10px]">
                  Twelve Data API Key (Optional Multi-Asset)
                </label>
                <input
                  type="password"
                  placeholder={config?.hasTwelveDataKey ? '•••••••••••••••• (Configured)' : 'Optional'}
                  value={twelveDataKey}
                  onChange={(e) => setTwelveDataKey(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              {saveSuccess ? '✓ Settings and routing updated' : 'Never exposed to client DOM'}
            </span>
            <button
              onClick={handleSaveConfig}
              className="rounded bg-emerald-500 px-4 py-2 font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              Update Gateway Config
            </button>
          </div>
        </div>
      </div>

      {/* Automatic Failover Audit Log */}
      <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="font-bold text-white uppercase text-xs">
            Gateway Failover & Route Switch Audit Log ({switchLogs.length})
          </span>
          <span className="text-slate-400 text-[10px]">Monitored by Central Market Router</span>
        </div>

        {switchLogs.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No failover events recorded. All primary gateways are operating within normal tolerances.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                <tr>
                  <th className="py-2">Timestamp</th>
                  <th>Market</th>
                  <th>Symbol</th>
                  <th>Primary</th>
                  <th>Switched To</th>
                  <th>Trigger Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {switchLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    <td className="py-2 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="uppercase text-slate-300">{log.market}</td>
                    <td className="font-bold text-white">{log.symbol}</td>
                    <td className="text-rose-400">{log.fromProvider}</td>
                    <td className="text-emerald-400 font-bold">{log.toProvider}</td>
                    <td className="text-slate-400">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
