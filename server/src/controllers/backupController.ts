import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';

// ─── DOWNLOAD ────────────────────────────────────────────────────────────────

export async function downloadBackup(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;

    const [assets, dcaPlans, allocations, buyingRules, sellRules, goals, transactions] = await Promise.all([
      prisma.asset.findMany({ where: { userId } }),
      prisma.dcaPlan.findMany({ where: { userId } }),
      prisma.planAllocation.findMany({ where: { plan: { userId } } }),
      prisma.buyingRule.findMany({ where: { dcaPlan: { userId } } }),
      prisma.sellRule.findMany({ where: { dcaPlan: { userId } } }),
      prisma.goal.findMany({ where: { userId } }),
      prisma.transaction.findMany({ where: { userId } }),
    ]);

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      userId,
      data: { assets, dcaPlans, allocations, buyingRules, sellRules, goals, transactions },
    };

    const filename = `dcalog_backup_${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(backup);
  } catch (err) {
    next(err);
  }
}

// ─── CLEAR ───────────────────────────────────────────────────────────────────

export async function clearAllData(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;

    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({ where: { userId } });
      await tx.goal.deleteMany({ where: { userId } });
      await tx.sellRule.deleteMany({ where: { dcaPlan: { userId } } });
      await tx.buyingRule.deleteMany({ where: { dcaPlan: { userId } } });
      await tx.planAllocation.deleteMany({ where: { plan: { userId } } });
      await tx.dcaPlan.deleteMany({ where: { userId } });
      await tx.asset.deleteMany({ where: { userId } });
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── RESTORE ─────────────────────────────────────────────────────────────────

export async function restoreBackup(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const backup = req.body;

    // Basic validation
    if (!backup?.version || !backup?.data) {
      res.status(400).json({ success: false, error: 'Invalid backup file format' });
      return;
    }

    const { assets = [], dcaPlans = [], allocations = [], buyingRules = [], sellRules = [], goals = [], transactions = [] } = backup.data;

    // Run everything in a transaction, all or nothing
    await prisma.$transaction(async (tx) => {
      // 1. Wipe existing data in reverse FK order
      await tx.transaction.deleteMany({ where: { userId } });
      await tx.goal.deleteMany({ where: { userId } });
      await tx.sellRule.deleteMany({ where: { dcaPlan: { userId } } });
      await tx.buyingRule.deleteMany({ where: { dcaPlan: { userId } } });
      await tx.planAllocation.deleteMany({ where: { plan: { userId } } });
      await tx.dcaPlan.deleteMany({ where: { userId } });
      await tx.asset.deleteMany({ where: { userId } });

      // 2. Re-insert in FK order, forcing userId to the authenticated user
      //    (strip relation fields, parse dates, override userId for security)
      const clean = (row: Record<string, unknown>, extra?: Record<string, unknown>) => {
        const RELATIONS = new Set(['user', 'asset', 'plan', 'dcaPlan', 'allocations', 'transactions', 'buyingRules', 'goals', 'dcaPlans', 'planAllocations']);
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          if (RELATIONS.has(k)) continue;
          out[k] = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? new Date(v) : v;
        }
        return { ...out, ...extra };
      };

      if (assets.length) {
        await tx.asset.createMany({ data: assets.map((r: Record<string, unknown>) => clean(r, { userId })) });
      }
      if (dcaPlans.length) {
        await tx.dcaPlan.createMany({ data: dcaPlans.map((r: Record<string, unknown>) => clean(r, { userId })) });
      }
      if (allocations.length) {
        await tx.planAllocation.createMany({ data: allocations.map((r: Record<string, unknown>) => clean(r)) });
      }
      if (buyingRules.length) {
        await tx.buyingRule.createMany({ data: buyingRules.map((r: Record<string, unknown>) => clean(r)) });
      }
      if (sellRules.length) {
        await tx.sellRule.createMany({ data: sellRules.map((r: Record<string, unknown>) => clean(r)) });
      }
      if (goals.length) {
        await tx.goal.createMany({ data: goals.map((r: Record<string, unknown>) => clean(r, { userId })) });
      }
      if (transactions.length) {
        await tx.transaction.createMany({ data: transactions.map((r: Record<string, unknown>) => clean(r, { userId })) });
      }
    });

    res.json({
      success: true,
      data: {
        restored: {
          assets: assets.length,
          dcaPlans: dcaPlans.length,
          allocations: allocations.length,
          buyingRules: buyingRules.length,
          sellRules: sellRules.length,
          goals: goals.length,
          transactions: transactions.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
