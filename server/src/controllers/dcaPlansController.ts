import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { computeNextPurchaseDate } from '../services/dcaService';
import { maybeNotify } from '../services/notificationService';

// ─── validation ───────────────────────────────────────────────────────────────

const allocationSchema = z.array(
  z.object({
    assetId: z.string().min(1),
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
  maxBudgetUsd: z.number().positive().optional().nullable(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']),
  intervalDays: z.number().int().positive().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional().default('08:00'),
  notes: z.string().optional(),
  allocations: allocationSchema,
});

// ─── shared include ───────────────────────────────────────────────────────────

const PLAN_INCLUDE = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allocations: { include: { asset: true }, orderBy: { allocationPct: 'desc' as any } },
  planBuyingRuleSets: {
    include: { ruleSet: { include: { rows: { orderBy: { sortOrder: 'asc' as const } } } } },
  },
  planSellRuleSets: {
    include: { ruleSet: { include: { rows: { orderBy: { sortOrder: 'asc' as const } } } } },
  },
} as const;

// ─── types ────────────────────────────────────────────────────────────────────

type AllocWithAsset = {
  assetId: string;
  allocationPct: number;
  asset: { symbol: string; color?: string | null };
};
type PriceEntry = { priceUsd: number; ath: number | null };

type RuleSetRow = { params: Record<string, unknown>; multiplier: number; sortOrder: number };
type AssignedBuyingRuleSet = { ruleSetId: string; isActive: boolean; ruleSet: { label: string; strategyType: string; rows: RuleSetRow[] } };
type AssignedSellRuleSet  = { ruleSetId: string; isActive: boolean; ruleSet: { label: string; strategyType: string; rows: { params: Record<string, unknown>; sellAmount: number; sellAmountType: string; sortOrder: number }[] } };

type RichPlan = {
  amountUsd: number;
  allocations: AllocWithAsset[];
  planBuyingRuleSets: AssignedBuyingRuleSet[];
  planSellRuleSets: AssignedSellRuleSet[];
  [key: string]: unknown;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function assetDrawdown(price: PriceEntry | undefined): number | null {
  if (!price?.ath || price.ath <= 0 || price.priceUsd <= 0) return null;
  return Math.abs(((price.priceUsd - price.ath) / price.ath) * 100);
}

function matchBuyRow(drawdownPct: number | null, rows: RuleSetRow[]): RuleSetRow | null {
  if (drawdownPct === null || rows.length === 0) return null;
  return [...rows]
    .sort((a, b) => b.sortOrder - a.sortOrder)
    .find((r) => {
      const p = r.params as { minDrawdown?: number; maxDrawdown?: number };
      return p.minDrawdown != null && p.maxDrawdown != null
        && drawdownPct >= p.minDrawdown && drawdownPct <= p.maxDrawdown;
    }) ?? null;
}

function enrichPlan(
  plan: RichPlan,
  priceMap: Map<string, PriceEntry>,
  avgCostMap: Map<string, number>,
  holdingsValueMap: Map<string, number>,
) {
  // Per-asset drawdown - each asset evaluated independently
  const assetDrawdowns = plan.allocations.map((alloc) => ({
    assetId: alloc.assetId,
    symbol: alloc.asset.symbol,
    color: alloc.asset.color ?? null,
    allocationPct: alloc.allocationPct,
    drawdownPct: assetDrawdown(priceMap.get(alloc.asset.symbol)),
  }));

  // Weighted drawdown for display (still useful as a single summary number)
  let weightedDrawdown: number | null = null;
  let totalWeight = 0;
  for (const a of assetDrawdowns) {
    if (a.drawdownPct !== null) {
      weightedDrawdown = (weightedDrawdown ?? 0) + (-a.drawdownPct) * (a.allocationPct / 100);
      totalWeight += a.allocationPct;
    }
  }
  if (weightedDrawdown !== null && totalWeight > 0 && totalWeight < 100) {
    weightedDrawdown = (weightedDrawdown / totalWeight) * 100;
  }

  // Active buying rule set - evaluate each asset independently
  const activeBuySet = plan.planBuyingRuleSets.find(p => p.isActive);
  const suggestedAllocations = assetDrawdowns.map((a) => {
    const baseAmount = plan.amountUsd * (a.allocationPct / 100);
    const match = activeBuySet ? matchBuyRow(a.drawdownPct, activeBuySet.ruleSet.rows) : null;
    const multiplier = match ? match.multiplier : 1;
    return {
      assetId: a.assetId,
      symbol: a.symbol,
      color: a.color,
      allocationPct: a.allocationPct,
      drawdownPct: a.drawdownPct,
      multiplier,
      amount: +(baseAmount * multiplier).toFixed(2),
      holdingsValue: holdingsValueMap.get(a.assetId) ?? 0,
    };
  });
  const suggestedAmount = +suggestedAllocations.reduce((s, a) => s + a.amount, 0).toFixed(2);

  // Active sell rule set suggestion
  const activeSellSet = plan.planSellRuleSets.find(p => p.isActive);
  let suggestedSellAmount: number | null = null;
  if (activeSellSet) {
    const matched: number[] = [];
    for (const alloc of plan.allocations) {
      const price   = priceMap.get(alloc.asset.symbol)?.priceUsd ?? 0;
      const avgCost = avgCostMap.get(alloc.assetId) ?? 0;
      const profitPct = avgCost > 0 && price > 0 ? ((price - avgCost) / avgCost) * 100 : null;
      if (profitPct === null) continue;
      for (const row of activeSellSet.ruleSet.rows) {
        const p = row.params as { minProfit?: number; maxProfit?: number };
        if (p.minProfit != null && p.maxProfit != null && profitPct >= p.minProfit && profitPct <= p.maxProfit) {
          let amount = row.sellAmount;
          if (row.sellAmountType === 'PCT') amount = (row.sellAmount / 100) * (holdingsValueMap.get(alloc.assetId) ?? 0);
          matched.push(amount);
        }
      }
    }
    suggestedSellAmount = matched.length > 0 ? Math.max(...matched) : null;
  }

  return { ...plan, drawdownFromAth: weightedDrawdown, suggestedAmount, suggestedAllocations, assetDrawdowns, suggestedSellAmount };
}

// ─── notification firing ──────────────────────────────────────────────────────

export async function fireRuleNotifications(
  userId: string,
  enrichedPlans: ReturnType<typeof enrichPlan>[],
  priceMap: Map<string, PriceEntry>,
  avgCostMap: Map<string, number>,
) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  for (const plan of enrichedPlans) {
    const p = plan as unknown as RichPlan & {
      id: string; name?: string | null; drawdownFromAth: number | null;
      frequency: import('@prisma/client').DcaFrequency;
      intervalDays?: number | null; scheduledTime?: string | null;
      nextPurchaseDate?: string | null; allocations: AllocWithAsset[];
      suggestedAmount: number; suggestedSellAmount: number | null;
    };

    // Compute the effective next purchase date dynamically so stale DB dates don't break checks
    const effectiveNext = p.nextPurchaseDate
      ? computeNextPurchaseDate(
          new Date(p.nextPurchaseDate),
          p.frequency,
          p.intervalDays,
          p.scheduledTime,
        ).toISOString().slice(0, 10)
      : null;

    const label = p.name ?? p.allocations.map(a => a.asset.symbol).join('/');

    // DCA_REMINDER: notify the day before AND on the day itself
    if (effectiveNext === tomorrowStr) {
      await maybeNotify(userId, 'DCA_REMINDER', 'DCA purchase tomorrow',
        `Your plan "${label}" is scheduled for tomorrow.`,
        { planId: p.id },
      );
    }
    if (effectiveNext === todayStr) {
      await maybeNotify(userId, 'DCA_REMINDER', 'DCA purchase today',
        `Today is your scheduled purchase day for plan "${label}".`,
        { planId: p.id, day: 'today' },
      );
    }

    // Only fire rule notifications on the plan's scheduled purchase date
    const isScheduledToday = effectiveNext === todayStr;

    if (isScheduledToday) {
      const drawdownPct = p.drawdownFromAth !== null ? Math.abs(p.drawdownFromAth) : null;
      if (drawdownPct !== null && p.suggestedAmount > p.amountUsd) {
        await maybeNotify(userId, 'BUYING_RULE_MET', 'Buy rule triggered',
          `Plan "${label}" is down ${drawdownPct.toFixed(1)}% from ATH - a buying rule is active for today's purchase.`,
          { planId: p.id },
        );
      }
      if (p.suggestedSellAmount !== null) {
        await maybeNotify(userId, 'SELL_RULE_MET', 'Take-profit rule triggered',
          `A sell rule is active for plan "${label}" today.`,
          { planId: p.id },
        );
      }
    }
  }
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

    // Build avg cost + net holdings per assetId from all user transactions
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId! },
      select: { assetId: true, type: true, amountUsd: true, quantity: true },
    });
    const buyTotals = new Map<string, { invested: number; qty: number }>();
    const netQtyMap = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type === 'BUY') {
        const cur = buyTotals.get(tx.assetId) ?? { invested: 0, qty: 0 };
        buyTotals.set(tx.assetId, { invested: cur.invested + tx.amountUsd, qty: cur.qty + tx.quantity });
      }
      const net = netQtyMap.get(tx.assetId) ?? 0;
      netQtyMap.set(tx.assetId, tx.type === 'BUY' ? net + tx.quantity : net - tx.quantity);
    }
    const avgCostMap = new Map<string, number>();
    for (const [assetId, { invested, qty }] of buyTotals) {
      avgCostMap.set(assetId, qty > 0 ? invested / qty : 0);
    }
    // Holdings value map: assetId → current USD value of net holdings
    const holdingsValueMap = new Map<string, number>();
    for (const [assetId, netQty] of netQtyMap) {
      const symbol = [...(plans as RichPlan[])]
        .flatMap(p => p.allocations)
        .find(a => a.assetId === assetId)?.asset.symbol;
      const price = symbol ? (priceMap.get(symbol)?.priceUsd ?? 0) : 0;
      holdingsValueMap.set(assetId, Math.max(0, netQty) * price);
    }

    const enriched = (plans as RichPlan[]).map((plan) => enrichPlan(plan, priceMap, avgCostMap, holdingsValueMap));

    // Fire-and-forget: create rule-met notifications (don't await to avoid slowing response)
    void fireRuleNotifications(req.userId!, enriched, priceMap, avgCostMap).catch(() => {});

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
    const nextPurchaseDate = computeNextPurchaseDate(startDate, body.data.frequency, body.data.intervalDays, body.data.scheduledTime);
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

    const updateSchema = planSchema.partial();
    const body = updateSchema.safeParse(req.body);
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

    const { allocations, ...planData } = body.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma as any).$transaction(async (tx: any) => {
      // Build update payload explicitly, never spread unknown fields into Prisma
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {};
      if (planData.name        !== undefined) updateData.name        = planData.name;
      if (planData.amountUsd   !== undefined) updateData.amountUsd   = planData.amountUsd;
      if ('maxBudgetUsd' in planData) updateData.maxBudgetUsd = (planData as Record<string, unknown>).maxBudgetUsd ?? null;
      if (planData.frequency   !== undefined) updateData.frequency   = planData.frequency;
      if (planData.intervalDays!== undefined) updateData.intervalDays= planData.intervalDays;
      if (planData.notes       !== undefined) updateData.notes       = planData.notes;
      if (planData.startDate   !== undefined) updateData.startDate   = new Date(planData.startDate as string);
      if (planData.endDate     !== undefined) {
        updateData.endDate = planData.endDate ? new Date(planData.endDate as string) : null;
      }

      // Recalculate nextPurchaseDate whenever start date, frequency or interval changes
      if (planData.scheduledTime !== undefined) updateData.scheduledTime = planData.scheduledTime;

      if (planData.startDate !== undefined || planData.frequency !== undefined || planData.intervalDays !== undefined || planData.scheduledTime !== undefined) {
        const base          = updateData.startDate    ?? plan.startDate;
        const freq          = (updateData.frequency   ?? plan.frequency) as import('@prisma/client').DcaFrequency;
        const intervalDays  = updateData.intervalDays !== undefined ? updateData.intervalDays : plan.intervalDays;
        const scheduledTime = updateData.scheduledTime ?? plan.scheduledTime;
        updateData.nextPurchaseDate = computeNextPurchaseDate(base, freq, intervalDays, scheduledTime);
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

export async function getPlanStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const userId = req.userId!;

    const plan = await prisma.dcaPlan.findFirst({
      where: { id, userId },
      include: {
        allocations: { include: { asset: true }, orderBy: { allocationPct: 'desc' as const } },
        planBuyingRuleSets: { include: { ruleSet: { include: { rows: { orderBy: { sortOrder: 'asc' as const } } } } } },
        planSellRuleSets:   { include: { ruleSet: { include: { rows: { orderBy: { sortOrder: 'asc' as const } } } } } },
      },
    });
    if (!plan) return next(new AppError(404, 'Plan not found'));

    const assetIds  = plan.allocations.map((a) => a.assetId);
    const symbols   = plan.allocations.map((a) => a.asset.symbol);

    const [transactions, prices] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, assetId: { in: assetIds } },
        include: { asset: true },
        orderBy: { purchasedAt: 'asc' },
      }),
      prisma.priceCache.findMany({ where: { symbol: { in: symbols } } }),
    ]);

    const priceMap = new Map(prices.map((p) => [p.symbol, p.priceUsd]));
    const athMap   = new Map(prices.map((p) => [p.symbol, p.ath ?? null]));

    const assetStats = plan.allocations.map((alloc) => {
      const { asset } = alloc;
      const txs        = transactions.filter((t) => t.assetId === asset.id);
      const buys       = txs.filter((t) => t.type === 'BUY');
      const sells      = txs.filter((t) => t.type === 'SELL');
      const totalInvested  = buys.reduce((s, t) => s + t.amountUsd, 0);
      const totalBuyQty    = buys.reduce((s, t) => s + t.quantity, 0);
      const totalSellQty   = sells.reduce((s, t) => s + t.quantity, 0);
      const totalQuantity  = totalBuyQty - totalSellQty;
      const avgCost        = totalBuyQty > 0 ? totalInvested / totalBuyQty : 0;
      const currentPrice   = priceMap.get(asset.symbol) ?? 0;
      const currentValue   = totalQuantity * currentPrice;
      const realizedPnl    = sells.reduce((s, t) => s + (t.amountUsd - t.quantity * avgCost), 0);
      const unrealizedPnl  = currentValue - totalQuantity * avgCost;
      const pnl            = realizedPnl + unrealizedPnl;
      const pnlPercent     = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
      const ath            = athMap.get(asset.symbol) ?? null;
      const drawdownFromAth =
        ath && ath > 0 && currentPrice > 0 ? ((currentPrice - ath) / ath) * 100 : null;

      return { asset, allocationPct: alloc.allocationPct, totalInvested, totalQuantity, avgCost, currentPrice, currentValue, pnl, pnlPercent, txCount: txs.length, ath, drawdownFromAth };
    });

    const totalInvested    = assetStats.reduce((s, a) => s + a.totalInvested, 0);
    const totalCurrentValue = assetStats.reduce((s, a) => s + a.currentValue, 0);
    const totalPnl         = totalCurrentValue - totalInvested;
    const totalPnlPercent  = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    // Monthly chart, last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyMap = new Map<string, number>();
    transactions
      .filter((t) => t.purchasedAt >= twelveMonthsAgo && t.type === 'BUY')
      .forEach((t) => {
        const key = t.purchasedAt.toISOString().slice(0, 7);
        monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + t.amountUsd);
      });
    const monthlyData = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, invested]) => ({ month, invested }));

    // Recent transactions (newest first, capped at 50)
    const recentTransactions = [...transactions].reverse().slice(0, 50);

    // Build maps needed by enrichPlan (same logic as getDcaPlans)
    const enrichPriceMap = new Map(prices.map((p) => [p.symbol, { priceUsd: p.priceUsd, ath: p.ath ?? null }]));
    const avgCostMap = new Map(assetStats.map((s) => [s.asset.id, s.avgCost]));
    const holdingsValueMap = new Map(assetStats.map((s) => [s.asset.id, s.currentValue]));

    // Enrich the plan to get suggestedAllocations, drawdownFromAth, suggestedAmount
    // (same as getDcaPlans so the detail page has the same per-asset data as the list page)
    const enrichedPlan = enrichPlan(plan as unknown as RichPlan, enrichPriceMap, avgCostMap, holdingsValueMap);

    res.json({
      success: true,
      data: {
        plan: enrichedPlan,
        portfolio: { totalInvested, totalCurrentValue, totalPnl, totalPnlPercent },
        assetStats,
        monthlyData,
        recentTransactions,
        lastUpdated: new Date().toISOString(),
      },
    });
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
