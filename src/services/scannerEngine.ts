import { MarketType, ScannerResult } from '../types/market';
import { getMarketQuote, getMarketCandles } from './marketApi';
import { generateTechnicalSnapshot } from './technicalAnalysis';

export const SCANNER_UNIVERSE: Array<{ symbol: string; name: string; market: MarketType }> = [
  // Crypto
  { symbol: 'BTC', name: 'Bitcoin', market: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', market: 'crypto' },
  { symbol: 'SOL', name: 'Solana', market: 'crypto' },
  { symbol: 'BNB', name: 'BNB Chain', market: 'crypto' },
  { symbol: 'AVAX', name: 'Avalanche', market: 'crypto' },
  { symbol: 'LINK', name: 'Chainlink', market: 'crypto' },
  // Stocks
  { symbol: 'NVDA', name: 'NVIDIA Corp.', market: 'stocks' },
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'stocks' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', market: 'stocks' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', market: 'stocks' },
  { symbol: 'TSLA', name: 'Tesla Inc.', market: 'stocks' },
  { symbol: 'SPY', name: 'S&P 500 ETF', market: 'stocks' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', market: 'stocks' },
  // Forex
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', market: 'forex' },
  { symbol: 'GBP/USD', name: 'Pound / US Dollar', market: 'forex' },
  { symbol: 'USD/JPY', name: 'Dollar / Yen', market: 'forex' },
  { symbol: 'AUD/USD', name: 'Aussie / US Dollar', market: 'forex' },
];

/**
 * Scans instruments across markets, calculates real technical indicators,
 * and categorizes setups according to Day Trading, Swing Trading, and Long-Term profiles.
 */
export async function runOpportunityScan(
  selectedMarket: 'all' | MarketType = 'all',
  selectedProfile: 'all' | 'day' | 'swing' | 'long_term' = 'all'
): Promise<ScannerResult[]> {
  const filteredUniverse = SCANNER_UNIVERSE.filter(
    (item) => selectedMarket === 'all' || item.market === selectedMarket
  );

  const results: ScannerResult[] = [];

  for (const item of filteredUniverse) {
    try {
      const [quote, candlesData] = await Promise.all([
        getMarketQuote(item.symbol, item.market).catch(() => null),
        getMarketCandles(item.symbol, item.market, '1h', 50).catch(() => ({ candles: [], provider: 'Engine' })),
      ]);

      if (!quote) continue;

      const snapshot = generateTechnicalSnapshot(candlesData.candles);
      const price = quote.price;
      const rsi = snapshot.rsi14 || 50;
      const trend = snapshot.trend;
      const macdHist = snapshot.macd?.histogram || 0;
      const macdStatus = macdHist > 0 ? 'Bullish' : macdHist < 0 ? 'Bearish' : 'Neutral';
      const support = snapshot.supportLevels[0] || price * 0.97;
      const resistance = snapshot.resistanceLevels[0] || price * 1.03;

      // 1. Day Trading Evaluation
      if (selectedProfile === 'all' || selectedProfile === 'day') {
        const isHighVol = snapshot.volatilityPercent > 1.2 || Math.abs(quote.change24hPercent) > 1.5;
        const isMomentum = (snapshot.ema9 || 0) > (snapshot.ema21 || 0) && rsi > 52 && rsi < 75;

        if (isHighVol && isMomentum) {
          results.push({
            symbol: item.symbol,
            name: item.name,
            market: item.market,
            price,
            change24hPercent: quote.change24hPercent,
            volume: quote.volume,
            trend,
            rsi: Number(rsi.toFixed(1)),
            macdStatus,
            setupTitle: 'Intraday Momentum Expansion',
            setupDescription: `EMA 9/21 aligned with active volume surge. Testing dynamic resistance at $${resistance.toFixed(2)}.`,
            invalidationLevel: Number((price * 0.985).toFixed(2)),
            riskLevel: 'Medium',
            profile: 'day',
            timestamp: Date.now(),
            provider: quote.provider,
          });
        }
      }

      // 2. Swing Trading Evaluation
      if (selectedProfile === 'all' || selectedProfile === 'swing') {
        // Bullish Pullback or MACD Cross
        const isPullbackBuy = (trend === 'Bullish' || trend === 'Strong Bullish') && rsi >= 40 && rsi <= 56;
        const isBreakout = price >= resistance * 0.995 && macdStatus === 'Bullish';

        if (isPullbackBuy || isBreakout) {
          results.push({
            symbol: item.symbol,
            name: item.name,
            market: item.market,
            price,
            change24hPercent: quote.change24hPercent,
            volume: quote.volume,
            trend,
            rsi: Number(rsi.toFixed(1)),
            macdStatus,
            setupTitle: isPullbackBuy ? 'Trend Pullback & Confluence' : 'Key Resistance Breakout',
            setupDescription: isPullbackBuy
              ? `Healthy consolidation above support $${support.toFixed(2)} with RSI at ${rsi.toFixed(0)} reset.`
              : `Clean push through multi-day resistance level at $${resistance.toFixed(2)}.`,
            invalidationLevel: Number((support * 0.99).toFixed(2)),
            riskLevel: 'Low',
            profile: 'swing',
            timestamp: Date.now(),
            provider: quote.provider,
          });
        }
      }

      // 3. Long-Term Investing Evaluation
      if (selectedProfile === 'all' || selectedProfile === 'long_term') {
        const isAboveLongTerm = (snapshot.sma50 || 0) > 0 && price > (snapshot.sma50 || 0);
        const isHealthyRSI = rsi > 45 && rsi < 65;

        if (isAboveLongTerm && isHealthyRSI) {
          results.push({
            symbol: item.symbol,
            name: item.name,
            market: item.market,
            price,
            change24hPercent: quote.change24hPercent,
            volume: quote.volume,
            trend,
            rsi: Number(rsi.toFixed(1)),
            macdStatus,
            setupTitle: 'Macro Accumulation Zone',
            setupDescription: `Holding firmly above 50-period SMA ($${snapshot.sma50?.toFixed(2) || 'N/A'}) with stable volume.`,
            invalidationLevel: Number((price * 0.92).toFixed(2)),
            riskLevel: 'Low',
            profile: 'long_term',
            timestamp: Date.now(),
            provider: quote.provider,
          });
        }
      }
    } catch {
      // Continue to next instrument
    }
  }

  return results;
}
