import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';
import { fetchAndCachePrices } from '../services/priceService';
import { computeNextPurchaseDate } from '../services/dcaService';
import { maybeNotify } from '../services/notificationService';

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
    const cachedSymbols = new Set(prices.map((p) => p.symbol));
    const missingSymbols = symbols.filter((s) => !cachedSymbols.has(s));

    // If any asset has no cached price, trigger a background refresh (don't await, respond fast)
    if (missingSymbols.length > 0) {
      fetchAndCachePrices(missingSymbols).catch(console.error);
    }

    const priceMap = new Map(prices.map((p) => [p.symbol, p.priceUsd]));

    // Build ATH map from price cache
    const athMap = new Map(prices.map((p) => [p.symbol, p.ath ?? null]));

    // Per-asset stats
    const assetStats = assets.map((asset) => {
      const txs = transactions.filter((t) => t.assetId === asset.id);
      const buys = txs.filter((t) => t.type === 'BUY');
      const sells = txs.filter((t) => t.type === 'SELL');
      const totalInvested = buys.reduce((sum, t) => sum + t.amountUsd, 0);
      const totalSold = sells.reduce((sum, t) => sum + t.amountUsd, 0);
      const totalBuyQty = buys.reduce((sum, t) => sum + t.quantity, 0);
      const totalSellQty = sells.reduce((sum, t) => sum + t.quantity, 0);
      const totalQuantity = totalBuyQty - totalSellQty;
      const avgCost = totalBuyQty > 0 ? totalInvested / totalBuyQty : 0;
      const currentPrice = priceMap.get(asset.symbol) ?? 0;
      const currentValue = totalQuantity * currentPrice;
      const realizedPnl = totalSold - sells.reduce((sum, t) => sum + t.quantity * avgCost, 0);
      const unrealizedPnl = currentValue - (totalQuantity * avgCost);
      const pnl = realizedPnl + unrealizedPnl;
      const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

      // Prefer user-supplied ATH override, fall back to auto-fetched value
      const ath = asset.athOverride ?? athMap.get(asset.symbol) ?? null;
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

    // Build avg cost map per asset from all transactions
    const avgCostMap = new Map<string, number>();
    for (const stat of assetStats) {
      avgCostMap.set(stat.asset.id, stat.avgCost);
    }

    // Active plans, with next purchase date, suggested buy amount, and sell suggestions
    const activePlanRows = await prisma.dcaPlan.findMany({
      where: { userId },
      include: {
        allocations: { include: { asset: true }, orderBy: { allocationPct: 'desc' as const } },
        planBuyingRuleSets: { include: { ruleSet: { include: { rows: { orderBy: { sortOrder: 'asc' as const } } } } } },
        planSellRuleSets:   { include: { ruleSet: { include: { rows: { orderBy: { sortOrder: 'asc' as const } } } } } },
      },
      orderBy: { name: 'asc' as const },
    });

    function matchBuyRow(dd: number | null, rows: { params: unknown; multiplier: number; sortOrder: number }[]) {
      if (dd === null || rows.length === 0) return null;
      return [...rows]
        .sort((a, b) => b.sortOrder - a.sortOrder)
        .find(r => {
          const p = r.params as { minDrawdown?: number; maxDrawdown?: number };
          return p.minDrawdown != null && p.maxDrawdown != null && dd >= p.minDrawdown && dd <= p.maxDrawdown;
        }) ?? null;
    }

    const activePlanList = activePlanRows.map((plan) => {
      const activeBuySet = plan.planBuyingRuleSets.find(p => p.isActive);

      // Per-asset evaluation - each asset checked independently
      let total = 0;
      const suggestedAllocations = plan.allocations.map(alloc => {
        const price = priceMap.get(alloc.asset.symbol) ?? 0;
        const ath   = alloc.asset.athOverride ?? athMap.get(alloc.asset.symbol) ?? null;
        const dd    = ath && price > 0 ? Math.abs(((price - ath) / ath) * 100) : null;
        const baseShare = plan.amountUsd * (alloc.allocationPct / 100);
        const match = activeBuySet ? matchBuyRow(dd, activeBuySet.ruleSet.rows) : null;
        const amount = +(baseShare * (match ? match.multiplier : 1)).toFixed(2);
        total += amount;
        return { symbol: alloc.asset.symbol, color: alloc.asset.color, allocationPct: alloc.allocationPct, amount };
      });
      const suggestedAmount = +total.toFixed(2);

      // ── Sell suggestions ──────────────────────────────────────────────────
      const activeSellSet = plan.planSellRuleSets.find(p => p.isActive);
      const matchedSellAmounts: number[] = [];
      if (activeSellSet) {
        for (const alloc of plan.allocations) {
          const price   = priceMap.get(alloc.asset.symbol) ?? 0;
          const avgCost = avgCostMap.get(alloc.asset.id) ?? 0;
          const profitPct = avgCost > 0 && price > 0 ? ((price - avgCost) / avgCost) * 100 : null;
          for (const row of activeSellSet.ruleSet.rows) {
            const p = row.params as { minProfit?: number; maxProfit?: number };
            if (profitPct !== null && p.minProfit != null && p.maxProfit != null
                && profitPct >= p.minProfit && profitPct <= p.maxProfit) {
              matchedSellAmounts.push(row.sellAmount);
            }
          }
        }
      }
      const suggestedSellAmount = matchedSellAmounts.length > 0 ? Math.max(...matchedSellAmounts) : null;

      // Always recompute next date from the stored value so it stays current
      // even if the user hasn't recorded a purchase since the last scheduled date.
      const effectiveNext = plan.nextPurchaseDate
        ? computeNextPurchaseDate(
            plan.nextPurchaseDate,
            plan.frequency,
            plan.intervalDays,
            plan.scheduledTime,
          )
        : null;

      return {
        id:                   plan.id,
        name:                 plan.name ?? null,
        amountUsd:            plan.amountUsd,
        suggestedAmount,
        suggestedAllocations,
        suggestedSellAmount,
        frequency:            plan.frequency,
        nextPurchaseDate:     effectiveNext?.toISOString() ?? null,
        allocations:          plan.allocations.map((a) => ({
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

    const recentTxs = transactions.filter((t) => t.purchasedAt >= twelveMonthsAgo && t.type === 'BUY');
    const monthlyMap = new Map<string, number>();
    recentTxs.forEach((t) => {
      const key = t.purchasedAt.toISOString().slice(0, 7); // "YYYY-MM"
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + t.amountUsd);
    });
    const monthlyData = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, invested]) => ({ month, invested }));

    // Fire-and-forget: DCA reminder notifications from dashboard load
    void (async () => {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);

      for (const plan of activePlanRows) {
        const effectiveNext = plan.nextPurchaseDate
          ? computeNextPurchaseDate(
              plan.nextPurchaseDate,
              plan.frequency,
              plan.intervalDays,
              plan.scheduledTime,
            ).toISOString().slice(0, 10)
          : null;

        const label = plan.name ?? plan.allocations.map((a) => a.asset.symbol).join('/');

        if (effectiveNext === todayStr) {
          await maybeNotify(userId, 'DCA_REMINDER', 'DCA purchase today',
            `Today is your scheduled purchase day for plan "${label}".`,
            { planId: plan.id, day: 'today' },
          );
        } else if (effectiveNext === tomorrowStr) {
          await maybeNotify(userId, 'DCA_REMINDER', 'DCA purchase tomorrow',
            `Your plan "${label}" is scheduled for tomorrow.`,
            { planId: plan.id },
          );
        }
      }
    })().catch(() => {});

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
