import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { computeNextPurchaseDate } from '../services/dcaService';

const planSchema = z.object({
  assetId: z.string().cuid(),
  name: z.string().optional(),
  amountUsd: z.number().positive(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']),
  intervalDays: z.number().int().positive().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional(),
});

function computeSuggestedAmount(
  drawdownPct: number | null,       // absolute %, e.g. 45 meaning 45% below ATH
  buyingRules: { minDrawdown: number; maxDrawdown: number; buyAmount: number }[],
  fallback: number,
): number {
  if (drawdownPct === null || buyingRules.length === 0) return fallback;
  const match = buyingRules
    .sort((a, b) => b.minDrawdown - a.minDrawdown) // highest range first
    .find((r) => drawdownPct >= r.minDrawdown && drawdownPct <= r.maxDrawdown);
  return match ? match.buyAmount : fallback;
}

export async function getDcaPlans(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const plans = await prisma.dcaPlan.findMany({
      where: { userId: req.userId },
      include: { asset: true, buyingRules: { orderBy: { minDrawdown: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch price cache for all unique asset symbols
    const symbols = [...new Set(plans.map((p) => p.asset.symbol))];
    const prices = await prisma.priceCache.findMany({
      where: { symbol: { in: symbols } },
      select: { symbol: true, priceUsd: true, ath: true },
    });
    const priceMap = new Map(prices.map((p) => [p.symbol, p]));

    const enriched = plans.map((plan) => {
      const price = priceMap.get(plan.asset.symbol);
      const drawdownFromAth =
        price?.ath && price.ath > 0 && price.priceUsd > 0
          ? ((price.priceUsd - price.ath) / price.ath) * 100  // negative value
          : null;
      const drawdownPct = drawdownFromAth !== null ? Math.abs(drawdownFromAth) : null;
      const suggestedAmount = computeSuggestedAmount(drawdownPct, plan.buyingRules, plan.amountUsd);

      return { ...plan, drawdownFromAth, suggestedAmount };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
}

export async function createDcaPlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = planSchema.safeParse(req.body);
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

    if (body.data.frequency === 'CUSTOM' && !body.data.intervalDays) {
      return next(new AppError(400, 'intervalDays is required for CUSTOM frequency'));
    }

    // Verify asset belongs to user
    const asset = await prisma.asset.findFirst({
      where: { id: body.data.assetId, userId: req.userId },
    });
    if (!asset) return next(new AppError(404, 'Asset not found'));

    const startDate = new Date(body.data.startDate);
    const nextPurchaseDate = computeNextPurchaseDate(
      startDate,
      body.data.frequency,
      body.data.intervalDays
    );

    const plan = await prisma.dcaPlan.create({
      data: {
        ...body.data,
        startDate,
        endDate: body.data.endDate ? new Date(body.data.endDate) : null,
        nextPurchaseDate,
        userId: req.userId!,
      },
      include: { asset: true, buyingRules: true },
    });
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
}

export async function updateDcaPlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const plan = await prisma.dcaPlan.findFirst({ where: { id, userId: req.userId } });
    if (!plan) return next(new AppError(404, 'Plan not found'));

    const updateSchema = planSchema.partial().extend({ isActive: z.boolean().optional() });
    const body = updateSchema.safeParse(req.body);
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

    const updated = await prisma.dcaPlan.update({
      where: { id },
      data: {
        ...body.data,
        ...(body.data.endDate !== undefined
          ? { endDate: body.data.endDate ? new Date(body.data.endDate) : null }
          : {}),
      },
      include: { asset: true, buyingRules: { orderBy: { minDrawdown: 'asc' } } },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteDcaPlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const plan = await prisma.dcaPlan.findFirst({ where: { id, userId: req.userId } });
    if (!plan) return next(new AppError(404, 'Plan not found'));

    await prisma.dcaPlan.delete({ where: { id } });
    res.json({ success: true, message: 'Plan deleted' });
  } catch (err) {
    next(err);
  }
}
