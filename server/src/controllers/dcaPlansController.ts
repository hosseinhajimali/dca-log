import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { computeNextPurchaseDate } from '../services/dcaService';

// ─── validation ───────────────────────────────────────────────────────────────

const allocationSchema = z.array(
  z.object({
    assetId: z.string().cuid(),
    allocationPct: z.number().positive().max(100),
  })
).min(1, 'At least one asset allocation is required')
 .refine(
   (arr) => Math.abs(arr.reduce((s, a) => s + a.allocationPct, 0) - 100) < 0.01,
   { message: 'Allocations must sum to 100%' }
 );

const planSchema = z.object({
  name: z.string().optional(),
  amountUsd: z.number().positive(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']),
  intervalDays: z.number().int().positive().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional(),
  perAssetRules: z.boolean().optional(),
  allocations: allocationSchema,
});

// ─── shared include ───────────────────────────────────────────────────────────

const PLAN_INCLUDE = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allocations: { include: { asset: true }, orderBy: { allocationPct: 'desc' as any } },
  buyingRules: { orderBy: { minDrawdown: 'asc' as const } },
} as const;

// ─── types ────────────────────────────────────────────────────────────────────

type AllocWithAsset = {
  assetId: string;
  allocationPct: number;
  asset: { symbol: string; color?: string | null };
};
type BuyingRule = { minDrawdown: number; maxDrawdown: number; buyAmount: number };
type PriceEntry = { priceUsd: number; ath: number | null };

