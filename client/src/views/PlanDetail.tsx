'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/store/useStore';
import { PlusCircle, Pencil } from 'lucide-react';
import { QuickAddModal } from '@/components/QuickAddModal';
import { EditModal } from '@/views/DcaPlans';
import { useAssets } from '@/hooks/useAssets';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { usePlanStats, useCreateBuyingRule, useDeleteBuyingRule } from '@/hooks/useDcaPlans';
import { useCreateSellRule, useUpdateSellRule, useDeleteSellRule } from '@/hooks/useSellRules';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { useCurrencyFormatter, formatDate, formatQuantity } from '@/lib/format';
import { SellRule, BuyingRule } from '@/types';
import { PlanStats } from '@/hooks/useDcaPlans';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', BIWEEKLY: 'Bi-weekly', MONTHLY: 'Monthly', CUSTOM: 'Custom',
};

const INPUT_SM = 'bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500 w-full';
const MULT_PRESETS = [0.25, 0.5, 1, 1.5, 2, 3, 5];

// ─── Buying Rule Form (matches DcaPlans RuleEditForm) ────────────────────────

function BuyRuleForm({
  initialMin = '', initialMax = '', initialMult = '1',
  baseAmount, onSave, onCancel, submitLabel = 'Add rule', isPending = false,
}: {
  initialMin?: string; initialMax?: string; initialMult?: string;
  baseAmount: number;
  onSave: (min: number, max: number, amount: number) => void;
  onCancel?: () => void;
  submitLabel?: string;
  isPending?: boolean;
}) {
  const [min, setMin] = useState(initialMin);
  const [max, setMax] = useState(initialMax);
  const [mult, setMult] = useState(initialMult);
  const [err, setErr] = useState('');

  const multNum = parseFloat(mult);
  const computedAmount = baseAmount > 0 && !isNaN(multNum) && multNum > 0
    ? +(multNum * baseAmount).toFixed(2) : null;

  const handle = () => {
    setErr('');
    const minV = parseFloat(min), maxV = parseFloat(max);
    if (isNaN(minV) || isNaN(maxV)) return setErr('Drawdown range is required.');
    if (minV < 0 || maxV > 100) return setErr('Drawdown must be 0–100%.');
    if (maxV <= minV) return setErr('Max must be greater than min.');
    if (!computedAmount || computedAmount <= 0) return setErr('Buy amount must be positive.');
    onSave(minV, maxV, computedAmount);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Drop from ATH <span className="text-red-400/70">− min %</span></label>
          <input type="number" min="0" max="99" step="1" value={min} onChange={e => setMin(e.target.value)} placeholder="20" className={INPUT_SM} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Drop from ATH <span className="text-red-400/70">− max %</span></label>
          <input type="number" min="1" max="100" step="1" value={max} onChange={e => setMax(e.target.value)} placeholder="40" className={INPUT_SM} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-2">Multiplier</label>
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {MULT_PRESETS.map(p => (
            <button key={p} type="button" onClick={() => setMult(String(p))}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                multNum === p
                  ? 'border-brand-500/60 text-brand-400 bg-brand-500/10'
                  : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
              }`}>
              {p}×
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <input type="number" min="0.01" step="0.01" value={mult} onChange={e => setMult(e.target.value)} placeholder="1"
              className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-100 w-20 focus:outline-none focus:border-brand-500 placeholder-gray-600" />
            <span className="text-sm text-gray-500">×</span>
          </div>
          {computedAmount !== null && (
            <span className="text-sm text-gray-500">= <span className="font-mono font-semibold text-gray-200">${computedAmount}</span></span>
          )}
        </div>
      </div>
      {err && <p className="text-xs text-red-400">{err}</p>}
      <div className="flex items-center gap-2 pt-0.5">
        <button type="button" onClick={handle} disabled={isPending}
          className="text-xs bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white font-medium px-3 py-1.5 rounded-lg transition-colors">
          {isPending ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sell Rule Form (matches DcaPlans SellRuleEditForm) ──────────────────────

function SellRuleForm({
  initialMin = '', initialMax = '', initialAmount = '', initialType = 'USD' as 'USD' | 'PCT',
  onSave, onCancel, submitLabel = 'Add rule', isPending = false,
}: {
  initialMin?: string; initialMax?: string; initialAmount?: string; initialType?: 'USD' | 'PCT';
  onSave: (min: number, max: number, amt: number, type: 'USD' | 'PCT') => void;
  onCancel?: () => void;
  submitLabel?: string;
  isPending?: boolean;
}) {
  const [min, setMin] = useState(initialMin);
  const [max, setMax] = useState(initialMax);
  const [amount, setAmount] = useState(initialAmount);
  const [amtType, setAmtType] = useState<'USD' | 'PCT'>(initialType);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <input type="number" value={min} onChange={e => setMin(e.target.value)} placeholder="Min %"
          className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500" />
        <span className="text-gray-600 text-xs">% –</span>
        <input type="number" value={max} onChange={e => setMax(e.target.value)} placeholder="Max %"
          className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500" />
        <span className="text-gray-600 text-xs">% profit → sell</span>
        <div className="flex items-center gap-1">
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={amtType === 'USD' ? 'USD' : '%'}
            className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500" />
          <div className="flex rounded overflow-hidden border border-gray-700 text-xs">
            {(['USD', 'PCT'] as const).map(t => (
              <button key={t} type="button" onClick={() => setAmtType(t)}
                className={`px-2 py-1 transition-colors ${amtType === t ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}>
                {t === 'USD' ? '$' : '%'}
              </button>
            ))}
          </div>
          {amtType === 'PCT' && <span className="text-gray-600 text-xs">of holdings</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        <button type="button" disabled={isPending}
          onClick={() => onSave(Number(min), Number(max), Number(amount), amtType)}
          className="text-xs bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white font-medium px-3 py-1.5 rounded-lg transition-colors">
          {isPending ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Buying Rules Card ────────────────────────────────────────────────────────

type AssetStatSlim = PlanStats['assetStats'][number];

function BuyingRulesCard({ planId, baseAmount, rules, drawdownPct, anyActive, perAssetRules = false, assetStats = [] }: {
  planId: string; baseAmount: number; rules: BuyingRule[];
  drawdownPct: number | null; anyActive: boolean;
  perAssetRules?: boolean;
  assetStats?: AssetStatSlim[];
}) {
  const qc = useQueryClient();
  const createRule = useCreateBuyingRule(planId);
  const deleteRule = useDeleteBuyingRule();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [addKey, setAddKey] = useState(0);

  // Build per-asset active map: ruleId -> assets whose individual drawdown falls in that rule's range.
  // Uses assetStats.drawdownFromAth which is always available on the detail page
  // (negative value, e.g. -28.5 means 28.5% below ATH).
  const perAssetActiveMap = new Map<string, { symbol: string; color?: string | null }[]>();
  if (perAssetRules && assetStats.length > 0) {
    const sortedDesc = [...rules].sort((a, b) => b.minDrawdown - a.minDrawdown);
    for (const stat of assetStats) {
      if (stat.drawdownFromAth == null) continue;
      const drawdown = Math.abs(stat.drawdownFromAth); // drawdownFromAth is negative; abs makes it positive
      const match = sortedDesc.find(r => drawdown >= r.minDrawdown && drawdown <= r.maxDrawdown);
      if (match) {
        const list = perAssetActiveMap.get(match.id) ?? [];
        list.push({ symbol: stat.asset.symbol, color: stat.asset.color });
        perAssetActiveMap.set(match.id, list);
      }
    }
  }

  async function handleAdd(min: number, max: number, amount: number) {
    await createRule.mutateAsync({ minDrawdown: min, maxDrawdown: max, buyAmount: amount });
    await qc.invalidateQueries({ queryKey: ['plan-stats', planId] });
    setAddKey(k => k + 1);
    toast('Buying rule added');
  }

  async function handleUpdate(ruleId: string, min: number, max: number, amount: number) {
    try {
      await api.patch(`/buying-rules/${ruleId}`, { minDrawdown: min, maxDrawdown: max, buyAmount: amount });
      await qc.invalidateQueries({ queryKey: ['plan-stats', planId] });
      setEditingId(null);
      toast('Rule updated');
    } catch { toast('Failed to update rule', 'error'); }
  }

  async function handleDelete(ruleId: string) {
    try {
      await deleteRule.mutateAsync(ruleId);
      await qc.invalidateQueries({ queryKey: ['plan-stats', planId] });
    } catch { toast('Failed to delete rule', 'error'); }
  }

  return (
    <div className={`bg-gray-900 border rounded-xl overflow-hidden ${anyActive ? 'border-brand-500/30' : 'border-gray-800'}`}>
      <div className="px-5 py-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300">Buying Rules</h2>
        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span>Current drawdown:</span>
          {perAssetRules ? (
            assetStats.some(s => s.drawdownFromAth != null)
              ? assetStats.map(s => s.drawdownFromAth != null && (
                  <span key={s.asset.symbol} className="font-mono font-medium" style={s.asset.color ? { color: s.asset.color + 'bb' } : undefined}>
                    {s.asset.symbol} −{Math.abs(s.drawdownFromAth).toFixed(1)}%
                  </span>
                ))
              : <span className="text-gray-600">no ATH data</span>
          ) : (
            drawdownPct !== null
              ? <span className={`font-mono font-medium ${drawdownPct > 5 ? 'text-red-400' : 'text-green-400'}`}>−{drawdownPct.toFixed(1)}%</span>
              : <span className="text-gray-600">no ATH data</span>
          )}
          {anyActive && <span className="text-brand-400 font-medium">· rule triggered</span>}
        </p>
      </div>
      <div className="px-5 py-4 space-y-2">
        {rules.map(rule => {
          const mult = baseAmount > 0 ? +(rule.buyAmount / baseAmount).toFixed(2) : null;
          const activeAssets = perAssetRules ? (perAssetActiveMap.get(rule.id) ?? []) : [];
          const isActive = perAssetRules
            ? activeAssets.length > 0
            : drawdownPct !== null && drawdownPct >= rule.minDrawdown && drawdownPct <= rule.maxDrawdown;
          const isEditing = editingId === rule.id;
          return (
            <div key={rule.id} className={`rounded-lg border overflow-hidden transition-colors ${
              isEditing ? 'border-brand-500/40 bg-gray-900'
              : isActive ? 'border-brand-500/30 bg-brand-500/10'
              : 'border-gray-700/50 bg-gray-800/50'
            }`}>
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  {isActive && !perAssetRules && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />}
                  <span className="font-mono text-red-400/80">−{rule.minDrawdown}% – −{rule.maxDrawdown}%</span>
                  <span className="text-gray-600">→</span>
                  <span className={`font-semibold font-mono ${isActive ? 'text-brand-300' : 'text-gray-200'}`}>{mult}×</span>
                  <span className="text-gray-500 text-xs">(${rule.buyAmount})</span>
                  {/* Per-asset mode: show each active asset as a colored badge */}
                  {perAssetRules && activeAssets.length > 0 && (
                    <span className="flex items-center gap-1 flex-wrap">
                      {activeAssets.map(a => (
                        <span
                          key={a.symbol}
                          className="inline-flex items-center gap-1 text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-brand-500/15 border border-brand-500/25"
                          style={a.color ? { color: a.color } : { color: '#93c5fd' }}
                        >
                          {a.symbol}
                        </span>
                      ))}
                    </span>
                  )}
                  {/* Group mode: single active badge */}
                  {!perAssetRules && isActive && <Badge variant="green">active</Badge>}
                </div>
                <div className="flex items-center gap-1.5 ml-3 shrink-0">
                  {confirmingId !== rule.id && !isEditing && (
                    <button type="button" onClick={() => { setEditingId(rule.id); setConfirmingId(null); }}
                      className="text-xs px-2 py-0.5 border rounded-md transition-colors border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300 hover:bg-gray-700/50">
                      edit
                    </button>
                  )}
                  {confirmingId === rule.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">Delete?</span>
                      <button type="button" onClick={() => { handleDelete(rule.id); setConfirmingId(null); }}
                        className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 px-2 py-0.5 rounded-md transition-colors">Yes</button>
                      <button type="button" onClick={() => setConfirmingId(null)}
                        className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-2 py-0.5 rounded-md transition-colors">No</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setConfirmingId(rule.id); setEditingId(null); }}
                      className="text-gray-600 hover:text-red-400 w-6 h-6 flex items-center justify-center rounded transition-colors text-sm">×</button>
                  )}
                </div>
              </div>
              {isEditing && (
                <div className="px-3 py-3 border-t border-gray-700/60 bg-gray-900/60">
                  <BuyRuleForm
                    initialMin={String(rule.minDrawdown)}
                    initialMax={String(rule.maxDrawdown)}
                    initialMult={mult !== null ? String(mult) : '1'}
                    baseAmount={baseAmount}
                    onSave={(min, max, amount) => handleUpdate(rule.id, min, max, amount)}
                    onCancel={() => setEditingId(null)}
                    submitLabel="Update rule"
                  />
                </div>
              )}
            </div>
          );
        })}

        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-800/30 p-4">
          <p className="text-xs font-medium text-gray-500 mb-3">Add a rule</p>
          <BuyRuleForm key={addKey} baseAmount={baseAmount} onSave={handleAdd} isPending={createRule.isPending} />
        </div>
      </div>
    </div>
  );
}

// ─── Sell Rules Card ──────────────────────────────────────────────────────────

function SellRulesCard({ planId, rules, profitPct, anyTriggered }: {
  planId: string; rules: SellRule[]; profitPct: number; anyTriggered: boolean;
}) {
  const createRule = useCreateSellRule();
  const updateRule = useUpdateSellRule();
  const deleteRule = useDeleteSellRule();
  const { format } = useCurrencyFormatter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [addKey, setAddKey] = useState(0);

  async function handleAdd(min: number, max: number, amt: number, type: 'USD' | 'PCT') {
    await createRule.mutateAsync({ dcaPlanId: planId, minProfit: min, maxProfit: max, sellAmount: amt, sellAmountType: type });
    setAddKey(k => k + 1);
    toast('Sell rule added');
  }

  return (
    <div className={`bg-gray-900 border rounded-xl overflow-hidden ${anyTriggered ? 'border-amber-500/30' : 'border-gray-800'}`}>
      <div className="px-5 py-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300">Take Profit Rules</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Current profit:{' '}
          <span className={`font-mono font-medium ${profitPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
          </span>
          {anyTriggered && <span className="ml-2 text-amber-400 font-medium">· rule triggered</span>}
        </p>
      </div>
      <div className="px-5 py-4 space-y-2">
        {rules.map(rule => {
          const isTriggered = profitPct >= rule.minProfit && profitPct <= rule.maxProfit;
          const isEditing = editingId === rule.id;
          const amtLabel = rule.sellAmountType === 'PCT' ? `${rule.sellAmount}%` : format(rule.sellAmount);
          return (
            <div key={rule.id} className={`rounded-lg border overflow-hidden transition-colors ${
              isEditing ? 'border-amber-500/40 bg-gray-900'
              : isTriggered ? 'border-amber-500/30 bg-amber-500/10'
              : 'border-gray-700/50 bg-gray-800/50'
            }`}>
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-mono flex items-center gap-2">
                  {isTriggered && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                  <span className="text-amber-400/80">+{rule.minProfit}% – +{rule.maxProfit}%</span>
                  <span className="text-gray-600">→ sell</span>
                  <span className="font-semibold text-gray-200">{amtLabel}</span>
                  {rule.sellAmountType === 'PCT' && <span className="text-gray-600 text-xs font-normal">of holdings</span>}
                  {isTriggered && <Badge variant="yellow">active</Badge>}
                </span>
                <div className="flex items-center gap-1.5 ml-3 shrink-0">
                  {confirmingId !== rule.id && !isEditing && (
                    <button type="button" onClick={() => { setEditingId(rule.id); setConfirmingId(null); }}
                      className="text-xs px-2 py-0.5 border rounded-md transition-colors border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300 hover:bg-gray-700/50">
                      edit
                    </button>
                  )}
                  {confirmingId === rule.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">Delete?</span>
                      <button type="button" onClick={() => { deleteRule.mutate(rule.id); setConfirmingId(null); }}
                        className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 px-2 py-0.5 rounded-md">Yes</button>
                      <button type="button" onClick={() => setConfirmingId(null)}
                        className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-2 py-0.5 rounded-md">No</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setConfirmingId(rule.id); setEditingId(null); }}
                      className="text-gray-600 hover:text-red-400 w-6 h-6 flex items-center justify-center rounded transition-colors text-sm">×</button>
                  )}
                </div>
              </div>
              {isEditing && (
                <div className="px-3 py-3 border-t border-gray-700/60 bg-gray-900/60">
                  <SellRuleForm
                    initialMin={String(rule.minProfit)}
                    initialMax={String(rule.maxProfit)}
                    initialAmount={String(rule.sellAmount)}
                    initialType={rule.sellAmountType ?? 'USD'}
                    isPending={updateRule.isPending}
                    onSave={async (min, max, amt, type) => {
                      await updateRule.mutateAsync({ id: rule.id, minProfit: min, maxProfit: max, sellAmount: amt, sellAmountType: type });
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                    submitLabel="Update rule"
                  />
                </div>
              )}
            </div>
          );
        })}

        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-800/30 p-3">
          <p className="text-xs font-medium text-gray-500 mb-2">Add take profit rule</p>
          <SellRuleForm key={addKey} onSave={handleAdd} isPending={createRule.isPending} submitLabel="Add rule" />
        </div>
      </div>
    </div>
  );
}

export default function PlanDetail() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading, error } = usePlanStats(id!);
  const { format, formatPct } = useCurrencyFormatter();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const { data: assets = [] } = useAssets();
  const theme = useStore((s) => s.theme);
  const isLight = theme === 'light' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-sm animate-pulse">Loading plan...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400 text-sm">Failed to load plan data.</div>
      </div>
    );
  }

  const { plan, portfolio, assetStats, monthlyData, recentTransactions } = data;
  const isProfitable = portfolio.totalPnl >= 0;

  const chartData = monthlyData.map((d) => ({
    month: d.month,
    invested: Math.round(d.invested * 100) / 100,
  }));

  return (
    <div className="space-y-6">
      {showQuickAdd && (
        <QuickAddModal plan={plan} onClose={() => setShowQuickAdd(false)} />
      )}
      {showEdit && (
        <EditModal plan={plan} assets={assets} onClose={() => {
          setShowEdit(false);
          qc.invalidateQueries({ queryKey: ['plan-stats', plan.id] });
        }} />
      )}

      {/* Back + header */}
      <div>
        <button
          onClick={() => router.push('/app/plans')}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3 flex items-center gap-1"
        >
          ← Back to plans
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-gray-100">
                {plan.allocations.map((a) => a.asset.symbol).join(' · ')}
              </h1>
              {plan.name && <span className="text-gray-400">({plan.name})</span>}
              <Badge variant={plan.isActive ? 'green' : 'gray'}>
                {plan.isActive ? 'Active' : 'Paused'}
              </Badge>
              <Badge variant="blue">{FREQ_LABELS[plan.frequency]}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {format(plan.amountUsd)} per cycle · Started {formatDate(plan.startDate)}
              {plan.nextPurchaseDate && <> · Next: <span className="text-gray-300">{formatDate(plan.nextPurchaseDate)}</span></>}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowEdit(true)}
              className="shrink-0 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-100 border border-gray-700 hover:border-gray-500 px-3 py-2 rounded-lg transition-colors"
            >
              <Pencil size={12} strokeWidth={1.75} />
              Edit Plan
            </button>
            {plan.isActive && (
              <button
                onClick={() => setShowQuickAdd(true)}
                className="shrink-0 flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 border border-brand-500/40 hover:border-brand-500/70 bg-brand-500/5 hover:bg-brand-500/10 px-3 py-2 rounded-lg transition-colors font-medium"
              >
                <PlusCircle size={12} strokeWidth={1.75} />
                Quick Purchase
              </button>
            )}
            {(() => {
              const topAlloc = [...plan.allocations].sort((a, b) => b.allocationPct - a.allocationPct)[0];
              if (!topAlloc) return null;
              const params = new URLSearchParams({
                assetId:   topAlloc.assetId,
                startDate: plan.startDate.slice(0, 10),
                amountUsd: String(Math.round(plan.amountUsd * (topAlloc.allocationPct / 100))),
                frequency: plan.frequency,
              });
              return (
                <button
                  onClick={() => router.push(`/app/simulator?${params.toString()}`)}
                  className="shrink-0 flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-400 border border-gray-700 hover:border-brand-500/50 px-3 py-2 rounded-lg transition-colors"
                >
                  Simulate Plan
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Invested"  value={format(portfolio.totalInvested)} />
        <StatCard label="Current Value"   value={format(portfolio.totalCurrentValue)} />
        <StatCard
          label="P&L"
          value={format(portfolio.totalPnl)}
          sub={formatPct(portfolio.totalPnlPercent)}
          positive={isProfitable}
          negative={!isProfitable}
        />
        <StatCard label="Transactions" value={String(recentTransactions.length)} />
      </div>

      {/* Monthly chart */}
      {chartData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Monthly Investment (last 12 months)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e8ecf1' : '#1f2937'} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: isLight ? '#ffffff' : '#111827', border: `1px solid ${isLight ? '#e8ecf1' : '#1f2937'}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                labelStyle={{ color: isLight ? '#475569' : '#9ca3af' }}
                itemStyle={{ color: '#22c55e' }}
                cursor={{ fill: isLight ? '#f1f5f9' : '#1f2937' }}
              />
              <Bar dataKey="invested" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Asset breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">Asset Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                {['Asset', 'Allocation', 'Holdings', 'Invested', 'Value', 'Avg Buy', 'Price', 'P&L', 'Drawdown'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {assetStats.map((stat) => (
                <tr key={stat.asset.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-bold font-mono" style={stat.asset.color ? { color: stat.asset.color } : undefined}>
                      {stat.asset.symbol}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">{stat.asset.name}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-400">{stat.allocationPct}%</td>
                  <td className="px-5 py-4 font-mono text-gray-300">
                    {formatQuantity(stat.totalQuantity)}
                    <span className="text-gray-600 text-xs ml-1">{stat.asset.symbol}</span>
                  </td>
                  <td className="px-5 py-4 font-mono text-gray-300">{format(stat.totalInvested)}</td>
                  <td className="px-5 py-4 font-mono text-gray-300">{format(stat.currentValue)}</td>
                  <td className="px-5 py-4 font-mono text-gray-400">{format(stat.avgCost)}</td>
                  <td className="px-5 py-4 font-mono text-gray-400">{format(stat.currentPrice)}</td>
                  <td className="px-5 py-4">
                    <span className={`font-mono font-medium ${stat.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {format(stat.pnl)}
                    </span>
                    <p className={`text-xs mt-0.5 ${stat.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {stat.pnlPercent >= 0 ? '+' : ''}{stat.pnlPercent.toFixed(2)}%
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    {stat.drawdownFromAth === null ? (
                      <span className="text-gray-600">—</span>
                    ) : stat.drawdownFromAth >= -0.5 ? (
                      <span className="text-green-400 font-mono text-xs font-medium">ATH 🔥</span>
                    ) : (
                      <span className="font-mono font-medium text-orange-400">
                        {stat.drawdownFromAth.toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Buying Rules */}
      {(() => {
        const drawdownPct = plan.drawdownFromAth != null && !isNaN(plan.drawdownFromAth) ? Math.abs(plan.drawdownFromAth) : null;
        const sorted = [...plan.buyingRules].sort((a, b) => a.minDrawdown - b.minDrawdown);
        const anyActive = plan.perAssetRules
          ? assetStats.some(s =>
              s.drawdownFromAth != null &&
              sorted.some(r => Math.abs(s.drawdownFromAth!) >= r.minDrawdown && Math.abs(s.drawdownFromAth!) <= r.maxDrawdown)
            )
          : sorted.some(r => drawdownPct !== null && drawdownPct >= r.minDrawdown && drawdownPct <= r.maxDrawdown);
        return (
          <BuyingRulesCard
            planId={plan.id}
            baseAmount={plan.amountUsd}
            rules={sorted}
            drawdownPct={drawdownPct}
            anyActive={anyActive}
            perAssetRules={plan.perAssetRules}
            assetStats={assetStats}
          />
        );
      })()}

      {/* Take Profit / Sell Rules */}
      {(() => {
        const profitPct = portfolio.totalPnlPercent;
        const sorted = [...plan.sellRules].sort((a, b) => a.minProfit - b.minProfit);
        const anyTriggered = sorted.some((r) => profitPct >= r.minProfit && profitPct <= r.maxProfit);
        return (
          <SellRulesCard
            planId={plan.id}
            rules={sorted}
            profitPct={profitPct}
            anyTriggered={anyTriggered}
          />
        );
      })()}

      {/* Recent transactions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">Transactions</h2>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-600 text-sm">No transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                  {['Date', 'Type', 'Asset', 'Amount', 'Quantity', 'Price'].map(h => (
                    <th key={h} className="px-5 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 text-gray-400">{formatDate(tx.purchasedAt)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium font-mono px-2 py-0.5 rounded-full ${
                        tx.type === 'SELL' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                      }`}>
                        {tx.type ?? 'BUY'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono font-bold"
                        style={tx.asset.color ? { color: tx.asset.color } : undefined}>
                        {tx.asset.symbol}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-gray-300">{format(tx.amountUsd)}</td>
                    <td className="px-5 py-3 font-mono text-gray-400">
                      {formatQuantity(tx.quantity)}
                    </td>
                    <td className="px-5 py-3 font-mono text-gray-400">{format(tx.pricePerUnit)}</td>
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
