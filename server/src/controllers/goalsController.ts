import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function daysUntil(deadline: Date | null): number | null {
  if (!deadline) return null;
  return Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);
}

// ─── LIST (with progress) ────────────────────────────────────────────────────

export async function listGoals(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;

    const goals = await prisma.goal.findMany({
      where: { userId },
      include: { asset: true },
      orderBy: { createdAt: 'asc' },
    });

    // ── Data needed for progress computation ──────────────────────────────
    // Current holdings per asset
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      select: { assetId: true, type: true, amountUsd: true, quantity: true, purchasedAt: true },
    });

    // Current prices
    const assets = await prisma.asset.findMany({ where: { userId } });
    const symbols = assets.map((a) => a.symbol);
    const prices = await prisma.priceCache.findMany({ where: { symbol: { in: symbols } } });
    const priceMap = new Map(prices.map((p) => [p.symbol, p.priceUsd]));

    // Total portfolio value
    const assetValueMap = new Map<string, number>();
    for (const asset of assets) {
      const qty = transactions
        .filter((t) => t.assetId === asset.id)
        .reduce((s, t) => t.type === 'SELL' ? s - t.quantity : s + t.quantity, 0);
      assetValueMap.set(asset.id, Math.max(qty, 0) * (priceMap.get(asset.symbol) ?? 0));
    }
    const totalPortfolioValue = Array.from(assetValueMap.values()).reduce((s, v) => s + v, 0);

    // Monthly investment totals, buys only
    const monthlyInvested = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'BUY') continue;
      const key = tx.purchasedAt.toISOString().slice(0, 7);
      monthlyInvested.set(key, (monthlyInvested.get(key) ?? 0) + tx.amountUsd);
    }

    // ── Compute progress for each goal ────────────────────────────────────
    const goalsWithProgress = goals.map((goal) => {
      let currentValue: number | null = null;
      let progressPct: number | null = null;
      let monthlyHistory: { month: string; invested: number }[] | null = null;

      if (goal.type === 'ACCUMULATION' && goal.assetId && goal.targetQty) {
        const assetTxs = transactions.filter((t) => t.assetId === goal.assetId);
        const qty = assetTxs.reduce((s, t) => t.type === 'SELL' ? s - t.quantity : s + t.quantity, 0);
        currentValue = Math.max(qty, 0);
        progressPct = Math.min((currentValue / goal.targetQty) * 100, 100);
      }

      if (goal.type === 'PORTFOLIO_VALUE' && goal.targetValue) {
        currentValue = totalPortfolioValue;
        progressPct = Math.min((totalPortfolioValue / goal.targetValue) * 100, 100);
      }

      if (goal.type === 'INVESTMENT_COMMITMENT' && goal.targetMonthlyAmount) {
        const now = new Date();
        // If a startDate is set, show months from then; otherwise last 12 months
        const from = goal.startDate
          ? new Date(goal.startDate.getFullYear(), goal.startDate.getMonth(), 1)
          : new Date(now.getFullYear(), now.getMonth() - 11, 1);
        const history: { month: string; invested: number; hit: boolean }[] = [];
        const cursor = new Date(from);
        while (cursor <= now) {
          const key = cursor.toISOString().slice(0, 7);
          const invested = monthlyInvested.get(key) ?? 0;
          history.push({ month: key, invested, hit: invested >= (goal.targetMonthlyAmount ?? 0) });
          cursor.setMonth(cursor.getMonth() + 1);
        }
        const hitCount = history.filter((h) => h.hit).length;
        progressPct = history.length > 0 ? Math.round((hitCount / history.length) * 100) : 0;
        currentValue = monthlyInvested.get(now.toISOString().slice(0, 7)) ?? 0;
        monthlyHistory = history.map(({ month, invested }) => ({ month, invested }));
      }

      return {
        id:                  goal.id,
        type:                goal.type,
        name:                goal.name,
        notes:               goal.notes,
        startDate:           goal.startDate?.toISOString() ?? null,
        deadline:            goal.deadline?.toISOString() ?? null,
        daysUntil:           daysUntil(goal.deadline),
        isCompleted:         goal.isCompleted,
        createdAt:           goal.createdAt.toISOString(),
        // type-specific
        asset:               goal.asset ? { id: goal.asset.id, symbol: goal.asset.symbol, name: goal.asset.name, color: goal.asset.color } : null,
        targetQty:           goal.targetQty,
        targetValue:         goal.targetValue,
        targetMonthlyAmount: goal.targetMonthlyAmount,
        // computed
        currentValue,
        progressPct,
        monthlyHistory,
      };
    });

    res.json({ success: true, data: goalsWithProgress });
  } catch (err) {
    next(err);
  }
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

export async function createGoal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { type, name, notes, assetId, targetQty, targetValue, targetMonthlyAmount, startDate, deadline } = req.body;

    if (!type || !name) {
      res.status(400).json({ success: false, error: 'type and name are required' });
      return;
    }

    const goal = await prisma.goal.create({
      data: {
        userId,
        type,
        name: name.trim(),
        notes: notes?.trim() || null,
        assetId:             assetId || null,
        targetQty:           targetQty != null ? Number(targetQty) : null,
        targetValue:         targetValue != null ? Number(targetValue) : null,
        targetMonthlyAmount: targetMonthlyAmount != null ? Number(targetMonthlyAmount) : null,
        startDate:           startDate ? new Date(startDate) : null,
        deadline:            deadline ? new Date(deadline) : null,
      },
      include: { asset: true },
    });

    res.status(201).json({ success: true, data: goal });
  } catch (err) {
    next(err);
  }
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────

export async function updateGoal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.goal.findFirst({ where: { id: id as string, userId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Goal not found' });
      return;
    }

    const { name, notes, assetId, targetQty, targetValue, targetMonthlyAmount, startDate, deadline, isCompleted } = req.body;

    const goal = await prisma.goal.update({
      where: { id: id as string },
      data: {
        ...(name !== undefined             && { name: name.trim() }),
        ...(notes !== undefined            && { notes: notes?.trim() || null }),
        ...(assetId !== undefined          && { assetId: assetId || null }),
        ...(targetQty !== undefined        && { targetQty: targetQty != null ? Number(targetQty) : null }),
        ...(targetValue !== undefined      && { targetValue: targetValue != null ? Number(targetValue) : null }),
        ...(targetMonthlyAmount !== undefined && { targetMonthlyAmount: targetMonthlyAmount != null ? Number(targetMonthlyAmount) : null }),
        ...(startDate !== undefined        && { startDate: startDate ? new Date(startDate) : null }),
        ...(deadline !== undefined         && { deadline: deadline ? new Date(deadline) : null }),
        ...(isCompleted !== undefined      && { isCompleted: Boolean(isCompleted) }),
      },
      include: { asset: true },
    });

    res.json({ success: true, data: goal });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function deleteGoal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existing = await prisma.goal.findFirst({ where: { id: id as string, userId } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Goal not found' });
      return;
    }

    await prisma.goal.delete({ where: { id: id as string } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
