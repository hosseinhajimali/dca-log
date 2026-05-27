import { Response, NextFunction } from 'express';
import { AssetType, DcaFrequency, GoalType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';

const VALID_ASSET_TYPES  = new Set<string>(['CRYPTO','METAL','STOCK','ETF','OTHER']);
const VALID_FREQUENCIES  = new Set<string>(['DAILY','WEEKLY','BIWEEKLY','MONTHLY','CUSTOM']);
const VALID_GOAL_TYPES   = new Set<string>(['ACCUMULATION','PORTFOLIO_VALUE','INVESTMENT_COMMITMENT']);

function toAssetType(v: unknown): AssetType {
  const s = String(v ?? '').toUpperCase();
  return (VALID_ASSET_TYPES.has(s) ? s : 'CRYPTO') as AssetType;
}
function toFrequency(v: unknown): DcaFrequency {
  const s = String(v ?? '').toUpperCase();
  return (VALID_FREQUENCIES.has(s) ? s : 'MONTHLY') as DcaFrequency;
}
function toGoalType(v: unknown): GoalType {
  const s = String(v ?? '').toUpperCase();
  return (VALID_GOAL_TYPES.has(s) ? s : 'ACCUMULATION') as GoalType;
}
function orUndef(v: unknown): string | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  return String(v);
}

// ─── Portable Import (v2 custom export format) ───────────────────────────────
//
// Adds/merges data - does NOT wipe existing records.
// Assets are matched by symbol; missing assets are created.
// Plans, transactions, and goals are always appended as new records.

export async function portableImport(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const data = req.body;

    if (!data?.version || !String(data.version).startsWith('2')) {
      res.status(400).json({
        success: false,
        error: 'Unsupported format. Only custom export v2 files can be imported.',
      });
      return;
    }

    const counts = { assets: 0, transactions: 0, plans: 0, goals: 0 };

    await prisma.$transaction(async (tx) => {
      // ── 1. Build symbol→id map from existing assets ──────────────────────
      const symbolToId = new Map<string, string>();
      const existing = await tx.asset.findMany({ where: { userId } });
      for (const a of existing) symbolToId.set(a.symbol.toUpperCase(), a.id);

      // ── 2. Create any missing assets referenced in the export ─────────────
      const exportedAssets: Record<string, unknown>[] = data.assets ?? [];
      for (const a of exportedAssets) {
        const sym = String(a.symbol).toUpperCase();
        if (symbolToId.has(sym)) continue;
        const created = await tx.asset.create({
          data: {
            userId,
            symbol: sym,
            name:          String(a.name ?? sym),
            assetType:     toAssetType(a.assetType),
            coingeckoId:   (a.coingeckoId as string) ?? null,
            color:         (a.color as string) ?? null,
            athOverride:   a.athOverride != null ? Number(a.athOverride) : null,
          },
        });
        symbolToId.set(sym, created.id);
        counts.assets++;
      }

      // Helper: resolve a symbol to an asset id (never throws, returns null if missing)
      const resolve = (symbol: string): string | null =>
        symbolToId.get(String(symbol).toUpperCase()) ?? null;

      // ── 3. Import transactions ────────────────────────────────────────────
      const txSections = data.transactions as Record<string, Record<string, unknown>[]> | undefined;
      if (txSections) {
        for (const [symbol, rows] of Object.entries(txSections)) {
          const assetId = resolve(symbol);
          if (!assetId) continue;
          for (const t of rows) {
            await tx.transaction.create({
              data: {
                userId,
                assetId,
                type:         (t.type as string) === 'SELL' ? 'SELL' : 'BUY',
                quantity:     Number(t.quantity) || 0,
                pricePerUnit: Number(t.pricePerUnit) || 0,
                amountUsd:    Number(t.amountUsd) || 0,
                purchasedAt:  new Date(t.date as string),
                exchange:     (t.exchange as string) || null,
                notes:        (t.notes as string) || null,
              },
            });
            counts.transactions++;
          }
        }
      }

      // ── 4. Import plans ───────────────────────────────────────────────────
      const exportedPlans: Record<string, unknown>[] = data.plans ?? [];
      for (const p of exportedPlans) {
        const plan = await tx.dcaPlan.create({
          data: {
            userId,
            name:          (p.name as string) || null,
            frequency:     toFrequency(p.frequency),
            intervalDays:  p.intervalDays != null ? Number(p.intervalDays) : null,
            amountUsd:     Number(p.amountUsd) || 0,
            isActive:      (p.isActive as boolean) ?? true,
            perAssetRules: (p.perAssetRules as boolean) ?? false,
            startDate:     p.startDate ? new Date(p.startDate as string) : new Date(),
            endDate:       p.endDate   ? new Date(p.endDate as string)   : null,
            scheduledTime: orUndef(p.scheduledTime),
            notes:         (p.notes as string) || null,
          },
        });

        const allocations = (p.allocations as Record<string, unknown>[]) ?? [];
        for (const alloc of allocations) {
          const assetId = resolve(alloc.symbol as string);
          if (!assetId) continue;
          await tx.planAllocation.create({
            data: { planId: plan.id, assetId, allocationPct: Number(alloc.allocationPct) || 0 },
          });
        }

        const buyingRules = (p.buyingRules as Record<string, unknown>[]) ?? [];
        for (const r of buyingRules) {
          await tx.buyingRule.create({
            data: {
              dcaPlanId:   plan.id,
              minDrawdown: Number(r.minDrawdown) || 0,
              maxDrawdown: Number(r.maxDrawdown) || 0,
              buyAmount:   Number(r.buyAmount)   || 0,
            },
          });
        }

        const sellRules = (p.sellRules as Record<string, unknown>[]) ?? [];
        for (const r of sellRules) {
          await tx.sellRule.create({
            data: {
              dcaPlanId:      plan.id,
              minProfit:      Number(r.minProfit)    || 0,
              maxProfit:      Number(r.maxProfit)    || 0,
              sellAmount:     Number(r.sellAmount)   || 0,
              sellAmountType: (r.sellAmountType as string) === 'PCT' ? 'PCT' : 'USD',
            },
          });
        }

        counts.plans++;
      }

      // ── 5. Import goals ───────────────────────────────────────────────────
      const exportedGoals: Record<string, unknown>[] = data.goals ?? [];
      for (const g of exportedGoals) {
        const assetId = g.asset ? resolve(g.asset as string) : null;
        await tx.goal.create({
          data: {
            userId,
            name:                 String(g.name || 'Imported goal'),
            type:                 toGoalType(g.type),
            notes:                (g.notes as string) || null,
            assetId,
            targetQty:            g.targetQty            != null ? Number(g.targetQty)            : null,
            targetValue:          g.targetValue          != null ? Number(g.targetValue)          : null,
            targetMonthlyAmount:  g.targetMonthlyAmount  != null ? Number(g.targetMonthlyAmount)  : null,
            startDate:            g.startDate  ? new Date(g.startDate as string)  : null,
            deadline:             g.deadline   ? new Date(g.deadline  as string)  : null,
            isCompleted:          (g.isCompleted as boolean) ?? false,
          },
        });
        counts.goals++;
      }
    });

    res.json({ success: true, data: { imported: counts } });
  } catch (err) {
    next(err);
  }
}
