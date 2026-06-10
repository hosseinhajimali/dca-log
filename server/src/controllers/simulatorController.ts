import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import { getHistoricalPrices } from '../services/historicalPriceService';
import { advanceDate, findNearestPrice, round2 } from '../services/simulationUtils';

// ─── Query validation ─────────────────────────────────────────────────────────

const querySchema = z.object({
  assetId:      z.string().min(1),
  startDate:    z.string().min(1),
  amountUsd:    z.coerce.number().positive(),
  frequency:    z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']),
  endDate:      z.string().optional(),
  intervalDays: z.coerce.number().int().positive().optional(),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export async function runSimulation(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: parsed.error.issues,
      });
    }

    const { assetId, startDate, amountUsd, frequency, endDate, intervalDays } = parsed.data;
    const userId = req.userId!;

    // ── Resolve asset ──────────────────────────────────────────────────────────
    const asset = await prisma.asset.findFirst({ where: { id: assetId, userId } });
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found.' });
    }

    // ── Fetch historical prices from Binance ──────────────────────────────────
    const prices = await getHistoricalPrices(asset.symbol);
    if (!prices.length) {
      return res.status(422).json({ success: false, error: 'No historical price data returned.' });
    }

    const startMs   = new Date(startDate).getTime();
    const endMs     = endDate ? new Date(endDate).getTime() : Date.now();
    const firstDataMs = prices[0][0];

    if (startMs < firstDataMs) {
      // Clamp silently to first available data point instead of erroring
    }

    // ── Generate buy dates ────────────────────────────────────────────────────
    const buyDates: Date[] = [];
    let current = new Date(startDate);
    while (current.getTime() <= endMs) {
      buyDates.push(new Date(current));
      current = advanceDate(current, frequency, intervalDays);
    }

    // ── Run simulation ────────────────────────────────────────────────────────
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
      chartData.push({
        date: dateStr,
        totalInvested:  round2(totalInvested),
        portfolioValue: round2(portfolioValue),
        price:          round2(price),
      });
      allBuys.push({
        date: dateStr,
        price:          round2(price),
        quantity:       qty,
        amountUsd,
        portfolioValue: round2(portfolioValue),
      });
    }

    if (!allBuys.length) {
      return res.status(422).json({
        success: false,
        error: 'No price data found for the selected date range. Try a later start date.',
      });
    }

    // Use the last entry in historical data as "current" price (≈ today)
    const currentPrice = prices[prices.length - 1][1];
    const currentValue = totalQuantity * currentPrice;
    const totalReturn  = currentValue - totalInvested;
    const totalReturnPct = (totalReturn / totalInvested) * 100;
    const avgCost      = totalInvested / totalQuantity;

    // Update last chart point to reflect actual current price
    if (chartData.length > 0) {
      chartData[chartData.length - 1].portfolioValue = round2(currentValue);
    }

    return res.json({
      success: true,
      data: {
        asset: {
          id:     asset.id,
          symbol: asset.symbol,
          name:   asset.name,
          color:  asset.color,
        },
        params: { startDate, amountUsd, frequency, intervalDays },
        summary: {
          totalInvested:   round2(totalInvested),
          currentValue:    round2(currentValue),
          totalReturn:     round2(totalReturn),
          totalReturnPct:  round2(totalReturnPct),
          totalQuantity,
          avgCost:         round2(avgCost),
          currentPrice:    round2(currentPrice),
          buyCount:        allBuys.length,
          bestBuyPrice:    round2(bestBuyPrice),
          worstBuyPrice:   round2(worstBuyPrice),
          firstBuyDate:    allBuys[0].date,
          lastBuyDate:     allBuys[allBuys.length - 1].date,
        },
        chartData,
        recentBuys: allBuys.slice(-20).reverse(), // newest first
      },
    });
  } catch (err) {
    next(err);
  }
}
