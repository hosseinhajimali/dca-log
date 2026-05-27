import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getHistoricalPrices } from '../services/historicalPriceService';

// Supported public assets (symbol → display name)
export const PUBLIC_ASSETS: Record<string, string> = {
  BTC:  'Bitcoin',
  ETH:  'Ethereum',
  SOL:  'Solana',
  BNB:  'BNB',
  XRP:  'XRP',
  ADA:  'Cardano',
  DOGE: 'Dogecoin',
  LINK: 'Chainlink',
  AVAX: 'Avalanche',
  LTC:  'Litecoin',
  DOT:  'Polkadot',
  NEAR: 'NEAR Protocol',
  ARB:  'Arbitrum',
  TON:  'Toncoin',
  TRX:  'TRON',
  UNI:  'Uniswap',
  ATOM: 'Cosmos',
  INJ:  'Injective',
  SUI:  'Sui',
};

const querySchema = z.object({
  symbol:      z.string().min(1).transform(s => s.toUpperCase()),
  startDate:   z.string().min(1),
  amountUsd:   z.coerce.number().positive().max(1_000_000),
  frequency:   z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  endDate:     z.string().optional(),
});

function advanceDate(d: Date, freq: string): Date {
  const next = new Date(d);
  switch (freq) {
    case 'DAILY':    next.setUTCDate(next.getUTCDate() + 1);   break;
    case 'WEEKLY':   next.setUTCDate(next.getUTCDate() + 7);   break;
    case 'BIWEEKLY': next.setUTCDate(next.getUTCDate() + 14);  break;
    case 'MONTHLY':  next.setUTCMonth(next.getUTCMonth() + 1); break;
  }
  return next;
}

function findNearestPrice(prices: [number, number][], targetMs: number): number | null {
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
  let lo = 0, hi = prices.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (prices[mid][0] < targetMs) lo = mid + 1;
    else hi = mid;
  }
  const candidates = [prices[lo]];
  if (lo > 0) candidates.push(prices[lo - 1]);
  let best: [number, number] | null = null;
  let minDiff = Infinity;
  for (const c of candidates) {
    if (!c) continue;
    const diff = Math.abs(c[0] - targetMs);
    if (diff < minDiff) { minDiff = diff; best = c; }
  }
  return best && minDiff <= THREE_DAYS ? best[1] : null;
}

function round2(n: number) { return Math.round(n * 100) / 100; }

export async function runPublicSimulation(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid parameters', details: parsed.error.issues });
    }

    const { symbol, startDate, amountUsd, frequency, endDate } = parsed.data;

    if (!PUBLIC_ASSETS[symbol]) {
      return res.status(400).json({ success: false, error: `Asset "${symbol}" is not supported.` });
    }

    const prices = await getHistoricalPrices(symbol);
    if (!prices.length) {
      return res.status(422).json({ success: false, error: 'No historical price data available.' });
    }

    const startMs = new Date(startDate).getTime();
    const endMs   = endDate ? new Date(endDate).getTime() : Date.now();

    // Generate buy dates
    const buyDates: Date[] = [];
    let current = new Date(startDate);
    while (current.getTime() <= endMs) {
      buyDates.push(new Date(current));
      current = advanceDate(current, frequency);
    }

    let totalInvested = 0;
    let totalQuantity = 0;
    let bestBuyPrice  = Infinity;
    let worstBuyPrice = 0;

    type ChartPoint = { date: string; totalInvested: number; portfolioValue: number; price: number };
    type BuyRecord  = { date: string; price: number; quantity: number; amountUsd: number; portfolioValue: number };

    const chartData: ChartPoint[] = [];
    const allBuys:   BuyRecord[]  = [];

    for (const date of buyDates) {
      const price = findNearestPrice(prices, date.getTime());
      if (price === null) continue;

      const qty = amountUsd / price;
      totalInvested += amountUsd;
      totalQuantity += qty;

      const portfolioValue = totalQuantity * price;
      if (price < bestBuyPrice)  bestBuyPrice  = price;
      if (price > worstBuyPrice) worstBuyPrice = price;

      const dateStr = date.toISOString().slice(0, 10);
      chartData.push({ date: dateStr, totalInvested: round2(totalInvested), portfolioValue: round2(portfolioValue), price: round2(price) });
      allBuys.push({ date: dateStr, price: round2(price), quantity: qty, amountUsd, portfolioValue: round2(portfolioValue) });
    }

    if (!allBuys.length) {
      return res.status(422).json({ success: false, error: 'No price data found for the selected date range. Try a later start date.' });
    }

    const currentPrice    = prices[prices.length - 1][1];
    const currentValue    = totalQuantity * currentPrice;
    const totalReturn     = currentValue - totalInvested;
    const totalReturnPct  = (totalReturn / totalInvested) * 100;
    const avgCost         = totalInvested / totalQuantity;

    if (chartData.length > 0) {
      chartData[chartData.length - 1].portfolioValue = round2(currentValue);
    }

    return res.json({
      success: true,
      data: {
        asset: { symbol, name: PUBLIC_ASSETS[symbol] },
        params: { startDate, amountUsd, frequency },
        summary: {
          totalInvested:  round2(totalInvested),
          currentValue:   round2(currentValue),
          totalReturn:    round2(totalReturn),
          totalReturnPct: round2(totalReturnPct),
          totalQuantity,
          avgCost:        round2(avgCost),
          currentPrice:   round2(currentPrice),
          buyCount:       allBuys.length,
          bestBuyPrice:   round2(bestBuyPrice === Infinity ? 0 : bestBuyPrice),
          worstBuyPrice:  round2(worstBuyPrice),
          firstBuyDate:   allBuys[0].date,
          lastBuyDate:    allBuys[allBuys.length - 1].date,
        },
        chartData,
        recentBuys: allBuys.slice(-10).reverse(),
      },
    });
  } catch (err) {
    next(err);
  }
}
