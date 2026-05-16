/**
 * Historical price service — uses Binance public klines API.
 * No API key required. Covers all major crypto pairs.
 */

const BINANCE_BASE = 'https://api.binance.com/api/v3';
const LIMIT = 1000; // max candles per Binance request
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// Symbol → Binance trading pair
const BINANCE_PAIR: Record<string, string> = {
  BTC:   'BTCUSDT',
  ETH:   'ETHUSDT',
  SOL:   'SOLUSDT',
  BNB:   'BNBUSDT',
  ADA:   'ADAUSDT',
  DOT:   'DOTUSDT',
  MATIC: 'MATICUSDT',
  POL:   'POLUSDT',
  LINK:  'LINKUSDT',
  AVAX:  'AVAXUSDT',
  DOGE:  'DOGEUSDT',
  XRP:   'XRPUSDT',
  LTC:   'LTCUSDT',
  UNI:   'UNIUSDT',
  ATOM:  'ATOMUSDT',
  FIL:   'FILUSDT',
  NEAR:  'NEARUSDT',
  ARB:   'ARBUSDT',
  OP:    'OPUSDT',
  INJ:   'INJUSDT',
  SUI:   'SUIUSDT',
  PEPE:  'PEPEUSDT',
  WIF:   'WIFUSDT',
  TRX:   'TRXUSDT',
  TON:   'TONUSDT',
};

export type PriceSeries = [number, number][]; // [timestamp_ms, price_usd]

interface CachedHistory {
  prices: PriceSeries;
  fetchedAt: number;
}

const historyCache = new Map<string, CachedHistory>();

/** Resolve a user asset symbol to a Binance pair string (e.g. BTC → BTCUSDT). */
export function toBinancePair(symbol: string): string {
  return BINANCE_PAIR[symbol.toUpperCase()] ?? `${symbol.toUpperCase()}USDT`;
}

/**
 * Fetch daily OHLCV candles from Binance, paginating until we have the full history.
 * Each Binance kline row: [openTime, open, high, low, close, ...]
 * We use closeTime (index 6) as the candle timestamp and close price (index 4).
 */
async function fetchAllCandles(pair: string): Promise<PriceSeries> {
  const prices: PriceSeries = [];
  // Start from a date before any crypto — Binance will snap to its earliest data
  let startTime = new Date('2010-01-01').getTime();
  const MAX_REQUESTS = 15; // safety cap

  for (let i = 0; i < MAX_REQUESTS; i++) {
    const url =
      `${BINANCE_BASE}/klines?symbol=${pair}&interval=1d&limit=${LIMIT}&startTime=${startTime}`;

    const resp = await fetch(url);

    if (resp.status === 400) {
      // Invalid symbol — asset not listed on Binance
      throw new Error(`${pair} is not available on Binance. Only major crypto assets are supported.`);
    }
    if (!resp.ok) {
      throw new Error(`Binance historical data error: ${resp.status} ${resp.statusText}`);
    }

    // Each row: [openTime, open, high, low, close, vol, closeTime, ...]
    const rows = (await resp.json()) as [number, string, string, string, string, string, number, ...unknown[]][];

    for (const row of rows) {
      const closeTime  = row[6]; // ms timestamp of candle close
      const closePrice = parseFloat(row[4]);
      prices.push([closeTime, closePrice]);
    }

    if (rows.length < LIMIT) break; // reached the end of available data

    // Advance startTime to just after the last candle's open time
    startTime = rows[rows.length - 1][0] + 1;
  }

  return prices;
}

/**
 * Returns the full daily price history for a given asset symbol.
 * Results are cached for 2 hours.
 */
export async function getHistoricalPrices(symbol: string): Promise<PriceSeries> {
  const pair = toBinancePair(symbol);
  const now  = Date.now();
  const cached = historyCache.get(pair);

  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.prices;
  }

  const prices = await fetchAllCandles(pair);
  historyCache.set(pair, { prices, fetchedAt: now });

  console.log(`[HistoricalPriceService] Cached ${prices.length} daily candles for ${pair}`);
  return prices;
}
