import { prisma } from '../lib/prisma';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const FX_BASE = 'https://api.frankfurter.app/latest';

function cgHeaders(): Record<string, string> {
  const key = process.env.COINGECKO_API_KEY;
  return key
    ? { 'x-cg-demo-api-key': key }
    : {};
}

// Symbol → CoinGecko ID map (extend as needed)
const COINGECKO_IDS: Record<string, string> = {
  BTC:   'bitcoin',
  ETH:   'ethereum',
  SOL:   'solana',
  BNB:   'binancecoin',
  ADA:   'cardano',
  DOT:   'polkadot',
  MATIC: 'matic-network',
  LINK:  'chainlink',
  AVAX:  'avalanche-2',
  DOGE:  'dogecoin',
  // Metals via tokenized equivalents on CoinGecko (track spot price 1:1)
  XAU:   'pax-gold',   // PAX Gold — 1 token = 1 troy oz gold
  XAG:   'silver',     // Silver token on CoinGecko
};

// Symbols handled via CoinGecko (including tokenized metals above)
const METAL_SYMBOLS = new Set(['XPT', 'XPD']); // only obscure metals still use Frankfurter

interface CryptoMarketData {
  priceUsd:   number;
  change24h:  number | null;
  marketCap:  number | null;
  ath:        number | null;
  athDate:    Date   | null;
}

// Uses /coins/markets, returns price + ATH in one call
async function fetchCryptoMarkets(
  symbols: string[]
): Promise<Map<string, CryptoMarketData>> {
  const result = new Map<string, CryptoMarketData>();
  const ids = symbols.map((s) => COINGECKO_IDS[s]).filter(Boolean).join(',');
  if (!ids) return result;

  try {
    const url =
      `${COINGECKO_BASE}/coins/markets` +
      `?vs_currency=usd&ids=${ids}&order=market_cap_desc` +
      `&per_page=100&page=1&sparkline=false&price_change_percentage=24h`;

    const resp = await fetch(url, { headers: cgHeaders() });
    if (!resp.ok) throw new Error(`CoinGecko /markets error: ${resp.status}`);

    const data = await resp.json() as Array<{
      id: string;
      current_price: number;
      price_change_percentage_24h: number | null;
      market_cap: number | null;
      ath: number | null;
      ath_date: string | null;
    }>;

    // Build reverse map: coingecko-id → symbol
    const idToSymbol = Object.fromEntries(
      Object.entries(COINGECKO_IDS).map(([sym, id]) => [id, sym])
    );

    for (const coin of data) {
      const symbol = idToSymbol[coin.id];
      if (symbol && symbols.includes(symbol)) {
        result.set(symbol, {
          priceUsd:  coin.current_price,
          change24h: coin.price_change_percentage_24h ?? null,
          marketCap: coin.market_cap ?? null,
          ath:       coin.ath ?? null,
          athDate:   coin.ath_date ? new Date(coin.ath_date) : null,
        });
      }
    }
  } catch (err) {
    console.error('[PriceService] CoinGecko /markets fetch failed:', err);
  }

  return result;
}

// ATH seeds for metals not on CoinGecko (XPT, XPD only — XAU/XAG now use CoinGecko)
const METAL_ATH_SEEDS: Record<string, number> = {
  XPT: 2300,   // Platinum ATH ~$2,300/oz (2008)
  XPD: 3000,   // Palladium ATH ~$3,000/oz (2022)
};

// Frankfurter returns rates as "how many XAU per 1 USD", so price = 1 / rate
async function fetchMetalPrices(symbols: string[]): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>();
  const metalSymbols = symbols.filter((s) => METAL_SYMBOLS.has(s));
  if (!metalSymbols.length) return priceMap;

  try {
    const to = metalSymbols.join(',');
    const resp = await fetch(`${FX_BASE}?from=USD&to=${to}`);
    if (!resp.ok) throw new Error(`Frankfurter metals error: ${resp.status}`);
    const data = await resp.json() as { rates: Record<string, number> };

    for (const symbol of metalSymbols) {
      const rate = data.rates[symbol];
      if (rate && rate > 0) priceMap.set(symbol, 1 / rate);
    }
  } catch (err) {
    console.error('[PriceService] Metals fetch failed:', err);
  }

  return priceMap;
}

async function fetchExchangeRates(): Promise<void> {
  try {
    const resp = await fetch(`${FX_BASE}?from=USD&to=EUR,CZK,GBP,JPY,CHF`);
    if (!resp.ok) return;
    const data = await resp.json() as { rates: Record<string, number> };

    for (const [currency, rate] of Object.entries(data.rates)) {
      await prisma.exchangeRate.upsert({
        where: { fromCurrency_toCurrency: { fromCurrency: 'USD', toCurrency: currency } },
        update: { rate, fetchedAt: new Date() },
        create: { fromCurrency: 'USD', toCurrency: currency, rate, fetchedAt: new Date() },
      });
    }
  } catch (err) {
    console.error('[PriceService] FX fetch failed:', err);
  }
}

export async function fetchAndCachePrices(symbols?: string[]): Promise<void> {
  let targetSymbols = symbols;
  if (!targetSymbols?.length) {
    const assets = await prisma.asset.findMany({ select: { symbol: true }, distinct: ['symbol'] });
    targetSymbols = assets.map((a) => a.symbol);
  }
  if (!targetSymbols.length) return;

  const cryptoSymbols = targetSymbols.filter((s) => !METAL_SYMBOLS.has(s));
  const metalSymbols  = targetSymbols.filter((s) => METAL_SYMBOLS.has(s));

  const [cryptoData, metalPrices] = await Promise.all([
    fetchCryptoMarkets(cryptoSymbols),
    fetchMetalPrices(metalSymbols),
  ]);

  // Upsert crypto entries (with ATH)
  for (const [symbol, d] of cryptoData) {
    await prisma.priceCache.upsert({
      where:  { symbol },
      update: { priceUsd: d.priceUsd, change24h: d.change24h, marketCap: d.marketCap, ath: d.ath, athDate: d.athDate, fetchedAt: new Date() },
      create: { symbol, priceUsd: d.priceUsd, change24h: d.change24h, marketCap: d.marketCap, ath: d.ath, athDate: d.athDate, fetchedAt: new Date() },
    });
  }

  // Upsert metal entries — track ATH ourselves since the metals API doesn't provide it
  for (const [symbol, priceUsd] of metalPrices) {
    const existing = await prisma.priceCache.findUnique({ where: { symbol } });
    const seedAth   = METAL_ATH_SEEDS[symbol] ?? null;
    const currentAth = existing?.ath ?? seedAth;
    const newAth = currentAth === null || priceUsd > currentAth ? priceUsd : currentAth;
    const athDate = newAth !== (existing?.ath ?? null) ? new Date() : (existing?.athDate ?? new Date());

    await prisma.priceCache.upsert({
      where:  { symbol },
      update: { priceUsd, ath: newAth, athDate, fetchedAt: new Date() },
      create: { symbol, priceUsd, ath: newAth, athDate, fetchedAt: new Date() },
    });
  }

  await fetchExchangeRates();

  const total = cryptoData.size + metalPrices.size;
  if (total > 0) {
    const updated = [...cryptoData.keys(), ...metalPrices.keys()].join(', ');
    console.log(`[PriceService] Updated prices for: ${updated}`);
  }
}
