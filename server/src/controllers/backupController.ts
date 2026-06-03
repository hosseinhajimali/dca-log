import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';

// ─── DOWNLOAD ────────────────────────────────────────────────────────────────

export async function downloadBackup(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;

    const [
      assets, dcaPlans, allocations,
      buyingRuleSets, buyingRuleSetRows,
      sellRuleSets, sellRuleSetRows,
      planBuyingRuleSets, planSellRuleSets,
      goals, transactions,
    ] = await Promise.all([
      prisma.asset.findMany({ where: { userId } }),
      prisma.dcaPlan.findMany({ where: { userId } }),
      prisma.planAllocation.findMany({ where: { plan: { userId } } }),
      prisma.buyingRuleSet.findMany({ where: { userId } }),
      prisma.buyingRuleSetRow.findMany({ where: { ruleSet: { userId } } }),
      prisma.sellRuleSet.findMany({ where: { userId } }),
      prisma.sellRuleSetRow.findMany({ where: { ruleSet: { userId } } }),
      prisma.planBuyingRuleSet.findMany({ where: { plan: { userId } } }),
      prisma.planSellRuleSet.findMany({ where: { plan: { userId } } }),
      prisma.goal.findMany({ where: { userId } }),
      prisma.transaction.findMany({ where: { userId } }),
    ]);

    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      userId,
      data: {
        assets, dcaPlans, allocations,
        buyingRuleSets, buyingRuleSetRows,
        sellRuleSets, sellRuleSetRows,
        planBuyingRuleSets, planSellRuleSets,
        goals, transactions,
      },
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
      await tx.planBuyingRuleSet.deleteMany({ where: { plan: { userId } } });
      await tx.planSellRuleSet.deleteMany({ where: { plan: { userId } } });
      await tx.planAllocation.deleteMany({ where: { plan: { userId } } });
      await tx.dcaPlan.deleteMany({ where: { userId } });
      await tx.buyingRuleSetRow.deleteMany({ where: { ruleSet: { userId } } });
      await tx.sellRuleSetRow.deleteMany({ where: { ruleSet: { userId } } });
      await tx.buyingRuleSet.deleteMany({ where: { userId } });
      await tx.sellRuleSet.deleteMany({ where: { userId } });
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

    if (!backup?.version || !backup?.data) {
      res.status(400).json({ success: false, error: 'Invalid backup file format' });
      return;
    }

    if (backup.version < 2) {
      res.status(400).json({ success: false, error: 'Backup version 1 is no longer supported. This backup was created before rule sets were introduced.' });
      return;
    }

    const {
      assets = [], dcaPlans = [], allocations = [],
      buyingRuleSets = [], buyingRuleSetRows = [],
      sellRuleSets = [], sellRuleSetRows = [],
      planBuyingRuleSets = [], planSellRuleSets = [],
      goals = [], transactions = [],
    } = backup.data;

    // Helper: strip relation fields + parse dates, optionally replace id
    const RELATIONS = new Set([
      'user', 'asset', 'plan', 'dcaPlan', 'ruleSet',
      'allocations', 'transactions', 'goals', 'dcaPlans',
      'planAllocations', 'rows', 'planBuyingRuleSets', 'planSellRuleSets',
    ]);
    const cleanRow = (row: Record<string, unknown>, overrides?: Record<string, unknown>) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (RELATIONS.has(k)) continue;
        out[k] = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? new Date(v) : v;
      }
      return { ...out, ...overrides };
    };

    // Build ID remapping - generate new IDs for every entity to avoid unique conflicts
    const { randomUUID: createId } = await import('crypto');
    const assetIdMap   = new Map<string, string>();
    const planIdMap    = new Map<string, string>();
    const buySetIdMap  = new Map<string, string>();
    const sellSetIdMap = new Map<string, string>();

    for (const r of assets)       assetIdMap.set(r.id as string, createId());
    for (const r of dcaPlans)     planIdMap.set(r.id as string, createId());
    for (const r of buyingRuleSets)  buySetIdMap.set(r.id as string, createId());
    for (const r of sellRuleSets)    sellSetIdMap.set(r.id as string, createId());

    // Step 1 - wipe existing data in reverse FK order (committed before inserts)
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.goal.deleteMany({ where: { userId } });
    await prisma.planBuyingRuleSet.deleteMany({ where: { plan: { userId } } });
    await prisma.planSellRuleSet.deleteMany({ where: { plan: { userId } } });
    await prisma.planAllocation.deleteMany({ where: { plan: { userId } } });
    await prisma.dcaPlan.deleteMany({ where: { userId } });
    await prisma.buyingRuleSetRow.deleteMany({ where: { ruleSet: { userId } } });
    await prisma.sellRuleSetRow.deleteMany({ where: { ruleSet: { userId } } });
    await prisma.buyingRuleSet.deleteMany({ where: { userId } });
    await prisma.sellRuleSet.deleteMany({ where: { userId } });
    await prisma.asset.deleteMany({ where: { userId } });

    // Step 2 - re-insert with remapped IDs in FK order
    await prisma.$transaction(async (tx) => {
      if (assets.length)
        await tx.asset.createMany({ data: assets.map((r: Record<string, unknown>) =>
          cleanRow(r, { id: assetIdMap.get(r.id as string), userId })) });

      if (dcaPlans.length)
        await tx.dcaPlan.createMany({ data: dcaPlans.map((r: Record<string, unknown>) =>
          cleanRow(r, { id: planIdMap.get(r.id as string), userId, assetId: r.assetId ? assetIdMap.get(r.assetId as string) ?? null : null })) });

      if (allocations.length)
        await tx.planAllocation.createMany({ data: allocations.map((r: Record<string, unknown>) =>
          cleanRow(r, { id: createId(), planId: planIdMap.get(r.planId as string), assetId: assetIdMap.get(r.assetId as string) })) });

      if (buyingRuleSets.length)
        await tx.buyingRuleSet.createMany({ data: buyingRuleSets.map((r: Record<string, unknown>) =>
          cleanRow(r, { id: buySetIdMap.get(r.id as string), userId })) });

      if (buyingRuleSetRows.length)
        await tx.buyingRuleSetRow.createMany({ data: buyingRuleSetRows.map((r: Record<string, unknown>) =>
          cleanRow(r, { id: createId(), ruleSetId: buySetIdMap.get(r.ruleSetId as string) })) });

      if (sellRuleSets.length)
        await tx.sellRuleSet.createMany({ data: sellRuleSets.map((r: Record<string, unknown>) =>
          cleanRow(r, { id: sellSetIdMap.get(r.id as string), userId })) });

      if (sellRuleSetRows.length)
        await tx.sellRuleSetRow.createMany({ data: sellRuleSetRows.map((r: Record<string, unknown>) =>
          cleanRow(r, { id: createId(), ruleSetId: sellSetIdMap.get(r.ruleSetId as string) })) });

      if (planBuyingRuleSets.length)
        await tx.planBuyingRuleSet.createMany({ data: planBuyingRuleSets.map((r: Record<string, unknown>) =>
          cleanRow(r, { id: createId(), planId: planIdMap.get(r.planId as string), ruleSetId: buySetIdMap.get(r.ruleSetId as string) })) });

      if (planSellRuleSets.length)
        await tx.planSellRuleSet.createMany({ data: planSellRuleSets.map((r: Record<string, unknown>) =>
          cleanRow(r, { id: createId(), planId: planIdMap.get(r.planId as string), ruleSetId: sellSetIdMap.get(r.ruleSetId as string) })) });

      if (goals.length)
        await tx.goal.createMany({ data: goals.map((r: Record<string, unknown>) =>
          cleanRow(r, { id: createId(), userId, assetId: r.assetId ? assetIdMap.get(r.assetId as string) ?? null : null })) });

      if (transactions.length)
        await tx.transaction.createMany({ data: transactions.map((r: Record<string, unknown>) =>
          cleanRow(r, { id: createId(), userId, assetId: assetIdMap.get(r.assetId as string), dcaPlanId: r.dcaPlanId ? planIdMap.get(r.dcaPlanId as string) ?? null : null })) });
    });

    res.json({
      success: true,
      data: {
        restored: {
          assets: assets.length,
          dcaPlans: dcaPlans.length,
          allocations: allocations.length,
          buyingRuleSets: buyingRuleSets.length,
          sellRuleSets: sellRuleSets.length,
          planBuyingRuleSets: planBuyingRuleSets.length,
          planSellRuleSets: planSellRuleSets.length,
          goals: goals.length,
          transactions: transactions.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
