import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { fetchAndCachePrices } from '../services/priceService';

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
      symbols?.length ? { where: { symbol: { in: symbols } } } : {}
    );
    res.json({ success: true, data: prices });
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
