/**
 * Backtest engine. Pure function, no DB or network access.
 * See docs/backtest-design.md for the full design.
 *
 * Runs a buying rule set over a historical daily price series and, in the
 * same pass, a plain 1x DCA control with the same schedule and base amount.
 *
 * Honesty rules implemented here:
 * - The drawdown signal uses the point-in-time running maximum of the series
 *   (the ATH known on that date), never today's ATH.
 * - Scheduled dates with no price within 3 days are skipped and counted.
 * - The requested start is clamped to the first available data point and the
 *   clamp is reported so the UI can show a notice.
 */

import type { PriceSeries } from './historicalPriceService';
import { matchBuyRow, drawdownPct, type BuyRuleRow } from './ruleEvaluation';
import { generateSchedule, findNearestPriceIndex, round2, type Frequency } from './simulationUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BacktestInput {
  prices: PriceSeries;          // daily [timestampMs, priceUsd], ascending
  startMs: number;
  endMs: number;
  amountUsd: number;            // base buy per schedule step
  frequency: Frequency | string;
  intervalDays?: number;        // CUSTOM only
  rows: BuyRuleRow[];           // buying rule set rows (DRAWDOWN_ATH params)
}

export interface BacktestBuy {
  date: string;                 // YYYY-MM-DD
  price: number;
  multiplier: number;           // 1 when no row matched
  amountUsd: number;
  quantity: number;
  drawdownPct: number;          // point-in-time drawdown on that date
}

export interface BacktestSideSummary {
  totalInvested: number;
  totalQuantity: number;
  averageBuyPrice: number;
  finalValue: number;
  roiPct: number;
  buyCount: number;
}

export interface BacktestChartPoint {
  date: string;
  strategyValue: number;
  controlValue: number;
  strategyInvested: number;
  controlInvested: number;
  price: number;
  multiplier: number; // 1 when no rule row fired on this date
}

export interface BacktestResult {
  strategy: BacktestSideSummary;
  control: BacktestSideSummary;
  comparison: {
    deltaFinalValueUsd: number;
    deltaFinalValuePct: number;   // strategy ROI minus control ROI, percentage points
    deltaAverageBuyPrice: number; // negative means strategy bought cheaper
    deltaTotalInvested: number;
  };
  buys: BacktestBuy[];
  chartData: BacktestChartPoint[];
  skippedDates: number;
  dataStartDate: string;          // first available candle, YYYY-MM-DD
  requestedStartDate: string;     // what the caller asked for
  clamped: boolean;               // true when requested start predates the data
}

// ─── Engine ───────────────────────────────────────────────────────────────────

function toDateStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function runBacktest(input: BacktestInput): BacktestResult {
  const { prices, amountUsd, frequency, intervalDays, rows } = input;
  if (prices.length === 0) {
    throw new Error('runBacktest requires a non-empty price series.');
  }

  const firstDataMs = prices[0][0];
  const clamped = input.startMs < firstDataMs;
  const effectiveStartMs = Math.max(input.startMs, firstDataMs);

  // Point-in-time running maximum, runningMax[i] = max(prices[0..i]).
  const runningMax: number[] = new Array(prices.length);
  let max = -Infinity;
  for (let i = 0; i < prices.length; i++) {
    if (prices[i][1] > max) max = prices[i][1];
    runningMax[i] = max;
  }

  const schedule = generateSchedule(
    new Date(effectiveStartMs), input.endMs, frequency, intervalDays,
  );

  // Strategy accumulators
  let sInvested = 0, sQty = 0;
  // Control accumulators
  let cInvested = 0, cQty = 0;

  const buys: BacktestBuy[] = [];
  const chartData: BacktestChartPoint[] = [];
  let skippedDates = 0;

  for (const date of schedule) {
    const idx = findNearestPriceIndex(prices, date.getTime());
    if (idx === -1) { skippedDates++; continue; }

    const price = prices[idx][1];
    const dd = drawdownPct(price, runningMax[idx]) ?? 0;

    const match = matchBuyRow(dd, rows);
    const multiplier = match ? match.multiplier : 1;
    const buyUsd = multiplier * amountUsd;

    sInvested += buyUsd;
    sQty += buyUsd / price;
    cInvested += amountUsd;
    cQty += amountUsd / price;

    const dateStr = toDateStr(date.getTime());
    buys.push({
      date: dateStr,
      price: round2(price),
      multiplier,
      amountUsd: round2(buyUsd),
      quantity: buyUsd / price,
      drawdownPct: round2(dd),
    });
    chartData.push({
      date: dateStr,
      strategyValue: round2(sQty * price),
      controlValue: round2(cQty * price),
      strategyInvested: round2(sInvested),
      controlInvested: round2(cInvested),
      price: round2(price),
      multiplier,
    });
  }

  // Value both sides at the last candle inside the range (not today's price,
  // unless the range ends today).
  const lastIdx = findNearestPriceIndex(prices, input.endMs);
  const finalPrice = lastIdx !== -1
    ? prices[lastIdx][1]
    : (buys.length > 0 ? buys[buys.length - 1].price : prices[prices.length - 1][1]);

  const side = (invested: number, qty: number, count: number): BacktestSideSummary => ({
    totalInvested: round2(invested),
    totalQuantity: qty,
    averageBuyPrice: qty > 0 ? round2(invested / qty) : 0,
    finalValue: round2(qty * finalPrice),
    roiPct: invested > 0 ? round2(((qty * finalPrice - invested) / invested) * 100) : 0,
    buyCount: count,
  });

  const strategy = side(sInvested, sQty, buys.length);
  const control = side(cInvested, cQty, buys.length);

  return {
    strategy,
    control,
    comparison: {
      deltaFinalValueUsd: round2(strategy.finalValue - control.finalValue),
      deltaFinalValuePct: round2(strategy.roiPct - control.roiPct),
      deltaAverageBuyPrice: round2(strategy.averageBuyPrice - control.averageBuyPrice),
      deltaTotalInvested: round2(strategy.totalInvested - control.totalInvested),
    },
    buys,
    chartData,
    skippedDates,
    dataStartDate: toDateStr(firstDataMs),
    requestedStartDate: toDateStr(input.startMs),
    clamped,
  };
}
