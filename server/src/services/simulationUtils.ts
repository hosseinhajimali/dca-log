/**
 * Shared helpers for the DCA simulator and the backtest engine.
 * Extracted from simulatorController so both features use identical
 * schedule generation and price lookup behavior.
 */

import type { PriceSeries } from './historicalPriceService';

export type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';

/** Advance a date by one schedule step. */
export function advanceDate(d: Date, freq: Frequency | string, intervalDays = 30): Date {
  const next = new Date(d);
  switch (freq) {
    case 'DAILY':    next.setUTCDate(next.getUTCDate() + 1);    break;
    case 'WEEKLY':   next.setUTCDate(next.getUTCDate() + 7);    break;
    case 'BIWEEKLY': next.setUTCDate(next.getUTCDate() + 14);   break;
    case 'MONTHLY':  next.setUTCMonth(next.getUTCMonth() + 1);  break;
    case 'CUSTOM':   next.setUTCDate(next.getUTCDate() + intervalDays); break;
  }
  return next;
}

/** Generate all scheduled buy dates in [start, endMs]. */
export function generateSchedule(
  start: Date,
  endMs: number,
  freq: Frequency | string,
  intervalDays = 30,
): Date[] {
  const dates: Date[] = [];
  let current = new Date(start);
  while (current.getTime() <= endMs) {
    dates.push(new Date(current));
    current = advanceDate(current, freq, intervalDays);
  }
  return dates;
}

const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

/**
 * Binary-search the price series for the index of the entry closest to targetMs.
 * Returns -1 when the closest entry is further than 3 days away (data gap or
 * future date).
 */
export function findNearestPriceIndex(prices: PriceSeries, targetMs: number): number {
  if (prices.length === 0) return -1;
  let lo = 0, hi = prices.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (prices[mid][0] < targetMs) lo = mid + 1;
    else hi = mid;
  }
  let bestIdx = -1;
  let minDiff = Infinity;
  for (const idx of [lo, lo - 1]) {
    const c = prices[idx];
    if (!c) continue;
    const diff = Math.abs(c[0] - targetMs);
    if (diff < minDiff) { minDiff = diff; bestIdx = idx; }
  }
  return minDiff <= THREE_DAYS ? bestIdx : -1;
}

/**
 * Binary-search the price series for the price closest to targetMs.
 * Returns null when no entry is within 3 days (data gap or future date).
 */
export function findNearestPrice(prices: PriceSeries, targetMs: number): number | null {
  const idx = findNearestPriceIndex(prices, targetMs);
  return idx === -1 ? null : prices[idx][1];
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