type RichPlan = {
  amountUsd: number;
  perAssetRules: boolean;
  allocations: AllocWithAsset[];
  buyingRules: BuyingRule[];
  [key: string]: unknown;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function matchRule(drawdownPct: number | null, rules: BuyingRule[]): BuyingRule | null {
  if (drawdownPct === null || rules.length === 0) return null;
  return [...rules]
    .sort((a, b) => b.minDrawdown - a.minDrawdown)
    .find((r) => drawdownPct >= r.minDrawdown && drawdownPct <= r.maxDrawdown) ?? null;
}

function assetDrawdown(price: PriceEntry | undefined): number | null {
  if (!price?.ath || price.ath <= 0 || price.priceUsd <= 0) return null;
  return Math.abs(((price.priceUsd - price.ath) / price.ath) * 100);
}

// ── Method A: weighted-average drawdown → one rule for the whole group ────────
function enrichGroupMethod(plan: RichPlan, priceMap: Map<string, PriceEntry>) {
  let weightedDrawdown: number | null = null;
  let totalWeight = 0;

  for (const alloc of plan.allocations) {
    const price = priceMap.get(alloc.asset.symbol);
    if (price?.ath && price.ath > 0 && price.priceUsd > 0) {
      const dd = ((price.priceUsd - price.ath) / price.ath) * 100; // negative
      weightedDrawdown = (weightedDrawdown ?? 0) + dd * (alloc.allocationPct / 100);
      totalWeight += alloc.allocationPct;
    }
  }
  if (weightedDrawdown !== null && totalWeight > 0 && totalWeight < 100) {
    weightedDrawdown = (weightedDrawdown / totalWeight) * 100;
  }

  const drawdownPct = weightedDrawdown !== null ? Math.abs(weightedDrawdown) : null;
  const activeRule = matchRule(drawdownPct, plan.buyingRules);
  const suggestedAmount = activeRule ? activeRule.buyAmount : plan.amountUsd;

  const suggestedAllocations = plan.allocations.map((alloc) => ({
    assetId: alloc.assetId,
    symbol: alloc.asset.symbol,
    color: alloc.asset.color ?? null,
    allocationPct: alloc.allocationPct,
    amount: +(suggestedAmount * (alloc.allocationPct / 100)).toFixed(2),
  }));

  return { ...plan, drawdownFromAth: weightedDrawdown, suggestedAmount, suggestedAllocations };
}

// ── Method B: per-asset rule evaluation → each asset independently ────────────
//
// The rule's buyAmount encodes a multiplier relative to the plan's total base amount.
// That multiplier is applied independently to each asset's share of the base amount.
//
// Example: plan $100 base, BTC 70% / ETH 30%. Rule: −20%→−40% buy $300 (3×).
//   BTC at −30% → matches rule → multiplier 3 → BTC amount = $70 × 3 = $210
//   ETH at  −5% → no rule     → multiplier 1 → ETH amount = $30 × 1 = $30
//   Total suggested = $240  (vs $300 in group method)
//
function enrichPerAssetMethod(plan: RichPlan, priceMap: Map<string, PriceEntry>) {
  // Still compute weighted drawdown for display (ATH badge etc.)
  let weightedDrawdown: number | null = null;
  let totalWeight = 0;

  let totalSuggested = 0;

  const suggestedAllocations = plan.allocations.map((alloc) => {
    const price = priceMap.get(alloc.asset.symbol);
    const dd = assetDrawdown(price);

    // Accumulate weighted drawdown for display
    if (price?.ath && price.ath > 0 && price.priceUsd > 0) {
      const ddRaw = ((price.priceUsd - price.ath) / price.ath) * 100;
      weightedDrawdown = (weightedDrawdown ?? 0) + ddRaw * (alloc.allocationPct / 100);
      totalWeight += alloc.allocationPct;
    }

    // This asset's base share of the plan
    const baseShare = plan.amountUsd * (alloc.allocationPct / 100);

    // Find the matching rule for this asset's drawdown
    const activeRule = matchRule(dd, plan.buyingRules);

    // Rule's multiplier relative to the plan's total base amount
    const multiplier = activeRule ? activeRule.buyAmount / plan.amountUsd : 1;

    const amount = +(baseShare * multiplier).toFixed(2);
    totalSuggested += amount;

    return {
      assetId: alloc.assetId,
      symbol: alloc.asset.symbol,
      color: alloc.asset.color ?? null,
      allocationPct: alloc.allocationPct,
      amount,
      // expose per-asset detail
      drawdownPct: dd,
      activeRuleMultiplier: multiplier,
    };
  });

  if (weightedDrawdown !== null && totalWeight > 0 && totalWeight < 100) {
    weightedDrawdown = (weightedDrawdown / totalWeight) * 100;
  }

  return {
    ...plan,
    drawdownFromAth: weightedDrawdown,
    suggestedAmount: +totalSuggested.toFixed(2),
    suggestedAllocations,
  };
}

function enrichPlan(plan: RichPlan, priceMap: Map<string, PriceEntry>) {
  return plan.perAssetRules
    ? enrichPerAssetMethod(plan, priceMap)
    : enrichGroupMethod(plan, priceMap);
}

// ─── controllers ──────────────────────────────────────────────────────────────

export async function getDcaPlans(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plans = await (prisma as any).dcaPlan.findMany({
      where: { userId: req.userId },
      include: PLAN_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    const symbols = [
      ...new Set((plans as RichPlan[]).flatMap((p) => p.allocations.map((a) => a.asset.symbol))),
    ];
    const prices = await prisma.priceCache.findMany({
      where: { symbol: { in: symbols } },
      select: { symbol: true, priceUsd: true, ath: true },
    });
    const priceMap = new Map(prices.map((p) => [p.symbol, p]));

    const enriched = (plans as RichPlan[]).map((plan) => enrichPlan(plan, priceMap));
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

    const assetIds = body.data.allocations.map((a) => a.assetId);
    const assets = await prisma.asset.findMany({
      where: { id: { in: assetIds }, userId: req.userId },
    });
    if (assets.length !== assetIds.length) {
      return next(new AppError(404, 'One or more assets not found'));
    }

    const startDate = new Date(body.data.startDate);
    const nextPurchaseDate = computeNextPurchaseDate(startDate, body.data.frequency, body.data.intervalDays);
    const { allocations, ...planData } = body.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan = await (prisma as any).$transaction(async (tx: any) => {
      const created = await tx.dcaPlan.create({
        data: {
          ...planData,
          startDate,
          endDate: planData.endDate ? new Date(planData.endDate) : null,
          nextPurchaseDate,
          userId: req.userId!,
        },
      });
      await tx.planAllocation.createMany({
        data: allocations.map((a) => ({ planId: created.id, assetId: a.assetId, allocationPct: a.allocationPct })),
      });
      return tx.dcaPlan.findUniqueOrThrow({ where: { id: created.id }, include: PLAN_INCLUDE });
    });

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
}

export async function updateDcaPlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const plan = await prisma.dcaPlan.findFirst({ where: { id, userId: req.userId as string } });
    if (!plan) return next(new AppError(404, 'Plan not found'));

    const updateSchema = planSchema.partial().extend({ isActive: z.boolean().optional() });
    const body = updateSchema.safeParse(req.body);
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

    const { allocations, ...planData } = body.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma as any).$transaction(async (tx: any) => {
      // Build update payload explicitly — never spread unknown fields into Prisma
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {};
      if (planData.name        !== undefined) updateData.name        = planData.name;
      if (planData.amountUsd   !== undefined) updateData.amountUsd   = planData.amountUsd;
      if (planData.frequency   !== undefined) updateData.frequency   = planData.frequency;
      if (planData.intervalDays!== undefined) updateData.intervalDays= planData.intervalDays;
      if (planData.isActive    !== undefined) updateData.isActive    = planData.isActive;
      if (planData.notes       !== undefined) updateData.notes       = planData.notes;
      if (planData.perAssetRules !== undefined) updateData.perAssetRules = planData.perAssetRules;
      if (planData.startDate   !== undefined) updateData.startDate   = new Date(planData.startDate as string);
      if (planData.endDate     !== undefined) {
        updateData.endDate = planData.endDate ? new Date(planData.endDate as string) : null;
      }

      await tx.dcaPlan.update({ where: { id }, data: updateData });

      if (allocations && allocations.length > 0) {
        const assetIds = allocations.map((a) => a.assetId);
        const assets = await tx.asset.findMany({ where: { id: { in: assetIds }, userId: req.userId } });
        if (assets.length !== assetIds.length) throw new AppError(404, 'One or more assets not found');

        await tx.planAllocation.deleteMany({ where: { planId: id } });
        await tx.planAllocation.createMany({
          data: allocations.map((a) => ({ planId: id, assetId: a.assetId, allocationPct: a.allocationPct })),
        });
      }

      return tx.dcaPlan.findUniqueOrThrow({ where: { id }, include: PLAN_INCLUDE });
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteDcaPlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const plan = await prisma.dcaPlan.findFirst({ where: { id, userId: req.userId as string } });
    if (!plan) return next(new AppError(404, 'Plan not found'));
    await prisma.dcaPlan.delete({ where: { id } });
    res.json({ success: true, message: 'Plan deleted' });
  } catch (err) {
    next(err);
  }
}
