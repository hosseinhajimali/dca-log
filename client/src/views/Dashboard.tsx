'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/useDashboard';
import { useGoals } from '@/hooks/useGoals';
import { useStore } from '@/store/useStore';
import { StatCard } from '@/components/ui/StatCard';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { Badge } from '@/components/ui/Badge';
import { useCurrencyFormatter, formatDate, formatQuantity } from '@/lib/format';
import FearGreedWidget from '@/components/ui/FearGreedWidget';
import TransactionHeatmap from '@/components/TransactionHeatmap';
import { ActivePlanSummary, Goal } from '@/types';

function HoverTooltip({ message }: { message: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <>
      <span
        className="text-gray-500 cursor-help border-b border-dashed border-gray-600"
        title=""
        onMouseEnter={e => {
          const r = e.currentTarget.getBoundingClientRect();
          setPos({ x: r.left + r.width / 2, y: r.top });
        }}
        onMouseLeave={() => setPos(null)}
      >—</span>
      {pos && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none w-56 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-xs text-gray-300 shadow-lg"
          style={{ left: pos.x, top: pos.y - 8, transform: 'translate(-50%, -100%)' }}
        >
          {message}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
        </div>,
        document.body
      )}
    </>
  );
}

const COLORS = ['#0ecb81', '#3b82f6', '#f59e0b', '#f6465d', '#a78bfa', '#06b6d4', '#f97316'];

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', BIWEEKLY: 'Bi-weekly', MONTHLY: 'Monthly', CUSTOM: 'Custom',
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  // Parse date part as local time to avoid UTC-offset day shift
  const [datePart] = dateStr.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.round(diff / 86_400_000);
}

