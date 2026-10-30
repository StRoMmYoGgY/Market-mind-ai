import React, { useState, useEffect } from 'react';
import {
  Compass,
  Search,
  BookmarkPlus,
  BookmarkCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  Sparkles,
  ShieldCheck,
  Wallet,
  Clock,
  Layers,
  Info,
} from 'lucide-react';
import { FinancialChart } from '../FinancialChart';
import {
  getMarketQuote,
  getMarketCandles,
  searchInstruments,
  binanceWS,
} from '../../services/marketApi';
import { addToWatchlist, getWatchlist } from '../../services/firebase';
import { generateTechnicalSnapshot } from '../../services/technicalAnalysis';
import { MarketQuote, Candle, Timeframe, MarketType } from '../../types/market';

interface MarketExplorerViewProps {
  onNavigate: (view: string, instrument?: { symbol: string; market: string }) => void;
  userId: string;
  initialInstrument?: { symbol: string; market: string };
}

export const MarketExplorerView: React.FC<MarketExplorerViewProps> = ({
  onNavigate,
  userId,
  initialInstrument,
}) => {
  const [selectedMarket, setSelectedMarket] = useState<MarketType>(
    (initialInstrument?.market as MarketType) || 'crypto'
  );
  const [selectedSymbol, setSelectedSymbol] = useState(initialInstrument?.symbol || 'BTC');
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [candlesProvider, setCandlesProvider] = useState('');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSavedInWatchlist, setIsSavedInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);

  // Technical snapshot
  const snapshot = generateTechnicalSnapshot(candles);

  // Fetch quote and candles
  const loadMarketData = async (symbol: string, market: MarketType, tf: Timeframe) => {
    setLoading(true);
    try {
      const [q, cRes] = await Promise.all([
        getMarketQuote(symbol, market),
        getMarketCandles(symbol, market, tf, 100),
      ]);
      setQuote(q);
      setCandles(cRes.candles);
      setCandlesProvider(cRes.provider);

      // Check watchlist
      const wList = await getWatchlist(userId);
      setIsSavedInWatchlist(wList.some((w) => w.symbol === symbol && w.market === market));
    } catch (err) {
      console.warn('Market explorer load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketData(selectedSymbol, selectedMarket, timeframe);

    // Live WebSocket connection for Crypto
    let unsub: (() => void) | undefined;
    if (selectedMarket === 'crypto') {
      unsub = binanceWS.subscribe(selectedSymbol, (livePrice) => {
        setQuote((prev) => (prev ? { ...prev, price: livePrice, close: livePrice } : prev));
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
      if (unsub) unsub();
    };
  }, [selectedSymbol, selectedMarket, timeframe]);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim()) {
      const results = await searchInstruments(val);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectInstrument = (item: any) => {
    setSelectedSymbol(item.symbol);
    setSelectedMarket(item.market);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleToggleWatchlist = async () => {
    if (!quote) return;
    await addToWatchlist({
      id: `${userId}_${quote.marketType}_${quote.symbol}_${Date.now()}`,
      userId,
      symbol: quote.symbol,
      name: quote.name,
      market: quote.marketType,
      addedAt: new Date().toISOString(),
    });
    setIsSavedInWatchlist(true);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Top Controls: Market Category Tabs & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-sans">MARKET EXPLORER</h1>
          <p className="text-xs text-slate-400 font-mono">
            Direct institutional feeds across Cryptocurrencies, Equities & Foreign Exchange
          </p>
        </div>

        {/* Market Category Pills */}
        <div className="flex items-center rounded-lg border border-slate-800 bg-[#0c1220] p-1 font-mono text-xs">
          {(['crypto', 'stocks', 'forex'] as MarketType[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setSelectedMarket(m);
                setSelectedSymbol(m === 'crypto' ? 'BTC' : m === 'stocks' ? 'NVDA' : 'EUR/USD');
              }}
              className={`rounded-md px-3 py-1.5 font-bold uppercase transition ${
                selectedMarket === m
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Symbol Search & Popular Tickers Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={`Filter ${selectedMarket} assets (e.g. ${
              selectedMarket === 'crypto' ? 'BTC, ETH, SOL' : selectedMarket === 'stocks' ? 'AAPL, NVDA, SPY' : 'EUR/USD, GBP/USD'
            })...`}
            className="w-full rounded-xl border border-slate-800 bg-[#0c1220] py-2.5 pl-10 pr-4 text-xs font-mono text-slate-200 placeholder-slate-500 focus:border-emerald-500/60 focus:outline-none"
          />
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-12 z-50 rounded-xl border border-slate-700 bg-[#0f172a] p-2 shadow-2xl max-h-64 overflow-y-auto">
            {searchResults.map((item) => (
              <button
                key={`${item.market}-${item.symbol}`}
                onClick={() => handleSelectInstrument(item)}
                className="flex w-full items-center justify-between p-2 rounded hover:bg-slate-800 text-left text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400">{item.symbol}</span>
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 uppercase bg-slate-900 px-1.5 py-0.5 rounded">
                  {item.market}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quote Banner & Verification Metadata */}
      {quote && (
        <div className="rounded-xl border border-slate-800/80 bg-[#0c1220] p-4 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Asset Identity */}
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-white font-mono">{quote.symbol}</h2>
                <span className="text-xs text-slate-400">{quote.name}</span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] uppercase text-slate-300 font-mono">
                  {quote.marketType}
                </span>
                <button
                  onClick={handleToggleWatchlist}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-mono transition ${
                    isSavedInWatchlist
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {isSavedInWatchlist ? <BookmarkCheck size={14} /> : <BookmarkPlus size={14} />}
                  <span>{isSavedInWatchlist ? 'Watchlisted' : 'Watchlist'}</span>
                </button>
              </div>

              {/* Data Freshness & Provider Badges */}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Source: <strong>{quote.provider}</strong>
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">
                  Type:{' '}
                  <strong className="text-slate-300 uppercase">
                    {quote.dataType}
                  </strong>
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">
                  Updated: {new Date(quote.timestamp).toLocaleTimeString()}
                </span>
                {!quote.isTradableInPaper && (
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400 border border-amber-500/20">
                    Reference Rate (Not tradable)
                  </span>
                )}
              </div>
            </div>

            {/* Right: Price & Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-black text-white font-mono">
                  ${quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </div>
                <div
                  className={`text-xs font-mono font-bold ${
                    quote.change24hPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {quote.change24hPercent >= 0 ? '+' : ''}
                  {quote.change24hPercent}% ($
                  {quote.change24h.toFixed(2)})
                </div>
              </div>

              <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
                <button
                  onClick={() => onNavigate('ai-research', { symbol: quote.symbol, market: quote.marketType })}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-xs font-mono font-bold text-emerald-300 hover:bg-emerald-900/40"
                >
                  AI Research
                </button>
                <button
                  onClick={() => onNavigate('paper-trading', { symbol: quote.symbol, market: quote.marketType })}
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-mono font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Paper Trade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Chart */}
      <FinancialChart
        candles={candles}
        symbol={selectedSymbol}
        provider={candlesProvider}
        selectedInterval={timeframe}
        onSelectInterval={setTimeframe}
        height={420}
      />

      {/* Technical Indicators Summary Cards */}
      <div className="rounded-xl border border-slate-800/80 bg-[#0c1220] p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
              Deterministic Technical Analysis Snapshot
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Calculated dynamically via mathematical formulas (Wilder RSI, EMA, Bollinger Bands, ATR)
            </p>
          </div>
          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
            {snapshot.dataSufficiency.candleCount} Candles Analyzed
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 text-xs font-mono">
          {/* Trend Status */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-slate-400 text-[10px] uppercase">Trend Posture</div>
            <div className="mt-1 font-bold text-emerald-400">{snapshot.trend}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{snapshot.maCross}</div>
          </div>

          {/* RSI 14 */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-slate-400 text-[10px] uppercase">RSI (14)</div>
            <div className="mt-1 font-bold text-white">
              {snapshot.rsi14 ? snapshot.rsi14.toFixed(2) : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {(snapshot.rsi14 || 50) > 70 ? 'Overbought' : (snapshot.rsi14 || 50) < 30 ? 'Oversold' : 'Neutral'}
            </div>
          </div>

          {/* MACD */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-slate-400 text-[10px] uppercase">MACD (12, 26, 9)</div>
            <div className="mt-1 font-bold text-white">
              {snapshot.macd ? snapshot.macd.histogram.toFixed(2) : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Signal: {snapshot.macd?.signal.toFixed(2) ?? '0.00'}
            </div>
          </div>

          {/* Bollinger Bandwidth */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-slate-400 text-[10px] uppercase">BB Bandwidth</div>
            <div className="mt-1 font-bold text-white">
              {snapshot.bollingerBands ? `${snapshot.bollingerBands.bandwidth.toFixed(2)}%` : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              %B: {snapshot.bollingerBands?.percentB.toFixed(2) ?? '0.50'}
            </div>
          </div>

          {/* Support Zone */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-slate-400 text-[10px] uppercase">Primary Support</div>
            <div className="mt-1 font-bold text-emerald-400">
              ${snapshot.supportLevels[0]?.toFixed(2) ?? '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Pivot Clustering</div>
          </div>

          {/* Resistance Zone */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-slate-400 text-[10px] uppercase">Primary Resistance</div>
            <div className="mt-1 font-bold text-rose-400">
              ${snapshot.resistanceLevels[0]?.toFixed(2) ?? '—'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Supply Barrier</div>
          </div>
        </div>
      </div>
    </div>
  );
};
