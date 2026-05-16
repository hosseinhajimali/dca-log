import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';

export async function getDashboardStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;

    // All transactions for this user with asset info
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: { asset: true },
      orderBy: { purchasedAt: 'asc' },
    });

    // All assets with their price cache
    const assets = await prisma.asset.findMany({ where: { userId } });
    const symbols = assets.map((a) => a.symbol);
    const prices = await prisma.priceCache.findMany({
      where: { symbol: { in: symbols } },
    });
    const priceMap = new Map(prices.map((p) => [p.symbol, p.priceUsd]));

    // Build ATH map from price cache
    const athMap = new Map(prices.map((p) => [p.symbol, p.ath ?? null]));

    // Per-asset stats
    const assetStats = assets.map((asset) => {
      const txs = transactions.filter((t) => t.assetId === asset.id);
      const totalInvested = txs.reduce((sum, t) => sum + t.amountUsd, 0);
      const totalQuantity = txs.reduce((sum, t) => sum + t.quantity, 0);
      const avgCost = totalQuantity > 0 ? totalInvested / totalQuantity : 0;
      const currentPrice = priceMap.get(asset.symbol) ?? 0;
      const currentValue = totalQuantity * currentPrice;
      const pnl = currentValue - totalInvested;
      const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

      const ath = athMap.get(asset.symbol) ?? null;
      const drawdownFromAth =
        ath && ath > 0 && currentPrice > 0
          ? ((currentPrice - ath) / ath) * 100   // 0 = at ATH, negative = below ATH
          : null;

      return {
        asset,
        totalInvested,
        totalQuantity,
        avgCost,
        currentPrice,
        currentValue,
        pnl,
        pnlPercent,
        txCount: txs.length,
        ath,
        drawdownFromAth,
      };
    });

    // Portfolio totals
    const totalInvested = assetStats.reduce((sum, a) => sum + a.totalInvested, 0);
    const totalCurrentValue = assetStats.reduce((sum, a) => sum + a.currentValue, 0);
    const totalPnl = totalCurrentValue - totalInvested;
    const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

    // Active plans — with next purchase date and suggested amount
    const activePlanRows = await prisma.dcaPlan.findMany({
      where: { userId, isActive: true },
      include: {
        allocations: { include: { asset: true }, orderBy: { allocationPct: 'desc' as const } },
        buyingRules: true,
      },
      orderBy: { nextPurchaseDate: 'asc' as const },
    });

    const activePlanList = activePlanRows.map((plan) => {
      // Compute suggested amount: highest matched drawdown rule, else base amount
      let suggestedAmount = plan.amountUsd;
      const matchedAmounts: number[] = [];

      for (const alloc of plan.allocations) {
        const price = priceMap.get(alloc.asset.symbol) ?? 0;
        const ath   = athMap.get(alloc.asset.symbol) ?? null;
        const drawdownPct = ath && price > 0 ? ((price - ath) / ath) * 100 : null;

        for (const rule of plan.buyingRules) {
          if (rule.minDrawdown == null || rule.maxDrawdown == null) continue;
          if (drawdownPct !== null) {
            const dd = Math.abs(drawdownPct);
            if (dd >= rule.minDrawdown && dd <= rule.maxDrawdown) {
              matchedAmounts.push(rule.buyAmount);
            }
          }
        }
      }

      if (matchedAmounts.length > 0) {
        suggestedAmount = Math.max(plan.amountUsd, ...matchedAmounts);
      }

      return {
        id:               plan.id,
        name:             plan.name ?? null,
        amountUsd:        plan.amountUsd,
        suggestedAmount,
        frequency:        plan.frequency,
        nextPurchaseDate: plan.nextPurchaseDate?.toISOString() ?? null,
        allocations:      plan.allocations.map((a) => ({
          allocationPct: a.allocationPct,
          asset: { symbol: a.asset.symbol, color: a.asset.color },
        })),
      };
    });

    const activePlans = activePlanList.length;

    // Monthly invested (last 12 months for chart)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const recentTxs = transactions.filter((t) => t.purchasedAt >= twelveMonthsAgo);
    const monthlyMap = new Map<string, number>();
    recentTxs.forEach((t) => {
      const key = t.purchasedAt.toISOString().slice(0, 7); // "YYYY-MM"
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + t.amountUsd);
    });
    const monthlyData = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, invested]) => ({ month, invested }));

    res.json({
      success: true,
      data: {
        portfolio: { totalInvested, totalCurrentValue, totalPnl, totalPnlPercent },
        assetStats,
        activePlans,
        activePlanList,
        monthlyData,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}