function ActivePlanCard({ plan, onClick }: { plan: ActivePlanSummary; onClick: () => void }) {
  const { format } = useCurrencyFormatter();
  const days = daysUntil(plan.nextPurchaseDate);
  const isBoosted = plan.suggestedAmount > plan.amountUsd;

  const urgency =
    days === null     ? 'gray'
    : days <= 0       ? 'green'   // today
    : days <= 3       ? 'yellow'
    : 'gray';

  const urgencyColors: Record<string, string> = {
    green:  'border-green-500/30 bg-green-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    gray:   'border-gray-800 bg-transparent',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-150 hover:border-gray-600 hover:bg-gray-800/50 hover:shadow-sm hover:-translate-y-px cursor-pointer ${urgencyColors[urgency]}`}
    >
      {/* Asset symbols */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap mb-2">
        <span className="font-bold font-mono text-sm">
          {(() => {
            const totalHoldings = plan.suggestedAllocations?.reduce((s, a) => s + (a.holdingsValue ?? 0), 0) ?? 0;
            return plan.allocations.map((a, i) => {
              const sa = plan.suggestedAllocations?.find(x => x.assetId === a.assetId);
              const target = a.allocationPct;
              const actual = totalHoldings > 0 && sa?.holdingsValue != null
                ? (sa.holdingsValue / totalHoldings) * 100
                : null;
              const diff = actual != null ? actual - target : null;
              const isOver  = diff != null && diff >  1;
              const isUnder = diff != null && diff < -1;
              return (
                <span key={a.asset.symbol}>
                  {i > 0 && <span className="text-gray-600 mx-1">·</span>}
                  <span style={a.asset.color ? { color: a.asset.color } : { color: '#f3f4f6' }}>
                    {a.asset.symbol}
                  </span>
                  {plan.allocations.length > 1 && (
                    <span className="inline-flex flex-col leading-none gap-px ml-0.5 align-middle">
                      <span className="text-gray-600 text-[10px] font-normal">{target}%</span>
                      {actual != null && (
                        <span className={`text-[10px] font-normal ${isOver ? 'text-green-400' : isUnder ? 'text-red-400' : 'text-gray-500'}`}>
                          {isOver ? '↑' : isUnder ? '↓' : '≈'}{actual.toFixed(0)}%
                        </span>
                      )}
                    </span>
                  )}
                </span>
              );
            });
          })()}
        </span>
        {plan.name && <span className="text-xs text-gray-500">({plan.name})</span>}
        <Badge variant="blue">{FREQ_LABELS[plan.frequency] ?? plan.frequency}</Badge>
      </div>

      <div className="space-y-1.5 mt-3">
        <div>
          <p className="text-xs text-gray-600 mb-0.5">Suggested buy</p>
          <div className="flex gap-2 items-baseline">
            {isBoosted && (
                <span className="text-xs text-gray-500 line-through">{format(plan.amountUsd)}</span>
            )}
            <span className={`text-sm font-bold font-mono ${isBoosted ? 'text-brand-400' : 'text-gray-200'}`}>{format(plan.suggestedAmount)}</span>
          </div>
          {/* Per-asset breakdown, only show when there are multiple assets */}
          {plan.suggestedAllocations?.length > 1 && (
              <div className="mt-3 space-y-0.5">
                {plan.suggestedAllocations.map(a => (
                    <p key={a.symbol} className="text-xs font-mono flex items-center gap-1">
                    <span style={a.color ? { color: a.color } : { color: '#9ca3af' }}>
                      {a.symbol}
                    </span>
                      <span className="text-gray-400">{format(a.amount)}</span>
                    </p>
                ))}
              </div>
          )}
        </div>
        {plan.suggestedSellAmount != null && (
            <div>
              <p className="text-xs text-gray-600 mb-0.5">Suggested sell</p>
              <p className="text-sm font-bold font-mono text-amber-400">
                {format(plan.suggestedSellAmount)}
              </p>
            </div>
        )}
      </div>

      {/* Next date + amount */}
      <div className="mt-3">
        <p className="text-xs text-gray-600 mb-0.5">Next purchase</p>
        {plan.nextPurchaseDate ? (
            <p className={`text-sm font-medium ${days !== null && days <= 0 ? 'text-green-400' : days !== null && days <= 3 ? 'text-yellow-400' : 'text-gray-300'}`}>
              {days !== null && days <= 0
                  ? 'Today'
                  : days === 1
                      ? 'Tomorrow'
                      : days !== null
                          ? `in ${days} days`
                          : '—'}
              <span className="text-gray-600 font-normal text-xs ml-1.5">
                {formatDate(plan.nextPurchaseDate)}
              </span>
            </p>
        ) : (
            <p className="text-sm text-gray-600">Not scheduled</p>
        )}
      </div>

      {/* Rule labels */}
      <div className="mt-3 pt-3 border-t border-gray-800 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-600">Buying rule</span>
          <span className="text-xs text-gray-400 font-medium truncate max-w-[60%] text-right">{plan.buyingRuleName ?? 'None'}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-600">Selling rule</span>
          <span className="text-xs text-gray-400 font-medium truncate max-w-[60%] text-right">{plan.sellingRuleName ?? 'None'}</span>
        </div>
      </div>
    </button>
  );
}

const GOAL_TYPE_LABEL: Record<string, string> = {
  ACCUMULATION: 'Accumulation',
  PORTFOLIO_VALUE: 'Portfolio Value',
  INVESTMENT_COMMITMENT: 'Commitment',
};

function GoalsSummary({ goals }: { goals: Goal[] }) {
  const { format } = useCurrencyFormatter();
  const router = useRouter();
  const active = goals.filter(g => !g.isCompleted && (g.progressPct ?? 0) < 100);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">Goals</h2>
        <button
          onClick={() => router.push('/app/goals')}
          className="text-xs text-gray-500 hover:text-brand-400 transition-all duration-150 hover:gap-1 group flex items-center gap-0.5"
        >
          View all <span className="inline-block transition-transform duration-150 group-hover:translate-x-0.5">→</span>
        </button>
      </div>

      {active.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-600">No active goals.</p>
          <button
            onClick={() => router.push('/app/goals')}
            className="mt-2 text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            Set a goal →
          </button>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {active.map(goal => {
            const pct = goal.progressPct ?? 0;
            const clampedPct = Math.min(pct, 100);
            return (
              <button
                key={goal.id}
                onClick={() => router.push(`/app/goals?goal=${goal.id}`)}
                className="text-left p-4 rounded-xl border border-gray-800 hover:border-gray-600 hover:bg-gray-800/50 transition-all duration-150 hover:-translate-y-px space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{goal.name}</p>
                    {goal.asset && (
                      <p className="text-xs mt-0.5" style={goal.asset.color ? { color: goal.asset.color } : { color: '#6b7280' }}>
                        {goal.asset.symbol}
                      </p>
                    )}
                  </div>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 shrink-0 whitespace-nowrap">
                    {GOAL_TYPE_LABEL[goal.type] ?? goal.type}
                  </span>
                </div>

                {goal.type === 'ACCUMULATION' && goal.targetQty != null && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{formatQuantity(goal.currentValue ?? 0)} / {formatQuantity(goal.targetQty)} {goal.asset?.symbol}</span>
                      <span className="font-mono text-brand-400 font-semibold">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${clampedPct}%` }} />
                    </div>
                  </div>
                )}

                {goal.type === 'PORTFOLIO_VALUE' && goal.targetValue != null && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{format(goal.currentValue ?? 0)} / {format(goal.targetValue)}</span>
                      <span className="font-mono text-brand-400 font-semibold">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${clampedPct}%` }} />
                    </div>
                  </div>
                )}

                {goal.type === 'INVESTMENT_COMMITMENT' && goal.targetMonthlyAmount != null && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>This month: {format(goal.currentValue ?? 0)} / {format(goal.targetMonthlyAmount)}</span>
                      <span className="font-mono text-brand-400 font-semibold" title="Share of all tracked months in which you met your monthly target">{pct}% of all months hit</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((goal.currentValue ?? 0) / goal.targetMonthlyAmount * 100, 100)}%`,
                          background: (goal.currentValue ?? 0) >= goal.targetMonthlyAmount ? '#0ecb81' : '#6366f1',
                        }}
                      />
                    </div>
                  </div>
                )}

                {(goal.deadline || goal.pace) && (
                  <div className="flex items-center justify-between gap-2">
                    {goal.deadline ? (
                      <p className={`text-xs ${(goal.daysUntil ?? Infinity) < 0 ? 'text-red-400' : (goal.daysUntil ?? Infinity) <= 7 ? 'text-yellow-400' : 'text-gray-600'}`}>
                        {deadlineLabel(goal.daysUntil ?? null, goal.deadline)}
                      </p>
                    ) : <span />}
                    {goal.pace && <PaceChip pace={goal.pace} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PaceChip({ pace }: { pace: NonNullable<Goal['pace']> }) {
  const Icon = pace.status === 'ahead' ? TrendingUp : pace.status === 'behind' ? TrendingDown : Minus;
  const color =
    pace.status === 'ahead'
      ? 'text-green-600 dark:text-green-400'
      : pace.status === 'behind'
      ? 'text-red-600 dark:text-red-400'
      : 'text-gray-600 dark:text-gray-400';
  const months = Math.abs(pace.deltaMonths).toFixed(1);
  const label = pace.status === 'on_track' ? 'On pace' : `${months}mo ${pace.status}`;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}
      title={`Across ${pace.completedMonths} completed months, you are ${pace.status === 'on_track' ? 'on pace with' : pace.status + ' of'} your monthly commitment. The current month is not counted yet.`}
    >
      <Icon size={12} aria-hidden="true" />
      {label}
    </span>
  );
}

function deadlineLabel(daysUntil: number | null, deadline: string | null): string {
  if (!deadline) return '';
  if (daysUntil === null) return '';
  if (daysUntil < 0) return `${Math.abs(daysUntil)}d overdue`;
  if (daysUntil === 0) return 'Due today';
  if (daysUntil === 1) return 'Due tomorrow';
  if (daysUntil <= 30) return `${daysUntil}d left`;
  const months = Math.round(daysUntil / 30);
  return `~${months}mo left`;
}

const FREQ_TO_MONTHLY: Record<string, number> = {
  DAILY: 30,
  WEEKLY: 4.33,
  BIWEEKLY: 2.17,
  MONTHLY: 1,
  CUSTOM: 1,
};

function calcMonthlyUsd(plans: ActivePlanSummary[], field: 'amountUsd' | 'suggestedAmount'): number {
  return plans.reduce((sum, p) => {
    const multiplier = FREQ_TO_MONTHLY[p.frequency] ?? 1;
    return sum + p[field] * multiplier;
  }, 0);
}

export default function Dashboard() {
  const { data, isLoading, error } = useDashboard();
  const { data: goals = [] } = useGoals();
  const { format, formatPct } = useCurrencyFormatter();
  const router = useRouter();
  const theme = useStore((s) => s.theme);
  const user = useStore((s) => s.user);
  const isLight = theme === 'light' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-sm animate-pulse">Loading portfolio...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400 text-sm">Failed to load dashboard data.</div>
      </div>
    );
  }

  const { portfolio, assetStats, activePlans, activePlanList, monthlyData } = data;
  const isProfitable = portfolio.totalPnl >= 0;
  const isEmpty = assetStats.length === 0 && activePlans === 0 && portfolio.totalInvested === 0;

  // Pie chart data, use currentValue when price is known, fall back to totalInvested
  const rawPieData = assetStats.filter((a) => a.currentValue > 0 || a.totalInvested > 0);
  const pieDataValues = rawPieData.map((a) => a.currentValue > 0 ? a.currentValue : a.totalInvested);
  const totalPieValue = pieDataValues.reduce((s, v) => s + v, 0);
  const pieData = rawPieData.map((a, i) => ({
    name: a.asset.symbol,
    value: pieDataValues[i],
    pct: totalPieValue > 0 ? (pieDataValues[i] / totalPieValue) * 100 : 0,
  }));

  // Monthly chart data
  const chartData = monthlyData.map((d) => ({
    month: d.month,
    invested: Math.round(d.invested * 100) / 100,
  }));

  // DCA utilization vs monthly disposable income
  const monthlyBaseUsd      = calcMonthlyUsd(activePlanList, 'amountUsd');
  const monthlyRulesUsd     = calcMonthlyUsd(activePlanList, 'suggestedAmount');
  const rulesActive         = Math.abs(monthlyRulesUsd - monthlyBaseUsd) > 0.01;
  const incomeUsd           = user?.monthlyDisposableIncome ?? null;
  const basePct             = incomeUsd && incomeUsd > 0 ? (monthlyBaseUsd  / incomeUsd) * 100 : null;
  const rulesPct            = incomeUsd && incomeUsd > 0 ? (monthlyRulesUsd / incomeUsd) * 100 : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-100">Portfolio Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Last updated {formatDate(data.lastUpdated)} · {activePlans} active plan{activePlans !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Empty state banner */}
      {isEmpty && (
        <div className="bg-brand-500/10 border border-brand-500/30 rounded-2xl px-6 py-8 text-center">
          <p className="text-2xl mb-3">👋</p>
          <h2 className="text-lg font-semibold text-gray-100 mb-2">Welcome to DCAlog!</h2>
          <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
            Your dashboard is empty. Add your first asset and plan to get started, or jump straight in with ready-made sample data covering 17 months of BTC, ETH & Gold DCA.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a
              href="/app/plans"
              className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors"
            >
              Create your first plan
            </a>
            <a
              href="/app/settings/data#backup"
              className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white transition-colors"
            >
              Try with sample data
            </a>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Invested" value={format(portfolio.totalInvested)} />
        <StatCard label="Current Value"  value={format(portfolio.totalCurrentValue)} />
        <StatCard
          label="Total P&L"
          value={format(portfolio.totalPnl)}
          sub={formatPct(portfolio.totalPnlPercent)}
          positive={isProfitable}
          negative={!isProfitable}
        />
      </div>

      {/* DCA utilization banner */}
      {basePct !== null && !isEmpty && (
        <div className={`rounded-xl border overflow-hidden text-sm ${
          (rulesPct ?? basePct) > 30
            ? 'bg-yellow-500/5 border-yellow-500/25'
            : 'bg-gray-900 border-gray-800'
        }`}>
          {/* Header */}
          <div className="px-5 pt-3 pb-1 flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly DCA Usage</span>
            <InfoTooltip content="Shows how much of your monthly budget goes toward DCA. 'Scheduled' is your base plan with no rules applied. 'With buying rules' reflects the actual amount after any active buying rules (e.g. drawdown boosters) adjust it. If this reaches 30% or more, a high utilization warning appears as a reminder to review your budget." />
          </div>

          {/* Base row */}
          <div className="px-5 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-500 shrink-0">Scheduled</span>
                <span className="font-semibold font-mono text-brand-400">{basePct.toFixed(1)}%</span>
              </div>
              <span className="text-xs text-gray-600 whitespace-nowrap shrink-0">{format(monthlyBaseUsd)} / mo</span>
            </div>
            <span className="text-gray-500 text-xs">of monthly budget</span>
          </div>

          {/* Rules row — only shown when rules are actually doing something */}
          {rulesActive && rulesPct !== null && (
            <div className="px-5 py-2.5 pb-3 border-t border-gray-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-xs text-gray-500 shrink-0">With buying rules</span>
                  <span className={`font-semibold font-mono ${rulesPct > 30 ? 'text-yellow-400' : monthlyRulesUsd > monthlyBaseUsd ? 'text-brand-400' : 'text-green-400'}`}>
                    {rulesPct.toFixed(1)}%
                  </span>
                  {rulesPct > 30 && (
                    <span className="text-xs font-medium text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">High utilization</span>
                  )}
                </div>
                <span className="text-xs text-gray-600 whitespace-nowrap shrink-0">{format(monthlyRulesUsd)} / mo</span>
              </div>
              <span className="text-gray-500 text-xs">
                {monthlyRulesUsd > monthlyBaseUsd ? '↑ boosted by drawdown rules' : '↓ reduced by rules'}
              </span>
            </div>
          )}
        </div>
      )}
      {basePct === null && !isEmpty && activePlanList.length > 0 && (
        <div className="px-5 py-3 rounded-xl border border-dashed border-gray-800 text-xs text-gray-600 text-center">
          Set your monthly budget in{' '}
          <a href="/app/settings" className="text-brand-400 hover:text-brand-300 transition-colors">Settings</a>
          {' '}to see how much of your income goes to DCA.
        </div>
      )}

      {/* Active plans */}
      {activePlanList.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">Active Plans</h2>
            <button
              onClick={() => router.push('/app/plans')}
              className="text-xs text-gray-500 hover:text-brand-400 transition-all duration-150 hover:gap-1 group flex items-center gap-0.5"
            >
              Manage <span className="inline-block transition-transform duration-150 group-hover:translate-x-0.5">→</span>
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activePlanList.map(plan => (
              <ActivePlanCard
                key={plan.id}
                plan={plan}
                onClick={() => router.push(`/app/plans/${plan.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Goals overview */}
      <GoalsSummary goals={goals} />

      {/* Fear & Greed */}
      <FearGreedWidget hasCrypto={assetStats.some(a => a.asset.assetType === 'CRYPTO')} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly investment chart */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Monthly Investment (last 12 months)</h2>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e8ecf1' : '#1f2937'} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: isLight ? '#ffffff' : '#111827', border: `1px solid ${isLight ? '#e8ecf1' : '#1f2937'}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  labelStyle={{ color: isLight ? '#475569' : '#9ca3af' }}
                  itemStyle={{ color: '#0ecb81' }}
                  cursor={{ fill: isLight ? '#f1f5f9' : '#1f2937' }}
                />
                <Bar dataKey="invested" fill="#0ecb81" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Portfolio allocation */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Allocation</h2>
          {pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">No assets yet</div>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: isLight ? '#ffffff' : '#111827', border: `1px solid ${isLight ? '#e8ecf1' : '#1f2937'}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    itemStyle={{ color: isLight ? '#1e293b' : '#f3f4f6' }}
                    labelStyle={{ color: isLight ? '#475569' : '#9ca3af' }}
                    formatter={(v: number, _name: string, props: { payload?: { pct?: number } }) => [
                      `${format(v)}  (${props.payload?.pct?.toFixed(1) ?? '0.0'}%)`,
                      'Value',
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Custom legend with percentages */}
              <div className="mt-3 space-y-1.5">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-400">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-gray-500">{format(d.value)}</span>
                      <span className="text-gray-200 font-semibold w-12 text-right">{d.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction activity heatmap */}
      <TransactionHeatmap hideFilters />

      {/* Asset breakdown table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">Asset Breakdown</h2>
        </div>
        {assetStats.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-600 text-sm">
            No assets yet. Add an asset to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
                  {['Asset', 'Total Amount', 'Invested', 'Current Value', 'Avg Buy', 'Current Price', 'P&L', 'Drawdown vs ATH', 'Purchases'].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assetStats.map((stat) => (
                  <tr key={stat.asset.id} className="hover:bg-gray-700/50 transition-colors border-b border-gray-700 last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono"
                        style={stat.asset.color ? { color: stat.asset.color } : undefined}
                      >{stat.asset.symbol}</span>
                        <Badge variant={stat.asset.assetType === 'CRYPTO' ? 'blue' : stat.asset.assetType === 'METAL' ? 'yellow' : 'gray'}>
                          {stat.asset.assetType}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{stat.asset.name}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-gray-300">
                      {formatQuantity(stat.totalQuantity)}
                      <span className="text-gray-600 text-xs ml-1">{stat.asset.symbol}</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-gray-300">{format(stat.totalInvested)}</td>
                    <td className="px-5 py-3.5 font-mono text-gray-300">{format(stat.currentValue)}</td>
                    <td className="px-5 py-3.5 font-mono text-gray-400">{format(stat.avgCost)}</td>
                    <td className="px-5 py-3.5 font-mono text-gray-400">{format(stat.currentPrice)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`font-mono font-medium ${stat.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {format(stat.pnl)}
                      </span>
                      <p className={`text-xs mt-0.5 ${stat.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stat.pnlPercent >= 0 ? '+' : ''}{stat.pnlPercent.toFixed(2)}%
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      {stat.drawdownFromAth === null ? (
                        <HoverTooltip message="ATH not yet available. You can set it manually in Settings → Assets → Edit asset." />
                      ) : stat.drawdownFromAth >= -0.5 ? (
                        <span className="text-green-400 font-mono font-medium text-xs">ATH 🔥</span>
                      ) : (
                        <div>
                          <span className="font-mono font-medium text-orange-400">
                            {stat.drawdownFromAth.toFixed(1)}%
                          </span>
                          <p className="text-xs text-gray-600 mt-0.5">
                            ATH {format(stat.ath!)}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{stat.txCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
