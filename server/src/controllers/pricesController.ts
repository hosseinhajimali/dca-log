import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { fetchAndCachePrices } from '../services/priceService';

// ── Fear & Greed in-memory cache ────────────────────────────────────────────
interface FngEntry { value: string; value_classification: string; timestamp: string; }
let fngCache: { data: FngEntry[]; fetchedAt: number } | null = null;
const FNG_TTL = 60 * 60 * 1000; // 1 hour

export async function getPrices(req: Request, res: Response, next: NextFunction) {
  try {
    const { symbols } = req.query;
    const symbolList = symbols ? String(symbols).toUpperCase().split(',') : [];

    const prices = await prisma.priceCache.findMany({
      where: symbolList.length ? { symbol: { in: symbolList } } : undefined,
    });

    res.json({ success: true, data: prices });
  } catch (err) {
    next(err);
  }
}

export async function refreshPrices(req: Request, res: Response, next: NextFunction) {
  try {
    const { symbols } = req.body;
    await fetchAndCachePrices(symbols);
    const prices = await prisma.priceCache.findMany(
      symbols?.length ? { where: { symbol: { in: symbols } } } : undefined
    );
    res.json({ success: true, data: prices });
  } catch (err) {
    next(err);
  }
}

export async function getFearGreed(req: Request, res: Response, next: NextFunction) {
  try {
    const now = Date.now();
    if (fngCache && now - fngCache.fetchedAt < FNG_TTL) {
      return res.json({ success: true, data: fngCache.data, cached: true });
    }

    const response = await fetch('https://api.alternative.me/fng/?limit=30&format=json');
    if (!response.ok) throw new Error(`Fear & Greed API error: ${response.status}`);

    const json = await response.json() as { data: FngEntry[] };
    fngCache = { data: json.data, fetchedAt: now };
    res.json({ success: true, data: json.data, cached: false });
  } catch (err) {
    next(err);
  }
}

export async function getExchangeRates(req: Request, res: Response, next: NextFunction) {
  try {
    const rates = await prisma.exchangeRate.findMany({ where: { fromCurrency: 'USD' } });
    res.json({ success: true, data: rates });
  } catch (err) {
    next(err);
  }
}
