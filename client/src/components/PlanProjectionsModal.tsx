'use client';

import { useState, useMemo } from 'react';
import { X, TriangleAlert } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Goal, DcaPlan } from '@/types';
import { useDcaPlans } from '@/hooks/useDcaPlans';
import { useAssetPrice } from '@/hooks/usePrices';
import { useCurrencyFormatter, formatQuantity } from '@/lib/format';

// ─── Constants ────────────────────────────────────────────────────────────────

const LINE_COLORS = ['#3b82f6', '#f59e0b', '#0ecb81', '#8b5cf6', '#f6465d', '#06b6d4', '#ec4899'];
const COMBINED_COLOR = '#e5e7eb';

const GROWTH_OPTIONS = [
  { label: 'Conservative (10%/yr)', value: 10 },
  { label: 'Moderate (25%/yr)', value: 25 },
  { label: 'Optimistic (50%/yr)', value: 50 },
  { label: 'Custom', value: -1 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthlyAmount(plan: DcaPlan): number {
  const amt = plan.amountUsd;
  switch (plan.frequency) {
    case 'DAILY':    return amt * 30;
    case 'WEEKLY':   return amt * (52 / 12);
    case 'BIWEEKLY': return amt * (26 / 12);
    case 'MONTHLY':  return amt;
    case 'CUSTOM':   return amt * (30 / (plan.intervalDays ?? 30));
    default:         return amt;
  }
}

function totalProjectionMonths(deadline: string | null): number {
  if (!deadline) return 60;
  const ms = new Date(deadline).getTime() - Date.now();
  const months = Math.round(ms / (1000 * 60 * 60 * 24 * 30.44));
  return Math.max(3, Math.min(months, 120));
}

function monthLabel(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function xAxisInterval(totalMonths: number): number {
  if (totalMonths <= 12) return 1;
  if (totalMonths <= 24) return 2;
  if (totalMonths <= 48) return 5;
  return 11;
}

// ─── Projection types ─────────────────────────────────────────────────────────

interface PlanProjection {
  plan: DcaPlan;
  monthlyContrib: number;
  projectedFinal: number;
  chartKey: string;
  color: string;
}

interface ProjectionResult {
  chartData: Record<string, number | string>[];
  plans: PlanProjection[];
  combinedFinal: number;
  totalMonths: number;
}

// ─── Projection engines ───────────────────────────────────────────────────────

function buildAccumulationProjection(
  plans: DcaPlan[],
  goalAssetId: string,
  currentUnits: number,
  currentPrice: number,
  annualRatePct: number,
  totalMonths: number,
): ProjectionResult {
  const r = annualRatePct / 100 / 12;

  const planData = plans.map((plan, i) => {
    const alloc = plan.allocations.find(a => a.assetId === goalAssetId);
    const contrib = alloc ? (alloc.allocationPct / 100) * monthlyAmount(plan) : 0;
    return { plan, contrib, color: LINE_COLORS[i % LINE_COLORS.length], key: plan.id };
  });

  const unitAccum: Record<string, number> = {};
  planData.forEach(p => { unitAccum[p.key] = 0; });
  let combinedExtra = 0;

  const chartData: Record<string, number | string>[] = [];

  for (let m = 0; m <= totalMonths; m++) {
    const price = currentPrice * Math.pow(1 + r, m);
    const point: Record<string, number | string> = { label: monthLabel(m) };

    planData.forEach(p => {
      if (m > 0) unitAccum[p.key] += p.contrib > 0 ? p.contrib / price : 0;
      point[p.key] = parseFloat((currentUnits + unitAccum[p.key]).toFixed(8));
    });

    if (m > 0) {
      combinedExtra += planData.reduce((s, p) => s + (p.contrib > 0 ? p.contrib / price : 0), 0);
    }
    point['combined'] = parseFloat((currentUnits + combinedExtra).toFixed(8));

    chartData.push(point);
  }

  const projPlans: PlanProjection[] = planData.map(p => ({
    plan: p.plan,
    monthlyContrib: p.contrib,
    projectedFinal: chartData[totalMonths][p.key] as number,
    chartKey: p.key,
    color: p.color,
  }));

  return { chartData, plans: projPlans, combinedFinal: chartData[totalMonths]['combined'] as number, totalMonths };
}

function buildPortfolioProjection(
  plans: DcaPlan[],
  currentValue: number,
  annualRatePct: number,
  totalMonths: number,
): ProjectionResult {
  const r = annualRatePct / 100 / 12;

  const planData = plans.map((plan, i) => ({
    plan,
    contrib: monthlyAmount(plan),
    color: LINE_COLORS[i % LINE_COLORS.length],
    key: plan.id,
  }));

  const contribAccum: Record<string, number> = {};
  planData.forEach(p => { contribAccum[p.key] = 0; });
  let baseGrowth = currentValue;
  let combinedContrib = 0;

  const chartData: Record<string, number | string>[] = [];

  for (let m = 0; m <= totalMonths; m++) {
    if (m > 0) {
      baseGrowth *= (1 + r);
      planData.forEach(p => {
        contribAccum[p.key] = contribAccum[p.key] * (1 + r) + p.contrib;
      });
      combinedContrib = combinedContrib * (1 + r) + planData.reduce((s, p) => s + p.contrib, 0);
    }

    const point: Record<string, number | string> = { label: monthLabel(m) };
    planData.forEach(p => {
      point[p.key] = Math.round(baseGrowth + contribAccum[p.key]);
    });
    point['combined'] = Math.round(baseGrowth + combinedContrib);
    chartData.push(point);
  }

  const projPlans: PlanProjection[] = planData.map(p => ({
    plan: p.plan,
    monthlyContrib: p.contrib,
    projectedFinal: chartData[totalMonths][p.key] as number,
    chartKey: p.key,
    color: p.color,
  }));

  return { chartData, plans: projPlans, combinedFinal: chartData[totalMonths]['combined'] as number, totalMonths };
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active, payload, label, isAccumulation, assetSymbol, formatFn,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  isAccumulation: boolean;
  assetSymbol?: string;
  formatFn: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl min-w-[160px]">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-gray-300">{p.name}</span>
          </span>
          <span className="font-mono text-gray-100">
            {isAccumulation ? `${formatQuantity(p.value)} ${assetSymbol ?? ''}` : formatFn(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function PlanProjectionsModal({
  goal,
  onClose,
}: {
  goal: Goal;
  onClose: () => void;
}) {
  const { format } = useCurrencyFormatter();
  const { data: plans = [], isLoading: plansLoading } = useDcaPlans();
  const isAccumulation = goal.type === 'ACCUMULATION';

  // Fetch current price for accumulation goals (needed to convert fiat DCA to units)
  const { data: currentPrice, isLoading: priceLoading } = useAssetPrice(
    isAccumulation ? (goal.asset?.symbol ?? null) : null,
  );

  const [growthOption, setGrowthOption] = useState(25);
  const [customRate, setCustomRate] = useState('');

  const effectiveRate = growthOption === -1 ? (parseFloat(customRate) || 0) : growthOption;
  const totalMonths = totalProjectionMonths(goal.deadline);
  const target = isAccumulation ? (goal.targetQty ?? 0) : (goal.targetValue ?? 0);
  const currentVal = goal.currentValue ?? 0;

  // Build projection data
  const projection = useMemo<ProjectionResult | null>(() => {
    if (plansLoading) return null;
    if (isAccumulation) {
      if (!currentPrice || !goal.asset) return null;
      return buildAccumulationProjection(
        plans,
        goal.asset.id,
        currentVal,
        currentPrice,
        effectiveRate,
        totalMonths,
      );
    } else {
      return buildPortfolioProjection(plans, currentVal, effectiveRate, totalMonths);
    }
  }, [plans, plansLoading, isAccumulation, currentPrice, goal.asset, currentVal, effectiveRate, totalMonths]);

  const isLoading = plansLoading || (isAccumulation && priceLoading);

  // X-axis tick filter
  const tickInterval = xAxisInterval(totalMonths);

  function formatValue(v: number): string {
    return isAccumulation
      ? `${formatQuantity(v)} ${goal.asset?.symbol ?? ''}`
      : format(v);
  }

  function formatYAxis(v: number): string {
    if (isAccumulation) return formatQuantity(v);
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  }

  function gapLabel(projected: number): { text: string; cls: string } {
    const diff = projected - target;
    const reaches = projected >= target;
    if (reaches) {
      return { text: isAccumulation ? `+${formatQuantity(diff)} ${goal.asset?.symbol ?? ''}` : `+${format(diff)}`, cls: 'text-green-400' };
    }
    return { text: isAccumulation ? `-${formatQuantity(Math.abs(diff))} ${goal.asset?.symbol ?? ''}` : `-${format(Math.abs(diff))}`, cls: 'text-red-400' };
  }

  const deadlineStr = goal.deadline
    ? new Date(goal.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : `${totalMonths} months`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-2.5">
            <div>
              <h2 className="text-sm font-semibold text-gray-100">Plan Projections</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {goal.name} · target by {deadlineStr}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Growth rate selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 hidden sm:block">Annual growth</span>
              <select
                value={growthOption}
                onChange={(e) => setGrowthOption(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-brand-500"
              >
                {GROWTH_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {growthOption === -1 && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    step="1"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    placeholder="0"
                    className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 flex items-center justify-center transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <span className="text-gray-500 text-sm animate-pulse">Calculating projections…</span>
            </div>
          ) : !projection ? (
            <div className="flex items-center justify-center h-40">
              <span className="text-gray-500 text-sm">Could not load projection data.</span>
            </div>
          ) : (
            <>
              {/* Chart */}
              <div>
                <p className="text-xs text-gray-500 mb-3">
                  Projected {isAccumulation ? `${goal.asset?.symbol ?? ''} accumulated` : 'portfolio value'} over time
                  {isAccumulation && currentPrice && (
                    <span className="ml-1.5 text-gray-600">
                      (current price: {format(currentPrice)})
                    </span>
                  )}
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={projection.chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      interval={tickInterval}
                      tickLine={false}
                      axisLine={{ stroke: '#374151' }}
                    />
                    <YAxis
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      tickFormatter={formatYAxis}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                    />
                    <Tooltip
                      content={
                        <CustomTooltip
                          isAccumulation={isAccumulation}
                          assetSymbol={goal.asset?.symbol}
                          formatFn={format}
                        />
                      }
                    />
                    {/* Target reference line */}
                    <ReferenceLine
                      y={target}
                      stroke="#0ecb81"
                      strokeDasharray="5 4"
                      strokeWidth={1.5}
                      label={{ value: 'Target', fill: '#0ecb81', fontSize: 10, position: 'insideTopRight' }}
                    />
                    {/* Individual plan lines */}
                    {projection.plans.map((p) => (
                      <Line
                        key={p.chartKey}
                        type="monotone"
                        dataKey={p.chartKey}
                        name={p.plan.name ?? `Plan ${p.plan.id.slice(0, 6)}`}
                        stroke={p.color}
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray={!p.plan.isActive ? '4 3' : undefined}
                        opacity={p.monthlyContrib === 0 ? 0.3 : 1}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {projection.plans.map((p) => (
                    <span key={p.chartKey} className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span
                        className="w-3 h-0.5 shrink-0 rounded-full inline-block"
                        style={{
                          background: p.color,
                          opacity: p.monthlyContrib === 0 ? 0.3 : 1,
                          borderBottom: !p.plan.isActive ? '1px dashed' : undefined,
                        }}
                      />
                      {p.plan.name ?? `Plan ${p.plan.id.slice(0, 6)}`}
                      {!p.plan.isActive && <span className="text-gray-600">(inactive)</span>}
                    </span>
                  ))}
                  <span className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span className="w-3 border-t border-dashed border-green-500 shrink-0 inline-block" />
                    Target
                  </span>
                </div>
              </div>

              {/* Table */}
              <div>
                <p className="text-xs text-gray-500 mb-3">Projection at deadline ({deadlineStr})</p>
                <div className="rounded-xl border border-gray-700 overflow-hidden">
                  <table className="w-full text-xs bg-gray-900">
                    <thead>
                      <tr className="border-b border-gray-700 text-gray-500 text-left">
                        <th className="px-4 py-3 font-medium">Plan</th>
                        <th className="px-4 py-3 font-medium text-right">Monthly DCA</th>
                        <th className="px-4 py-3 font-medium text-right">
                          {isAccumulation ? `Projected ${goal.asset?.symbol ?? 'units'}` : 'Projected value'}
                        </th>
                        <th className="px-4 py-3 font-medium text-right">Gap</th>
                        <th className="px-4 py-3 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {projection.plans.map((p) => {
                        const gap = gapLabel(p.projectedFinal);
                        const reaches = p.projectedFinal >= target;
                        return (
                          <tr key={p.chartKey} className="hover:bg-gray-700/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                                <span className="text-gray-200">{p.plan.name ?? `Plan ${p.plan.id.slice(0, 6)}`}</span>
                                {!p.plan.isActive && (
                                  <span className="text-gray-600 text-xs">(inactive)</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-400 font-mono">
                              {p.monthlyContrib > 0 ? format(p.monthlyContrib) : <span className="text-gray-600">not allocated</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-200 font-mono">
                              {formatValue(p.projectedFinal)}
                            </td>
                            <td className={`px-4 py-3 text-right font-mono ${gap.cls}`}>
                              {gap.text}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {reaches ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-xs font-medium">
                                  Reaches goal
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-xs font-medium">
                                  Short
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                    </tbody>
                  </table>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-3">
                  <TriangleAlert size={12} className="shrink-0" />
                  Projections assume constant DCA at the selected annual growth rate. Actual results will vary.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
