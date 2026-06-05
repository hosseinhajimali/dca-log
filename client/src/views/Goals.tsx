'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Layers, DollarSign, CalendarCheck, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, GoalPayload } from '@/hooks/useGoals';
import { useAssets } from '@/hooks/useAssets';
import { Goal, GoalType } from '@/types';
import type { LucideIcon } from 'lucide-react';
import { useCurrencyFormatter, formatQuantity } from '@/lib/format';
import PlanProjectionsModal from '@/components/PlanProjectionsModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { key: GoalType; label: string; description: string; detail: string }[] = [
  {
    key: 'ACCUMULATION',
    label: 'Accumulation',
    description: 'Track how much of a specific asset you\'ve stacked.',
    detail: 'Set a quantity target (e.g. 1 BTC or 10 ETH) and every buy you log moves the progress bar forward. Great for long-term stacking goals where you care about how many coins you own, not just their current dollar value.',
  },
  {
    key: 'PORTFOLIO_VALUE',
    label: 'Portfolio Value',
    description: 'Aim for a total portfolio value in USD.',
    detail: 'Set a dollar milestone (e.g. $50,000 or $1M) and watch your combined holdings grow toward it as prices rise and you keep buying. Useful for retirement targets, financial independence numbers, or any wealth milestone you\'re working toward.',
  },
  {
    key: 'INVESTMENT_COMMITMENT',
    label: 'Investment Commitment',
    description: 'Measure whether you\'re sticking to your DCA discipline.',
    detail: 'Set a monthly investment amount and track how many months you actually hit it. The bar chart shows each month at a glance: green means you met the target, gray means you fell short. Ideal for building and maintaining consistent investing habits.',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deadlineLabel(daysUntil: number | null, deadline: string | null): string {
  if (!deadline) return 'No deadline';
  if (daysUntil === null) return '';
  if (daysUntil < 0) return `${Math.abs(daysUntil)}d overdue`;
  if (daysUntil === 0) return 'Due today';
  if (daysUntil === 1) return 'Due tomorrow';
  if (daysUntil <= 30) return `${daysUntil}d left`;
  const months = Math.round(daysUntil / 30);
  return `~${months}mo left`;
}

function deadlineColor(daysUntil: number | null): string {
  if (daysUntil === null) return 'text-gray-500';
  if (daysUntil < 0) return 'text-red-400';
  if (daysUntil <= 7) return 'text-yellow-400';
  return 'text-gray-500';
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, completed }: { pct: number; completed: boolean }) {
  const clampedPct = Math.min(pct, 100);
  return (
    <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${completed ? 'bg-green-500' : clampedPct >= 80 ? 'bg-brand-400' : 'bg-brand-500'}`}
        style={{ width: `${clampedPct}%` }}
      />
    </div>
  );
}

// ─── Monthly bar mini-chart ───────────────────────────────────────────────────

function MonthlyBarsChart({
  history,
  target,
}: {
  history: { month: string; invested: number }[];
  target: number;
}) {
  const { format } = useCurrencyFormatter();
  const theme = useStore((s) => s.theme);
  const isLight = theme === 'light' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches);
  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={history} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis hide domain={[0, Math.max(target * 1.3, 1)]} />
        <Tooltip
          contentStyle={{ background: isLight ? '#ffffff' : '#111827', border: `1px solid ${isLight ? '#e8ecf1' : '#1f2937'}`, borderRadius: 8, fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
          labelStyle={{ color: isLight ? '#475569' : '#9ca3af' }}
          itemStyle={{ color: isLight ? '#1e293b' : '#e5e7eb' }}
          cursor={{ fill: isLight ? 'rgba(241,245,249,0.8)' : 'rgba(255,255,255,0.05)' }}
          formatter={(v: number) => [format(v), 'Invested']}
        />
        <Bar dataKey="invested" radius={[3, 3, 0, 0]}>
          {history.map((entry, i) => (
            <Cell key={i} fill={entry.invested >= target ? '#22c55e' : isLight ? '#cbd5e1' : '#6b7280'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Goal card ────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onToggleComplete,
  onProjections,
}: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: () => void;
  onProjections: () => void;
}) {
  const { format } = useCurrencyFormatter();
  const pct = goal.progressPct ?? 0;
  const done = goal.isCompleted || pct >= 100;

  return (
    <div className={`bg-gray-900 border rounded-xl p-5 flex flex-col gap-4 transition-opacity ${done ? 'border-green-500/30 opacity-75' : 'border-gray-800'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm truncate ${done ? 'line-through text-gray-500' : 'text-gray-100'}`}>
              {goal.name}
            </span>
            {done && <span className="text-xs text-green-400 font-medium">✓ Done</span>}
          </div>
          {goal.asset && (
            <p className="text-xs mt-0.5" style={goal.asset.color ? { color: goal.asset.color } : { color: '#9ca3af' }}>
              {goal.asset.symbol} · {goal.asset.name}
            </p>
          )}
          {goal.notes && <p className="text-xs text-gray-600 mt-1 truncate">{goal.notes}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggleComplete}
            title={goal.isCompleted ? 'Mark incomplete' : 'Mark complete'}
            className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center transition-colors ${goal.isCompleted ? 'bg-green-500/20 text-green-400 hover:bg-green-500/10' : 'text-gray-600 hover:text-green-400 hover:bg-green-500/10'}`}
          >
            ✓
          </button>
          <button onClick={onEdit} className="w-7 h-7 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-gray-800 text-xs flex items-center justify-center transition-colors">✎</button>
          <button onClick={onDelete} className="w-7 h-7 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 text-xs flex items-center justify-center transition-colors">✕</button>
        </div>
      </div>

      {/* Progress */}
      {goal.type === 'ACCUMULATION' && goal.targetQty != null && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">
              {formatQuantity(goal.currentValue ?? 0)} / {formatQuantity(goal.targetQty)} {goal.asset?.symbol}
            </span>
            <span className={`font-mono font-semibold ${done ? 'text-green-400' : 'text-brand-400'}`}>{pct.toFixed(1)}%</span>
          </div>
          <ProgressBar pct={pct} completed={done} />
        </div>
      )}

      {goal.type === 'PORTFOLIO_VALUE' && goal.targetValue != null && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">
              {format(goal.currentValue ?? 0)} / {format(goal.targetValue)}
            </span>
            <span className={`font-mono font-semibold ${done ? 'text-green-400' : 'text-brand-400'}`}>{pct.toFixed(1)}%</span>
          </div>
          <ProgressBar pct={pct} completed={done} />
        </div>
      )}

      {goal.type === 'INVESTMENT_COMMITMENT' && goal.targetMonthlyAmount != null && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">This month: {format(goal.currentValue ?? 0)} / {format(goal.targetMonthlyAmount)}</span>
            <span className="text-gray-500 font-mono">{pct}% months hit</span>
          </div>
          {goal.monthlyHistory && (
            <MonthlyBarsChart history={goal.monthlyHistory} target={goal.targetMonthlyAmount} />
          )}
        </div>
      )}

      {/* Deadline */}
      {goal.deadline && (
        <p className={`text-xs ${deadlineColor(goal.daysUntil)}`}>
          {deadlineLabel(goal.daysUntil, goal.deadline)}
          <span className="text-gray-700 ml-1.5">
            ({new Date(goal.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
          </span>
        </p>
      )}

      {/* Plan projections button */}
      {(goal.type === 'ACCUMULATION' || goal.type === 'PORTFOLIO_VALUE') && (
        <div className="flex items-center gap-1.5 mt-auto">
          <button
            onClick={onProjections}
            className="flex-1 text-xs font-medium text-gray-300 border border-gray-700 hover:border-brand-500 hover:text-brand-400 rounded-lg py-1.5 transition-colors"
          >
            Plan projections
          </button>
          <InfoTooltip content="See how each of your DCA plans projects toward this goal. Pick an assumed annual growth rate and compare projected values, gaps, and whether each plan gets you there by the deadline." />
        </div>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function GoalModal({
  activeTab,
  initial,
  onClose,
}: {
  activeTab: GoalType;
  initial?: Goal;
  onClose: () => void;
}) {
  const { data: assets = [] } = useAssets();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();

  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [assetId, setAssetId] = useState(initial?.asset?.id ?? '');
  const [targetQty, setTargetQty] = useState(initial?.targetQty?.toString() ?? '');
  const [targetValue, setTargetValue] = useState(initial?.targetValue?.toString() ?? '');
  const [targetMonthly, setTargetMonthly] = useState(initial?.targetMonthlyAmount?.toString() ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ? initial.startDate.slice(0, 10) : '');
  const [deadline, setDeadline] = useState(initial?.deadline ? initial.deadline.slice(0, 10) : '');
  const [error, setError] = useState('');

  const type = initial?.type ?? activeTab;
  const cryptoAssets = assets.filter((a) => a.assetType === 'CRYPTO' || a.assetType === 'METAL' || a.assetType === 'STOCK' || a.assetType === 'ETF' || a.assetType === 'OTHER');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }

    const payload: GoalPayload = {
      type,
      name: name.trim(),
      notes: notes.trim() || undefined,
      startDate: startDate || undefined,
      deadline: deadline || undefined,
    };

    if (type === 'ACCUMULATION') {
      if (!assetId) { setError('Select an asset'); return; }
      if (!targetQty || isNaN(Number(targetQty))) { setError('Enter a valid target quantity'); return; }
      payload.assetId = assetId;
      payload.targetQty = Number(targetQty);
    }
    if (type === 'PORTFOLIO_VALUE') {
      if (!targetValue || isNaN(Number(targetValue))) { setError('Enter a valid target value'); return; }
      payload.targetValue = Number(targetValue);
    }
    if (type === 'INVESTMENT_COMMITMENT') {
      if (!targetMonthly || isNaN(Number(targetMonthly))) { setError('Enter a valid monthly amount'); return; }
      payload.targetMonthlyAmount = Number(targetMonthly);
    }

    try {
      if (isEdit) {
        await updateGoal.mutateAsync({ id: initial!.id, ...payload });
      } else {
        await createGoal.mutateAsync(payload);
      }
      onClose();
    } catch {
      setError('Something went wrong. Please try again.');
    }
  }

  const isPending = createGoal.isPending || updateGoal.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-gray-100 mb-5">
          {isEdit ? 'Edit goal' : `New ${TABS.find(t => t.key === type)?.label} goal`}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Goal name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'ACCUMULATION' ? 'e.g. Stack 0.5 BTC' : type === 'PORTFOLIO_VALUE' ? 'e.g. Reach $50k portfolio' : 'e.g. $500/month discipline'}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* ACCUMULATION fields */}
          {type === 'ACCUMULATION' && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Asset</label>
                <select
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select asset…</option>
                  {cryptoAssets.map((a) => (
                    <option key={a.id} value={a.id}>{a.symbol} · {a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Target quantity</label>
                <input
                  type="number" step="any" min="0"
                  value={targetQty}
                  onChange={(e) => setTargetQty(e.target.value)}
                  placeholder="e.g. 0.5"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500"
                />
              </div>
            </>
          )}

          {/* PORTFOLIO_VALUE fields */}
          {type === 'PORTFOLIO_VALUE' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Target portfolio value (USD)</label>
              <input
                type="number" step="any" min="0"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500"
              />
            </div>
          )}

          {/* INVESTMENT_COMMITMENT fields */}
          {type === 'INVESTMENT_COMMITMENT' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Monthly investment target (USD)</label>
              <input
                type="number" step="any" min="0"
                value={targetMonthly}
                onChange={(e) => setTargetMonthly(e.target.value)}
                placeholder="e.g. 500"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500"
              />
            </div>
          )}

          {/* Start date */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Start date (optional)
              {type === 'INVESTMENT_COMMITMENT' && (
                <span className="ml-1.5 text-gray-600">(scopes which months count)</span>
              )}
              {type !== 'INVESTMENT_COMMITMENT' && (
                <span className="ml-1.5 text-gray-600">(when you started working on this)</span>
              )}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Deadline (optional)</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional context…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create goal'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-gray-400 hover:text-gray-200 border border-gray-700 text-sm py-2.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteModal({ goal, onConfirm, onCancel }: { goal: Goal; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
        <p className="text-sm text-gray-300">Delete goal <span className="font-semibold text-gray-100">"{goal.name}"</span>?</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">Delete</button>
          <button onClick={onCancel} className="flex-1 text-gray-400 border border-gray-700 text-sm py-2.5 rounded-lg hover:text-gray-200 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab hint ─────────────────────────────────────────────────────────────────

function TabHint({ type }: { type: GoalType }) {
  const [expanded, setExpanded] = useState(false);
  const tab = TABS.find(t => t.key === type)!;
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-3">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2.5 text-left"
      >
        <Info size={14} className="text-gray-500 shrink-0" />
        <span className="text-xs text-gray-400 flex-1">{tab.description}</span>
        {expanded
          ? <ChevronUp size={13} className="text-gray-600 shrink-0" />
          : <ChevronDown size={13} className="text-gray-600 shrink-0" />
        }
      </button>
      {expanded && (
        <p className="text-xs text-gray-500 leading-relaxed mt-2 pl-[22px]">
          {tab.detail}
        </p>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ type, onAdd }: { type: GoalType; onAdd: () => void }) {
  const tab = TABS.find(t => t.key === type)!;
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
      <p className="text-gray-500 text-sm">No {tab.label.toLowerCase()} goals yet.</p>
      <p className="text-gray-600 text-xs">Hit "Add goal" to set your first one.</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Goals() {
  const [activeTab, setActiveTab] = useState<GoalType>('ACCUMULATION');
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);
  const [projectionsGoal, setProjectionsGoal] = useState<Goal | null>(null);

  const { data: goals = [], isLoading } = useGoals();
  const updateGoal = useUpdateGoal();
  const deleteGoalMutation = useDeleteGoal();

  const filtered = useMemo(() => goals.filter(g => g.type === activeTab), [goals, activeTab]);
  const active = filtered.filter(g => !g.isCompleted && (g.progressPct ?? 0) < 100);
  const completed = filtered.filter(g => g.isCompleted || (g.progressPct ?? 0) >= 100);

  function handleToggleComplete(goal: Goal) {
    updateGoal.mutate({ id: goal.id, isCompleted: !goal.isCompleted });
  }

  async function handleDelete() {
    if (!deleteGoal) return;
    await deleteGoalMutation.mutateAsync(deleteGoal.id);
    setDeleteGoal(null);
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-100">Goals</h1>
          <p className="text-sm text-gray-500 mt-1">Track what you're working toward</p>
        </div>
        <button
          onClick={() => { setEditGoal(null); setShowModal(true); }}
          className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add goal
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {TABS.map(tab => {
          const count = goals.filter(g => g.type === tab.key && !g.isCompleted && (g.progressPct ?? 0) < 100).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-brand-400 text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${activeTab === tab.key ? 'bg-brand-500/20 text-brand-400' : 'bg-gray-800 text-gray-600'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab hint */}
      <TabHint type={activeTab} />

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <span className="text-gray-500 text-sm animate-pulse">Loading goals…</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState type={activeTab} onAdd={() => { setEditGoal(null); setShowModal(true); }} />
      ) : (
        <div className="space-y-6">
          {/* Active goals */}
          {active.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">In progress</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={() => { setEditGoal(goal); setShowModal(true); }}
                    onDelete={() => setDeleteGoal(goal)}
                    onToggleComplete={() => handleToggleComplete(goal)}
                    onProjections={() => setProjectionsGoal(goal)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed goals */}
          {completed.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Completed</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completed.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={() => { setEditGoal(goal); setShowModal(true); }}
                    onDelete={() => setDeleteGoal(goal)}
                    onToggleComplete={() => handleToggleComplete(goal)}
                    onProjections={() => setProjectionsGoal(goal)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>

    {/* Modals — outside space-y-6 to avoid inherited margin-top */}
    {showModal && (
      <GoalModal
        activeTab={activeTab}
        initial={editGoal ?? undefined}
        onClose={() => { setShowModal(false); setEditGoal(null); }}
      />
    )}
    {deleteGoal && (
      <DeleteModal
        goal={deleteGoal}
        onConfirm={handleDelete}
        onCancel={() => setDeleteGoal(null)}
      />
    )}
    {projectionsGoal && (
      <PlanProjectionsModal
        goal={projectionsGoal}
        onClose={() => setProjectionsGoal(null)}
      />
    )}
    </>
  );
}
