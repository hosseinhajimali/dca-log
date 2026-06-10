import { describe, it, expect } from 'vitest';
import { runBacktest } from '../backtestEngine';
import { matchBuyRow, drawdownPct } from '../ruleEvaluation';
import type { PriceSeries } from '../historicalPriceService';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2024, 0, 1); // 2024-01-01

/** Build a daily series from an array of prices starting at T0. */
function series(pricesUsd: number[]): PriceSeries {
  return pricesUsd.map((p, i) => [T0 + i * DAY, p] as [number, number]);
}

/** Conservative rule set: 20-40% drawdown -> 1.5x, 40-100% -> 2x. */
const ROWS = [
  { params: { minDrawdown: 20, maxDrawdown: 40 }, multiplier: 1.5, sortOrder: 0 },
  { params: { minDrawdown: 40, maxDrawdown: 100 }, multiplier: 2, sortOrder: 1 },
];

describe('drawdownPct', () => {
  it('computes a simple drawdown', () => {
    expect(drawdownPct(80, 100)).toBe(20);
  });

  it('clamps to 0 when price is above the high', () => {
    expect(drawdownPct(110, 100)).toBe(0);
  });

  it('returns null for unusable inputs', () => {
    expect(drawdownPct(100, null)).toBeNull();
    expect(drawdownPct(100, 0)).toBeNull();
    expect(drawdownPct(0, 100)).toBeNull();
  });
});

describe('matchBuyRow', () => {
  it('matches the row containing the drawdown', () => {
    expect(matchBuyRow(25, ROWS)?.multiplier).toBe(1.5);
    expect(matchBuyRow(50, ROWS)?.multiplier).toBe(2);
  });

  it('returns null below all bands and for null drawdown', () => {
    expect(matchBuyRow(5, ROWS)).toBeNull();
    expect(matchBuyRow(null, ROWS)).toBeNull();
  });

  it('prefers the highest sortOrder on overlap', () => {
    const overlapping = [
      { params: { minDrawdown: 0, maxDrawdown: 100 }, multiplier: 1.1, sortOrder: 0 },
      { params: { minDrawdown: 20, maxDrawdown: 60 }, multiplier: 3, sortOrder: 5 },
    ];
    expect(matchBuyRow(30, overlapping)?.multiplier).toBe(3);
  });
});

describe('runBacktest', () => {
  it('equals the control on a monotonic rise (no bands trigger)', () => {
    const prices = series([100, 101, 102, 103, 104, 105, 106, 107, 108, 109]);
    const result = runBacktest({
      prices,
      startMs: T0,
      endMs: T0 + 9 * DAY,
      amountUsd: 100,
      frequency: 'DAILY',
      rows: ROWS,
    });

    expect(result.strategy.totalInvested).toBe(result.control.totalInvested);
    expect(result.strategy.finalValue).toBe(result.control.finalValue);
    expect(result.comparison.deltaFinalValueUsd).toBe(0);
    expect(result.buys.every((b) => b.multiplier === 1)).toBe(true);
    expect(result.skippedDates).toBe(0);
    expect(result.clamped).toBe(false);
  });

  it('beats the control on a crash and recovery', () => {
    // Rise to 100, crash to 50 (50% drawdown), recover to 100.
    const prices = series([100, 90, 70, 50, 50, 60, 75, 90, 100, 100]);
    const result = runBacktest({
      prices,
      startMs: T0,
      endMs: T0 + 9 * DAY,
      amountUsd: 100,
      frequency: 'DAILY',
      rows: ROWS,
    });

    // Strategy invested more (multipliers fired during the dip)
    expect(result.strategy.totalInvested).toBeGreaterThan(result.control.totalInvested);
    // and bought cheaper on average
    expect(result.strategy.averageBuyPrice).toBeLessThan(result.control.averageBuyPrice);
    // so its ROI must be higher
    expect(result.strategy.roiPct).toBeGreaterThan(result.control.roiPct);
    expect(result.comparison.deltaFinalValuePct).toBeGreaterThan(0);
  });

  it('uses point-in-time running ATH, not the series maximum', () => {
    // Day 0 price 100 is the running ATH. A later peak of 200 must not
    // affect the drawdown computed for earlier dates.
    const prices = series([100, 80, 200, 200]);
    const result = runBacktest({
      prices,
      startMs: T0,
      endMs: T0 + 3 * DAY,
      amountUsd: 100,
      frequency: 'DAILY',
      rows: ROWS,
    });

    // Day 1: price 80 vs running ATH 100 = 20% drawdown -> 1.5x.
    // Against the full-series max of 200 it would be 60% -> 2x (wrong).
    expect(result.buys[1].drawdownPct).toBe(20);
    expect(result.buys[1].multiplier).toBe(1.5);
    // Day 2 and 3: price equals the new ATH, 0% drawdown -> 1x.
    expect(result.buys[2].multiplier).toBe(1);
    expect(result.buys[3].multiplier).toBe(1);
  });

  it('skips and counts dates with no price within 3 days', () => {
    // 15-day range, candles only on days 0-3 and day 14 (a 10-day hole).
    const prices: PriceSeries = [
      ...series([100, 100, 100, 100]),
      [T0 + 14 * DAY, 100],
    ];
    const result = runBacktest({
      prices,
      startMs: T0,
      endMs: T0 + 14 * DAY,
      amountUsd: 100,
      frequency: 'DAILY',
      rows: [],
    });

    // Days 0-3 buy directly, days 4-6 snap back to day 3, days 11-14 snap
    // forward to day 14. Days 7-10 are more than 3 days from any candle.
    expect(result.buys.length + result.skippedDates).toBe(15);
    expect(result.skippedDates).toBe(4);
  });

  it('clamps a start date before the data and reports it', () => {
    const prices = series([100, 100, 100]);
    const result = runBacktest({
      prices,
      startMs: T0 - 30 * DAY,
      endMs: T0 + 2 * DAY,
      amountUsd: 100,
      frequency: 'DAILY',
      rows: [],
    });

    expect(result.clamped).toBe(true);
    expect(result.dataStartDate).toBe('2024-01-01');
    expect(result.buys[0].date).toBe('2024-01-01');
  });

  it('falls back to 1x when no row matches', () => {
    const prices = series([100, 95, 90]); // max 10% drawdown, below all bands
    const result = runBacktest({
      prices,
      startMs: T0,
      endMs: T0 + 2 * DAY,
      amountUsd: 50,
      frequency: 'DAILY',
      rows: ROWS,
    });

    expect(result.buys.every((b) => b.multiplier === 1 && b.amountUsd === 50)).toBe(true);
    expect(result.strategy.totalInvested).toBe(150);
  });

  it('throws on an empty price series', () => {
    expect(() =>
      runBacktest({
        prices: [],
        startMs: T0,
        endMs: T0 + DAY,
        amountUsd: 100,
        frequency: 'DAILY',
        rows: [],
      }),
    ).toThrow();
  });
});
