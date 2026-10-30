import { Candle, MarketQuote, ProviderStatus, MarketType } from '../types/market';

/**
 * Client-Side Market Data Service
 * Connects to full-stack MarketMind backend and real-time Binance Vision WebSocket
 */

// 1. Fetch unified market quote
export async function getMarketQuote(symbol: string, market: MarketType = 'crypto'): Promise<MarketQuote> {
  const res = await fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}&market=${market}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch quote for ${symbol}`);
  }
  return await res.json();
}

// 2. Fetch market candles
export async function getMarketCandles(
  symbol: string,
  market: MarketType = 'crypto',
  interval: string = '1h',
  limit: number = 100
): Promise<{ candles: Candle[]; provider: string; symbol: string; market: string }> {
  const res = await fetch(
    `/api/market/candles?symbol=${encodeURIComponent(symbol)}&market=${market}&interval=${interval}&limit=${limit}`
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch candles for ${symbol}`);
  }
  return await res.json();
}

// 3. Fetch comprehensive market overview
export async function getMarketOverview(): Promise<{
  crypto: MarketQuote[];
  forex: MarketQuote[];
  stocks: MarketQuote[];
  timestamp: number;
}> {
  const res = await fetch('/api/market/overview');
  if (!res.ok) {
    throw new Error('Failed to fetch market overview');
  }
  return await res.json();
}

// 4. Search financial instruments
export async function searchInstruments(query: string = '') {
  const res = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error('Failed to search instruments');
  }
  return await res.json();
}

// 5. Providers status & configuration
export async function getProvidersStatus(): Promise<{
  providers: ProviderStatus[];
  config: any;
  switchLogs: any[];
  timestamp: number;
}> {
  const res = await fetch('/api/market/providers');
  if (!res.ok) {
    throw new Error('Failed to fetch provider status');
  }
  return await res.json();
}

export async function testProviderConnection(providerId: string): Promise<{
  success: boolean;
  latencyMs?: number;
  message: string;
}> {
  const res = await fetch('/api/market/providers/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId }),
  });
  return await res.json();
}

export async function updateProviderConfig(config: {
  alphaVantageKey?: string;
  twelveDataKey?: string;
  preferredCrypto?: string;
  preferredStocks?: string;
  preferredForex?: string;
}) {
  const res = await fetch('/api/market/providers/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return await res.json();
}

// 6. Gemini AI Research Desk API
export async function requestAIResearch(params: {
  symbol: string;
  market: MarketType;
  currentPrice: number;
  indicators: any;
  timeframe: string;
  userQuery?: string;
}) {
  const res = await fetch('/api/ai/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'AI research request failed');
  }
  return await res.json();
}

// 7. Gemini AI Journal Review API
export async function requestAIJournalReview(trades: any[]) {
  const res = await fetch('/api/ai/journal-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trades }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'AI journal review failed');
  }
  return await res.json();
}

// 8. Gemini AI Macro Summary
export async function requestAIMarketSummary(marketOverview: any) {
  const res = await fetch('/api/ai/market-summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ marketOverview }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'AI market summary failed');
  }
  return await res.json();
}

// 9. Real-Time Binance Vision WebSocket Client
type PriceCallback = (price: number, symbol: string) => void;

class BinanceWebSocketStream {
  private ws: WebSocket | null = null;
  private subscribers = new Map<string, Set<PriceCallback>>();
  private isConnecting = false;
  private reconnectTimer: any = null;

  subscribe(symbol: string, cb: PriceCallback) {
    const clean = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
    const streamSymbol = clean.endsWith('usdt') ? clean : `${clean}usdt`;

    if (!this.subscribers.has(streamSymbol)) {
      this.subscribers.set(streamSymbol, new Set());
    }
    this.subscribers.get(streamSymbol)!.add(cb);

    this.ensureConnection();

    return () => {
      const set = this.subscribers.get(streamSymbol);
      if (set) {
        set.delete(cb);
        if (set.size === 0) {
          this.subscribers.delete(streamSymbol);
        }
      }
    };
  }

  private ensureConnection() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      // Connect to Binance Vision public WebSocket
      const endpoint = 'wss://data-stream.binance.vision:443/ws';
      this.ws = new WebSocket(endpoint);

      this.ws.onopen = () => {
        this.isConnecting = false;
        // Subscribe to all currently registered symbols
        const streams = Array.from(this.subscribers.keys()).map((s) => `${s}@ticker`);
        if (streams.length > 0) {
          const payload = {
            method: 'SUBSCRIBE',
            params: streams,
            id: Date.now(),
          };
          this.ws?.send(JSON.stringify(payload));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.s && data.c) {
            const sym = data.s.toLowerCase();
            const price = parseFloat(data.c);
            const callbacks = this.subscribers.get(sym);
            if (callbacks) {
              callbacks.forEach((cb) => cb(price, data.s));
            }
          }
        } catch {
          // ignore
        }
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        // Reconnect after 3 seconds if active subscribers exist
        if (this.subscribers.size > 0 && !this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.ensureConnection();
          }, 3000);
        }
      };
    } catch {
      this.isConnecting = false;
    }
  }
}

export const binanceWS = new BinanceWebSocketStream();
