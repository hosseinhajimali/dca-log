/**
 * Backtest API. See docs/backtest-design.md.
 *
 * GET /api/backtest/availability?assetId=...
 *   Cheap pre-check that powers the blocking UX. Never runs a backtest.
 *
 * GET /api/backtest?assetId=...&ruleSetId=...&startDate=...&amountUsd=...&frequency=...
 *   Runs the rule set and a plain DCA control over the same range.
 */

import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import { getHistoricalPrices, checkPairAvailability } from '../services/historicalPriceService';
import { runBacktest } from '../services/backtestEngine';

const MAX_RANGE_YEARS = 10;

// ─── Validation ───────────────────────────────────────────────────────────────

const availabilityQuerySchema = z.object({
  assetId: z.string().min(1),
});

const backtestQuerySchema = z.object({
  assetId:      z.string().min(1),
  ruleSetId:    z.string().min(1),
  startDate:    z.string().min(1),
  amountUsd:    z.coerce.number().positive().max(1_000_000),
  frequency:    z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']),
  endDate:      z.string().optional(),
  intervalDays: z.coerce.number().int().positive().optional(),
});

// ─── GET /backtest/availability ───────────────────────────────────────────────

export async function getBacktestAvailability(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = availabilityQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid parameters', details: parsed.error.issues });
    }

    const asset = await prisma.asset.findFirst({
      where: { id: parsed.data.assetId, userId: req.userId! },
    });
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found.' });
    }

    // Non-crypto assets are never backtestable in v1, no provider call needed.
    if (asset.assetType !== 'CRYPTO') {
      return res.json({
        success: true,
        data: { available: false, reason: 'NOT_CRYPTO', assetType: asset.assetType },
      });
    }

    const availability = await checkPairAvailability(asset.symbol);
    if (!availability.available) {
      return res.json({
        success: true,
        data: { available: false, reason: availability.reason, pair: availability.pair },
      });
    }

    return res.json({
      success: true,
      data: {
        available: true,
        pair: availability.pair,
        dataStartDate: new Date(availability.dataStartMs).toISOString().slice(0, 10),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /backtest ────────────────────────────────────────────────────────────

export async function runBacktestEndpoint(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = backtestQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid parameters', details: parsed.error.issues });
    }

    const { assetId, ruleSetId, startDate, amountUsd, frequency, endDate, intervalDays } = parsed.data;
    const userId = req.userId!;

    // ── Resolve and validate inputs ────────────────────────────────────────────
    const [asset, ruleSet] = await Promise.all([
      prisma.asset.findFirst({ where: { id: assetId, userId } }),
      prisma.buyingRuleSet.findFirst({
        where: { id: ruleSetId, userId },
        include: { rows: { orderBy: { sortOrder: 'asc' } } },
      }),
    ]);

    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found.' });
    }
    if (!ruleSet) {
      return res.status(404).json({ success: false, error: 'Rule set not found.' });
    }
    if (asset.assetType !== 'CRYPTO') {
      return res.status(422).json({
        success: false,
        error: 'Backtesting currently supports crypto assets only.',
        code: 'NOT_CRYPTO',
      });
    }
    if (ruleSet.rows.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'This rule set has no rows yet. Add at least one row to backtest it.',
        code: 'EMPTY_RULE_SET',
      });
    }

    const startMs = new Date(startDate).getTime();
    const endMs   = endDate ? new Date(endDate).getTime() : Date.now();
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs >= endMs) {
      return res.status(400).json({ success: false, error: 'Invalid date range.' });
    }
    if (endMs - startMs > MAX_RANGE_YEARS * 365.25 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ success: false, error: `Date range is limited to ${MAX_RANGE_YEARS} years.` });
    }

    // ── Fetch history ──────────────────────────────────────────────────────────
    let prices;
    try {
      prices = await getHistoricalPrices(asset.symbol);
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      if (message.includes('not available on Binance')) {
        return res.status(422).json({
          success: false,
          error: `No price history is available for ${asset.symbol}.`,
          code: 'NOT_LISTED',
        });
      }
      return res.status(502).json({
        success: false,
        error: 'Could not load price history right now. Try again in a few minutes.',
        code: 'PROVIDER_DOWN',
      });
    }
    if (!prices.length) {
      return res.status(502).json({
        success: false,
        error: 'Could not load price history right now. Try again in a few minutes.',
        code: 'PROVIDER_DOWN',
      });
    }

    // ── Run engine ─────────────────────────────────────────────────────────────
    const result = runBacktest({
      prices,
      startMs,
      endMs,
      amountUsd,
      frequency,
      intervalDays,
      rows: ruleSet.rows,
    });

    if (result.buys.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'No price data found for the selected date range. Try a later start date.',
        code: 'NO_DATA_IN_RANGE',
      });
    }

    return res.json({
      success: true,
      data: {
        asset:   { id: asset.id, symbol: asset.symbol, name: asset.name, color: asset.color },
        ruleSet: { id: ruleSet.id, label: ruleSet.label, strategyType: ruleSet.strategyType },
        params:  { startDate, endDate: endDate ?? null, amountUsd, frequency, intervalDays: intervalDays ?? null },
        ...result,
        // Trim the buy list for transport; chartData already covers every buy date.
        buys: result.buys.slice(-50).reverse(),
        totalBuyCount: result.buys.length,
      },
    });
  } catch (err) {
    next(err);
  }
}
