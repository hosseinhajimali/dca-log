/**
 * Shared rule evaluation logic for buying rule sets.
 *
 * This is the single source of truth for matching a market signal against
 * BuyingRuleSetRow rows. Both the live evaluators (dashboard, plans) and the
 * backtest engine import from here so the two can never drift apart.
 *
 * Strategy: DRAWDOWN_ATH. A row matches when the current drawdown percentage
 * falls inside [minDrawdown, maxDrawdown]. Rows are checked from highest
 * sortOrder to lowest, first match wins. No match means the caller should
 * fall back to the base 1x amount.
 */

export type BuyRuleRow = {
  params: unknown; // Prisma Json column; validated shape is strategy-specific
  multiplier: number;
  sortOrder: number;
};

/**
 * Match a drawdown percentage against rule set rows.
 * Returns the matching row, or null when drawdown is unknown or no row matches.
 */
export function matchBuyRow<T extends BuyRuleRow>(
  drawdownPct: number | null,
  rows: T[],
): T | null {
  if (drawdownPct === null || rows.length === 0) return null;
  return [...rows]
    .sort((a, b) => b.sortOrder - a.sortOrder)
    .find((r) => {
      const p = r.params as { minDrawdown?: number; maxDrawdown?: number };
      return p.minDrawdown != null && p.maxDrawdown != null
        && drawdownPct >= p.minDrawdown && drawdownPct <= p.maxDrawdown;
    }) ?? null;
}

/**
 * Drawdown percentage of a price against a reference high.
 * Returns null when inputs are unusable. Clamped to 0 when price >= high
 * (a price above the reference high is a 0% drawdown, not a negative one).
 */
export function drawdownPct(priceUsd: number, high: number | null | undefined): number | null {
  if (!high || high <= 0 || priceUsd <= 0) return null;
  return Math.max(0, ((high - priceUsd) / high) * 100);
}
