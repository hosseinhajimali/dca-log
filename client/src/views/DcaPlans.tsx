'use client';

import { useState, useEffect, useRef } from 'react';
import { Eye, PlusCircle } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useRouter } from 'next/navigation';
import { QuickAddModal } from '@/components/QuickAddModal';
import {
  useDcaPlans, useCreateDcaPlan, useUpdateDcaPlan, useDeleteDcaPlan,
} from '@/hooks/useDcaPlans';
import { useAssets } from '@/hooks/useAssets';
import { useDashboard } from '@/hooks/useDashboard';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { useCurrencyFormatter, formatDate } from '@/lib/format';
import { api } from '@/lib/api';
import { DcaFrequency, DcaPlan, SellRule } from '@/types';
import { useCreateSellRule, useUpdateSellRule, useDeleteSellRule } from '@/hooks/useSellRules';
import { toast } from '@/lib/toast';

const FREQ_LABELS: Record<DcaFrequency, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', BIWEEKLY: 'Bi-weekly', MONTHLY: 'Monthly', CUSTOM: 'Custom',
};

// ─── timezone helpers ─────────────────────────────────────────────────────────
// The server stores scheduledTime as UTC (HH:MM). The UI shows/accepts local time.
// These helpers convert so the user always sees their local time.
function localTimeToUtc(localTime: string): string {
  const [h, m] = localTime.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
function utcTimeToLocal(utcTime: string): string {
  const [h, m] = utcTime.split(':').map(Number);
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const INPUT = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500 disabled:opacity-50';
const INPUT_SM = 'bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500 w-full';

// ─── types ────────────────────────────────────────────────────────────────────
interface PlanFormValues {
  name: string; amountUsd: string;
  frequency: DcaFrequency; intervalDays: string; startDate: string; endDate: string;
  scheduledTime: string; notes: string;
  perAssetRules: boolean;
}

interface AllocDraft {
  key: number;
  assetId: string;
  allocationPct: number;
}

interface SourceRule {
  minDrawdown: number; maxDrawdown: number; buyAmount: number;
}
interface SourceSellRule {
  minProfit: number; maxProfit: number; sellAmount: number; sellAmountType: 'USD' | 'PCT';
}

const emptyForm = (): PlanFormValues => ({
  name: '', amountUsd: '', frequency: 'MONTHLY',
  intervalDays: '', startDate: new Date().toISOString().slice(0, 10), endDate: '',
  scheduledTime: '08:00', notes: '',
  perAssetRules: false,
});

function planToForm(plan: DcaPlan): PlanFormValues {
  return {
    name: plan.name ?? '',
    amountUsd: String(plan.amountUsd), frequency: plan.frequency,
    intervalDays: plan.intervalDays ? String(plan.intervalDays) : '',
    startDate: new Date(plan.startDate).toISOString().slice(0, 10),
    endDate: plan.endDate ? new Date(plan.endDate).toISOString().slice(0, 10) : '',
    scheduledTime: utcTimeToLocal(plan.scheduledTime ?? '08:00'),
    notes: plan.notes ?? '',
    perAssetRules: plan.perAssetRules ?? false,
  };
}

function planToAllocDrafts(plan: DcaPlan): AllocDraft[] {
  return plan.allocations.map((a, i) => ({
    key: i,
    assetId: a.assetId,
    allocationPct: a.allocationPct,
  }));
}

// ─── tooltip ─────────────────────────────────────────────────────────────────
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex"
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-800 border border-gray-600 text-xs text-gray-300 rounded-xl p-3 z-50 shadow-2xl leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-600" />
        </div>
      )}
    </div>
  );
}

// ─── allocation editor ────────────────────────────────────────────────────────
function AllocationEditor({
  allocations, setAllocations, assets,
}: {
  allocations: AllocDraft[];
  setAllocations: React.Dispatch<React.SetStateAction<AllocDraft[]>>;
  assets: { id: string; symbol: string; name: string; color?: string | null }[];
}) {
  const [nextKey, setNextKey] = useState(allocations.length);
  const total = allocations.reduce((s, a) => s + a.allocationPct, 0);
  const remaining = +(100 - total).toFixed(2);
  const usedIds = new Set(allocations.map(a => a.assetId));
  const availableAssets = assets.filter(a => !usedIds.has(a.id));

  const add = () => {
    if (availableAssets.length === 0) return;
    setAllocations(prev => [
      ...prev,
      { key: nextKey, assetId: availableAssets[0].id, allocationPct: Math.max(0, remaining) },
    ]);
    setNextKey(k => k + 1);
  };

  const update = (key: number, field: 'assetId' | 'allocationPct', value: string | number) =>
    setAllocations(prev => prev.map(a => a.key === key ? { ...a, [field]: value } : a));

  const remove = (key: number) =>
    setAllocations(prev => prev.filter(a => a.key !== key));

  const splitEqually = () => {
    if (allocations.length === 0) return;
    const pct = +(100 / allocations.length).toFixed(2);
    setAllocations(prev => prev.map((a, i) => ({
      ...a,
      allocationPct: i === prev.length - 1 ? +(100 - pct * (prev.length - 1)).toFixed(2) : pct,
    })));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-gray-400">Assets & Allocation *</label>
        {allocations.length > 1 && (
          <button type="button" onClick={splitEqually}
            className="text-xs text-gray-500 hover:text-brand-400 transition-colors">
            split equally
          </button>
        )}
      </div>

      {allocations.map((alloc) => {
        const asset = assets.find(a => a.id === alloc.assetId);
        const rowAvailable = assets.filter(a => !usedIds.has(a.id) || a.id === alloc.assetId);
        return (
          <div key={alloc.key} className="flex items-center gap-2">
            <select
              required
              value={alloc.assetId}
              onChange={e => update(alloc.key, 'assetId', e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
            >
              {rowAvailable.map(a => (
                <option key={a.id} value={a.id}>{a.symbol} · {a.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number" min="0.01" max="100" step="0.01"
                required
                value={alloc.allocationPct}
                onChange={e => update(alloc.key, 'allocationPct', parseFloat(e.target.value) || 0)}
                className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500 text-right"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
            {asset?.color && (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: asset.color }} />
            )}
            <button type="button" onClick={() => remove(alloc.key)}
              className="text-gray-600 hover:text-red-400 w-6 h-6 flex items-center justify-center shrink-0 transition-colors">×</button>
          </div>
        );
      })}

      {/* total indicator */}
      <div className="flex items-center justify-between pt-0.5">
        <button
          type="button"
          onClick={add}
          disabled={availableAssets.length === 0}
          className="text-xs text-brand-400 hover:text-brand-300 border border-brand-500/30 hover:border-brand-500/60 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Add asset
        </button>
        <span className={`text-xs font-mono ${
          Math.abs(total - 100) < 0.01 ? 'text-green-400' : 'text-yellow-400'
        }`}>
          {total.toFixed(0)}% {Math.abs(total - 100) >= 0.01 && `(${remaining > 0 ? `+${remaining}` : remaining}% remaining)`}
        </span>
      </div>

      {allocations.length === 0 && (
        <p className="text-xs text-yellow-500">Add at least one asset.</p>
      )}
      {assets.length === 0 && (
        <p className="text-xs text-yellow-500">No assets yet. Go to Settings to add one.</p>
      )}
    </div>
  );
}

// ─── shared plan field grid ───────────────────────────────────────────────────
function PlanFields({ form, setForm, assets, allocations, setAllocations }: {
  form: PlanFormValues;
  setForm: React.Dispatch<React.SetStateAction<PlanFormValues>>;
  assets: { id: string; symbol: string; name: string; color?: string | null }[];
  allocations: AllocDraft[];
  setAllocations: React.Dispatch<React.SetStateAction<AllocDraft[]>>;
}) {
  return (
    <div className="space-y-4">
      {/* allocation editor spans full width */}
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-4">
        <AllocationEditor
          allocations={allocations}
          setAllocations={setAllocations}
          assets={assets}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Plan label (optional)</label>
        <input type="text" value={form.name} placeholder="e.g. Monthly BTC stack"
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={INPUT} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Amount (USD) *</label>
        <input type="number" required min="0.01" step="0.01" value={form.amountUsd}
          onChange={e => setForm(f => ({ ...f, amountUsd: e.target.value }))}
          placeholder="100" className={INPUT} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Frequency *</label>
        <select value={form.frequency}
          onChange={e => setForm(f => ({ ...f, frequency: e.target.value as DcaFrequency, intervalDays: '' }))}
          className={INPUT}>
          {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {form.frequency === 'CUSTOM' && (
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Every N days *</label>
          <input type="number" required min="1" value={form.intervalDays} placeholder="e.g. 10"
            onChange={e => setForm(f => ({ ...f, intervalDays: e.target.value }))} className={INPUT} />
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Start date *</label>
        <input type="date" required value={form.startDate}
          onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={INPUT} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">
          Purchase time <span className="text-gray-600">(your local time)</span>
        </label>
        <input type="time" value={form.scheduledTime}
          onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))}
          className={INPUT} style={{ colorScheme: 'dark' }} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">End date <span className="text-gray-600">(optional)</span></label>
        <input type="date" value={form.endDate}
          min={form.startDate || undefined}
          onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={INPUT} />
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs text-gray-400 mb-1.5">Notes (optional)</label>
        <input type="text" value={form.notes} placeholder="Any notes about this plan..."
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={INPUT} />
      </div>

      {/* buying rule mode */}
      <div className="md:col-span-2">
        <label
          htmlFor="perAssetRules"
          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
            form.perAssetRules
              ? 'border-brand-500/40 bg-brand-500/5'
              : 'border-gray-700/60 bg-gray-800/40'
          }`}
        >
          <input
            id="perAssetRules"
            type="checkbox"
            checked={form.perAssetRules}
            onChange={e => setForm(f => ({ ...f, perAssetRules: e.target.checked }))}
            className="mt-0.5 accent-brand-500 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-gray-200">Evaluate rules per asset</span>
              <Tooltip text="When OFF (default): a weighted-average drawdown across all assets triggers one rule, and the total buy amount is split by allocation percentages, every asset gets the same multiplier regardless of its individual drawdown. When ON: each asset's own drawdown is checked independently. Assets in a deep correction buy more (higher multiplier) while assets still near ATH buy their base share. This lets one asset's crash trigger its rule without dragging the others along.">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-600 text-gray-500 text-[10px] cursor-help hover:border-gray-400 hover:text-gray-300 transition-colors">?</span>
              </Tooltip>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              {form.perAssetRules
                ? 'Each asset checks its own drawdown against the rules. BTC at −30% buys 3× its share; ETH at −5% buys its normal share.'
                : 'Weighted average drawdown of all assets picks one rule. All assets get the same multiplier.'}
            </p>
          </div>
        </label>
      </div>
      </div>{/* end inner grid */}
    </div>
  );
}

// ─── shared multiplier rule form (used for add + inline edit) ────────────────
// NOTE: intentionally NOT a <form>, nested inside another <form>.
const MULT_PRESETS = [0.25, 0.5, 1, 1.5, 2, 3, 5];

function RuleEditForm({
  initialMin = '', initialMax = '', initialMult = '1', initialRawAmount = '',
  baseAmount, onSave, onCancel, submitLabel = 'Add rule',
}: {
  initialMin?: string; initialMax?: string;
  initialMult?: string; initialRawAmount?: string;
  baseAmount?: number;
  onSave: (min: number, max: number, amount: number) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [min, setMin] = useState(initialMin);
  const [max, setMax] = useState(initialMax);
  const [mult, setMult] = useState(initialMult);
  const [rawAmount, setRawAmount] = useState(initialRawAmount);
  const [err, setErr] = useState('');

  const base = baseAmount && baseAmount > 0 ? baseAmount : null;
  const multNum = parseFloat(mult);
  const computedAmount = base && !isNaN(multNum) && multNum > 0
    ? +(multNum * base).toFixed(2) : null;

  const applyPreset = (p: number) => setMult(String(p));

  const handle = () => {
    setErr('');
    const minV = parseFloat(min), maxV = parseFloat(max);
    if (isNaN(minV) || isNaN(maxV)) return setErr('Drawdown range is required.');
    if (minV < 0 || maxV > 100) return setErr('Drawdown must be 0–100%.');
    if (maxV <= minV) return setErr('Max must be greater than min.');
    const amtV = base ? computedAmount! : parseFloat(rawAmount);
    if (isNaN(amtV) || amtV <= 0) return setErr('Buy amount must be positive.');
    onSave(minV, maxV, amtV);
  };

  return (
    <div className="space-y-3">
      {/* drawdown range */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Drop from ATH <span className="text-red-400/70">− min %</span>
          </label>
          <input type="number" min="0" max="99" step="1"
            value={min} onChange={e => setMin(e.target.value)}
            placeholder="20" className={INPUT_SM} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Drop from ATH <span className="text-red-400/70">− max %</span>
          </label>
          <input type="number" min="1" max="100" step="1"
            value={max} onChange={e => setMax(e.target.value)}
            placeholder="40" className={INPUT_SM} />
        </div>
      </div>

      {/* multiplier */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Multiplier</label>
        {/* preset chips */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {MULT_PRESETS.map(p => {
            const active = multNum === p;
            return (
              <button key={p} type="button" onClick={() => applyPreset(p)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  active
                    ? 'border-brand-500/60 text-brand-400 bg-brand-500/10'
                    : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                }`}>
                {p}×
              </button>
            );
          })}
        </div>
        {/* custom input + computed result */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <input
              type="number" min="0.01" step="0.01"
              value={mult} onChange={e => setMult(e.target.value)}
              placeholder="1"
              className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-100 w-20 focus:outline-none focus:border-brand-500 placeholder-gray-600"
            />
            <span className="text-sm text-gray-500">×</span>
          </div>
          {base && computedAmount !== null ? (
            <span className="text-sm text-gray-500">
              = <span className="font-mono font-semibold text-gray-200">${computedAmount}</span>
            </span>
          ) : !base && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-600">= $</span>
              <input
                type="number" min="0.01" step="0.01"
                value={rawAmount} onChange={e => setRawAmount(e.target.value)}
                placeholder="amount"
                className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-100 w-24 focus:outline-none focus:border-brand-500 placeholder-gray-600"
              />
            </div>
          )}
        </div>
      </div>

      {err && <p className="text-xs text-red-400">{err}</p>}
      <div className="flex items-center gap-2 pt-0.5">
        <button type="button" onClick={handle}
          className="text-xs bg-brand-600 hover:bg-brand-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors">
          {submitLabel}
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

// ─── create modal (new plan + duplicate) ─────────────────────────────────────
function CreateModal({ assets, initialForm, initialAllocs, sourceRules, sourceSellRules, onClose }: {
  assets: { id: string; symbol: string; name: string; color?: string | null }[];
  initialForm?: PlanFormValues;
  initialAllocs?: AllocDraft[];
  sourceRules?: SourceRule[];
  sourceSellRules?: SourceSellRule[];
  onClose: () => void;
}) {
  const createPlan = useCreateDcaPlan();
  const qc = useQueryClient();
  const [form, setForm] = useState<PlanFormValues>(initialForm ?? emptyForm());
  const [allocations, setAllocations] = useState<AllocDraft[]>(initialAllocs ?? []);
  const [copyRules, setCopyRules] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const allocTotal = allocations.reduce((s, a) => s + a.allocationPct, 0);
    if (allocations.length === 0) return;
    if (Math.abs(allocTotal - 100) >= 0.01) return;

    let plan: Awaited<ReturnType<typeof createPlan.mutateAsync>>;
    try {
      plan = await createPlan.mutateAsync({
      name: form.name || undefined,
      amountUsd: parseFloat(form.amountUsd),
      frequency: form.frequency,
      intervalDays: form.frequency === 'CUSTOM' ? parseInt(form.intervalDays) : undefined,
      startDate: new Date(form.startDate).toISOString(),
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      scheduledTime: localTimeToUtc(form.scheduledTime || '08:00'),
      notes: form.notes || undefined,
      perAssetRules: form.perAssetRules,
      allocations: allocations.map(a => ({ assetId: a.assetId, allocationPct: a.allocationPct })),
    } as Parameters<typeof createPlan.mutateAsync>[0]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Failed to create plan. Please check your inputs and try again.';
      setSubmitError(msg);
      return;
    }

    if (copyRules) {
      let skipped = 0;
      if (sourceRules && sourceRules.length > 0) {
        for (const rule of sourceRules) {
          try {
            await api.post(`/dca-plans/${plan.id}/rules`, {
              minDrawdown: rule.minDrawdown,
              maxDrawdown: rule.maxDrawdown,
              buyAmount: rule.buyAmount,
            });
          } catch {
            skipped++;
          }
        }
      }
      if (sourceSellRules && sourceSellRules.length > 0) {
        for (const rule of sourceSellRules) {
          try {
            await api.post('/sell-rules', {
              dcaPlanId: plan.id,
              minProfit: rule.minProfit,
              maxProfit: rule.maxProfit,
              sellAmount: rule.sellAmount,
              sellAmountType: rule.sellAmountType,
            });
          } catch {
            skipped++;
          }
        }
      }
      if ((sourceRules?.length ?? 0) + (sourceSellRules?.length ?? 0) > 0) {
        qc.invalidateQueries({ queryKey: ['dca-plans'] });
      }
      if (skipped > 0) {
        toast(`Plan duplicated. ${skipped} rule${skipped > 1 ? 's' : ''} with invalid data were skipped.`, 'error');
      }
    }

    onClose();
  };

  const allocTotal = allocations.reduce((s, a) => s + a.allocationPct, 0);
  const allocError = allocations.length === 0
    ? 'Add at least one asset'
    : Math.abs(allocTotal - 100) >= 0.01
    ? `Allocations must sum to 100% (currently ${allocTotal.toFixed(1)}%)`
    : null;

  const isDuplicate = !!initialForm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-base font-semibold text-gray-100">
            {isDuplicate ? 'Duplicate Plan' : 'New DCA Plan'}
          </h2>
          <button onClick={onClose}
            className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors">×</button>
        </div>

        {/* scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <form id="create-plan-form" onSubmit={handleSubmit}>
            <PlanFields form={form} setForm={setForm} assets={assets}
              allocations={allocations} setAllocations={setAllocations} />
          </form>
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t border-gray-800 shrink-0 space-y-3">
          {((sourceRules?.length ?? 0) + (sourceSellRules?.length ?? 0) > 0) && (() => {
            const buyCount  = sourceRules?.length ?? 0;
            const sellCount = sourceSellRules?.length ?? 0;
            const parts = [
              buyCount  > 0 ? `${buyCount} buying rule${buyCount  !== 1 ? 's' : ''}` : '',
              sellCount > 0 ? `${sellCount} sell rule${sellCount !== 1 ? 's' : ''}`   : '',
            ].filter(Boolean).join(' + ');
            return (
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={copyRules}
                  onChange={e => setCopyRules(e.target.checked)}
                  className="accent-brand-500"
                />
                <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">
                  Copy {parts} from original plan
                </span>
              </label>
            );
          })()}
          <div className="flex gap-3 flex-wrap">
            {(submitError || allocError) && (
              <p className="text-xs text-red-400 self-center mr-2 w-full">
                {allocError || submitError}
              </p>
            )}
            <button type="submit" form="create-plan-form" disabled={createPlan.isPending || !!allocError}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              {createPlan.isPending ? 'Creating...' : isDuplicate ? 'Create duplicate' : 'Create plan'}
            </button>
            <button type="button" onClick={onClose}
              className="text-gray-400 hover:text-gray-200 text-sm px-4 py-2.5 border border-gray-700 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── edit modal, plan fields + allocations only ──────────────────────────────
export function EditModal({ plan, assets, onClose }: {
  plan: DcaPlan;
  assets: { id: string; symbol: string; name: string; color?: string | null }[];
  onClose: () => void;
}) {
  const updatePlan = useUpdateDcaPlan();
  const [form, setForm] = useState<PlanFormValues>(planToForm(plan));
  const [allocations, setAllocations] = useState<AllocDraft[]>(() => planToAllocDrafts(plan));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    const allocTotal = allocations.reduce((s, a) => s + a.allocationPct, 0);
    if (allocations.length === 0 || Math.abs(allocTotal - 100) >= 0.01) {
      setSaveError('Allocations must sum to 100%');
      return;
    }
    setIsSaving(true);
    try {
      await updatePlan.mutateAsync({
        id: plan.id,
        data: {
          name: form.name || undefined,
          amountUsd: parseFloat(form.amountUsd),
          frequency: form.frequency,
          intervalDays: form.frequency === 'CUSTOM' ? parseInt(form.intervalDays) : undefined,
          startDate: new Date(form.startDate).toISOString(),
          endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
          scheduledTime: localTimeToUtc(form.scheduledTime || '08:00'),
          notes: form.notes || undefined,
          perAssetRules: form.perAssetRules,
          allocations: allocations.map(a => ({ assetId: a.assetId, allocationPct: a.allocationPct })),
        } as Parameters<typeof updatePlan.mutateAsync>[0]['data'],
      });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setSaveError(msg ? `Error: ${msg}` : 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const assetLabels = plan.allocations.map(a => a.asset.symbol).join(' · ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-100">Edit DCA Plan</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {assetLabels} · {plan.name || FREQ_LABELS[plan.frequency]}
            </p>
          </div>
          <button onClick={onClose}
            className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          <form id="edit-plan-form" onSubmit={handleSubmit}>
            <PlanFields form={form} setForm={setForm} assets={assets}
              allocations={allocations} setAllocations={setAllocations} />
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-800 shrink-0 flex gap-3 flex-wrap">
          {saveError && (
            <p className="text-xs text-red-400 self-center mr-2 w-full">{saveError}</p>
          )}
          <button type="submit" form="edit-plan-form" disabled={isSaving}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
            {isSaving ? 'Saving...' : 'Save changes'}
          </button>
          <button type="button" onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-sm px-4 py-2.5 border border-gray-700 rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── inline rules panel (on plan card, add/delete fire immediately) ──────────
function PlanRulesPanel({ plan, baseAmount }: { plan: DcaPlan; baseAmount?: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [addKey, setAddKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const base = baseAmount && baseAmount > 0 ? baseAmount : plan.amountUsd;
  const drawdownPct = plan.drawdownFromAth !== null ? Math.abs(plan.drawdownFromAth) : null;
  const sorted = [...plan.buyingRules].sort((a, b) => b.minDrawdown - a.minDrawdown);

  const handleDelete = async (ruleId: string) => {
    try {
      await api.delete(`/buying-rules/${ruleId}`);
      await qc.invalidateQueries({ queryKey: ['dca-plans'] });
    } catch {
      toast('Failed to delete rule', 'error');
    }
  };

  const handleAdd = async (min: number, max: number, amount: number) => {
    try {
      await api.post(`/dca-plans/${plan.id}/rules`, { minDrawdown: min, maxDrawdown: max, buyAmount: amount });
      await qc.invalidateQueries({ queryKey: ['dca-plans'] });
      setAddKey(k => k + 1);
      toast('Rule added');
    } catch {
      toast('Failed to add rule', 'error');
    }
  };

  const handleUpdate = async (ruleId: string, min: number, max: number, amount: number) => {
    try {
      await api.patch(`/buying-rules/${ruleId}`, { minDrawdown: min, maxDrawdown: max, buyAmount: amount });
      await qc.invalidateQueries({ queryKey: ['dca-plans'] });
      setEditingId(null);
      toast('Rule updated');
    } catch {
      toast('Failed to update rule', 'error');
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        {plan.buyingRules.length === 0
          ? 'Add buying rules'
          : `${plan.buyingRules.length} buying rule${plan.buyingRules.length !== 1 ? 's' : ''}`}
        {drawdownPct !== null && plan.buyingRules.length > 0 && (
          <span className="text-red-400/70 ml-1">−{drawdownPct.toFixed(1)}% ATH</span>
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-2 pl-1">
          {/* existing rules */}
          {sorted.map(rule => {
            const mult = +(rule.buyAmount / base).toFixed(2);
            const isActive = drawdownPct !== null
              && drawdownPct >= rule.minDrawdown && drawdownPct <= rule.maxDrawdown;
            const isEditing = editingId === rule.id;

            return (
              <div key={rule.id} className={`rounded-lg border overflow-hidden transition-colors ${
                isEditing
                  ? 'border-brand-500/40 bg-gray-900'
                  : isActive
                  ? 'border-brand-500/30 bg-brand-500/10'
                  : 'border-gray-700/50 bg-gray-800/50'
              }`}>
                <div className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />}
                    <span className="font-mono text-red-400/80">−{rule.minDrawdown}% – −{rule.maxDrawdown}%</span>
                    <span className="text-gray-600">→</span>
                    <span className={`font-semibold font-mono ${isActive ? 'text-brand-300' : 'text-gray-200'}`}>
                      {mult}×
                    </span>
                    <span className="text-gray-500 text-xs">(${rule.buyAmount})</span>
                    {isActive && <Badge variant="green">active</Badge>}
                  </div>
                  <div className="flex items-center gap-1.5 ml-3 shrink-0">
                    {confirmingId !== rule.id && !isEditing && (
                      <button
                        type="button"
                        onClick={() => { setEditingId(rule.id); setConfirmingId(null); }}
                        className="text-xs px-2 py-0.5 border rounded-md transition-colors border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300"
                      >
                        edit
                      </button>
                    )}
                    {confirmingId === rule.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">Delete?</span>
                        <button type="button" onClick={() => { handleDelete(rule.id); setConfirmingId(null); }}
                          className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 px-2 py-0.5 rounded-md transition-colors">
                          Yes
                        </button>
                        <button type="button" onClick={() => setConfirmingId(null)}
                          className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-2 py-0.5 rounded-md transition-colors">
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setConfirmingId(rule.id); setEditingId(null); }}
                        className="text-gray-600 hover:text-red-400 w-6 h-6 flex items-center justify-center rounded transition-colors text-sm"
                      >×</button>
                    )}
                  </div>
                </div>
                {isEditing && (
                  <div className="px-3 py-3 border-t border-gray-700/60 bg-gray-900/60">
                    <RuleEditForm
                      initialMin={String(rule.minDrawdown)}
                      initialMax={String(rule.maxDrawdown)}
                      initialMult={String(mult)}
                      baseAmount={base}
                      onSave={(min, max, amount) => handleUpdate(rule.id, min, max, amount)}
                      onCancel={() => setEditingId(null)}
                      submitLabel="Update rule"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* add rule form */}
          <div className="rounded-xl border border-dashed border-gray-700 bg-gray-800/30 p-4">
            <p className="text-xs font-medium text-gray-500 mb-3">Add a rule</p>
            <RuleEditForm
              key={addKey}
              baseAmount={base}
              onSave={handleAdd}
              submitLabel="Add rule"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── suggested amount badge (on card) ────────────────────────────────────────
function SuggestedBadge({ plan }: { plan: DcaPlan }) {
  const { format } = useCurrencyFormatter();
  if (plan.buyingRules.length === 0) return null;

  const drawdownPct = plan.drawdownFromAth !== null ? Math.abs(plan.drawdownFromAth) : null;
  const hasPrice = drawdownPct !== null;
  const isOverride = plan.suggestedAmount !== plan.amountUsd;
  const isGroup = plan.suggestedAllocations.length > 1;

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs px-3 py-2 rounded-xl border w-fit ${
      isOverride
        ? 'bg-brand-500/10 border-brand-500/30 text-brand-300'
        : 'bg-gray-800/60 border-gray-700 text-gray-400'
    }`}>
      <span className="font-medium">Suggested</span>
      <span className="font-mono font-semibold text-sm">
        {hasPrice ? format(plan.suggestedAmount) : '—'}
      </span>
      {hasPrice && drawdownPct !== null && (
        <span className="text-red-400/70 text-xs">−{drawdownPct.toFixed(1)}% ATH</span>
      )}
      {/* per-asset breakdown for group plans */}
      {isGroup && hasPrice && (
        <div className="flex items-center gap-1.5 flex-wrap border-t border-current/20 pt-1.5 mt-0.5 w-full">
          {plan.suggestedAllocations.map(sa => (
            <span key={sa.assetId} className="flex items-center gap-1">
              {sa.color && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sa.color }} />}
              <span className="font-mono font-medium" style={sa.color ? { color: sa.color } : {}}>{sa.symbol}</span>
              <span className="text-gray-400">{format(sa.amount)}</span>
              <span className="text-gray-600">({sa.allocationPct}%)</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── delete plan modal ────────────────────────────────────────────────────────
function DeletePlanModal({ plan, onConfirm, onClose }: {
  plan: DcaPlan;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const label = plan.allocations.map(a => a.asset.symbol).join(' · ');
  const name = plan.name ? ` "${plan.name}"` : '';

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6">
        <h2 className="text-base font-semibold text-gray-100 mb-2">Delete plan?</h2>
        <p className="text-sm text-gray-400 mb-1">
          <span className="font-medium text-gray-200">{label}{name}</span> will be permanently deleted.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          All buying rules and sell rules for this plan will also be removed. Transactions linked to this plan will remain in your history.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            Delete plan
          </button>
          <button
            onClick={onClose}
            className="flex-1 text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-500 text-sm py-2.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── plan card 3-dot menu ─────────────────────────────────────────────────────
function PlanMenu({ plan, onEdit, onDuplicate, onToggleActive, onDelete }: {
  plan: DcaPlan;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-lg w-8 h-8 flex items-center justify-center transition-colors"
        aria-label="Plan actions"
      >
        ···
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-44 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => { onDuplicate(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800 transition-colors"
          >
            Duplicate plan
          </button>
          <button
            onClick={() => { onToggleActive(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800 transition-colors"
          >
            {plan.isActive ? 'Pause' : 'Resume'}
          </button>
          <div className="border-t border-gray-800 mt-1 pt-1">
            <button
              onClick={() => { onDelete(); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-gray-800 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── sell rule inline edit form ───────────────────────────────────────────────
function SellRuleEditForm({ rule, isPending, onSave, onCancel }: {
  rule: SellRule;
  isPending: boolean;
  onSave: (min: number, max: number, amt: number, type: 'USD' | 'PCT') => void;
  onCancel: () => void;
}) {
  const [eMin, setEMin] = useState(String(rule.minProfit));
  const [eMax, setEMax] = useState(String(rule.maxProfit));
  const [eAmt, setEAmt] = useState(String(rule.sellAmount));
  const [eType, setEType] = useState<'USD' | 'PCT'>(rule.sellAmountType ?? 'USD');

  return (
    <div className="px-3 py-3 border-t border-gray-700/60 bg-gray-900/60 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <input type="number" value={eMin} onChange={e => setEMin(e.target.value)} placeholder="Min %"
          className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500" />
        <span className="text-gray-600 text-xs">% –</span>
        <input type="number" value={eMax} onChange={e => setEMax(e.target.value)} placeholder="Max %"
          className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500" />
        <span className="text-gray-600 text-xs">% profit → sell</span>
        <div className="flex items-center gap-1">
          <input type="number" value={eAmt} onChange={e => setEAmt(e.target.value)} placeholder={eType === 'USD' ? 'USD' : '%'}
            className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500" />
          <div className="flex rounded overflow-hidden border border-gray-700 text-xs">
            {(['USD', 'PCT'] as const).map(t => (
              <button key={t} type="button" onClick={() => setEType(t)}
                className={`px-2 py-1 transition-colors ${eType === t ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}>
                {t === 'USD' ? '$' : '%'}
              </button>
            ))}
          </div>
          {eType === 'PCT' && <span className="text-gray-600 text-xs">of holdings</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" disabled={isPending}
          onClick={() => onSave(Number(eMin), Number(eMax), Number(eAmt), eType)}
          className="text-xs bg-brand-600 hover:bg-brand-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
          {isPending ? 'Saving…' : 'Update rule'}
        </button>
        <button type="button" onClick={onCancel}
          className="text-xs px-3 py-1.5 border border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300 rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── sell rules panel (on plan card) ─────────────────────────────────────────
function SellRulesPanel({ plan, pnlPercent }: { plan: DcaPlan; pnlPercent: number | null }) {
  const createRule = useCreateSellRule();
  const updateRule = useUpdateSellRule();
  const deleteRule = useDeleteSellRule();
  const { format } = useCurrencyFormatter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [addMin, setAddMin] = useState('');
  const [addMax, setAddMax] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addAmtType, setAddAmtType] = useState<'USD' | 'PCT'>('USD');
  const [addKey, setAddKey] = useState(0);

  const sorted = [...(plan.sellRules ?? [])].sort((a, b) => a.minProfit - b.minProfit);

  const handleAdd = async () => {
    if (!addMin || !addMax || !addAmount) return;
    await createRule.mutateAsync({
      dcaPlanId: plan.id,
      minProfit: Number(addMin),
      maxProfit: Number(addMax),
      sellAmount: Number(addAmount),
      sellAmountType: addAmtType,
    });
    setAddMin(''); setAddMax(''); setAddAmount(''); setAddAmtType('USD');
    setAddKey(k => k + 1);
    toast('Sell rule added');
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
        {sorted.length === 0
          ? 'Add take profit rules'
          : `${sorted.length} take profit rule${sorted.length !== 1 ? 's' : ''}`}
        {pnlPercent !== null && sorted.length > 0 && (
          <span className={`ml-1 ${pnlPercent >= 0 ? 'text-brand-400/70' : 'text-red-400/70'}`}>
            {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}% P&L
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-2 pl-1">
          {sorted.map((rule: SellRule) => {
            const isEditing = editingId === rule.id;
            return (
              <div key={rule.id} className={`rounded-lg border overflow-hidden transition-colors ${
                isEditing ? 'border-amber-500/40 bg-gray-900' : 'border-gray-700/50 bg-gray-800/50'
              }`}>
                <div className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-mono flex items-center gap-2">
                    <span className="text-amber-400/80">+{rule.minProfit}% – +{rule.maxProfit}%</span>
                    <span className="text-gray-600">→ sell</span>
                    <span className="font-semibold text-gray-200">
                      {rule.sellAmountType === 'PCT' ? `${rule.sellAmount}%` : format(rule.sellAmount)}
                    </span>
                    {rule.sellAmountType === 'PCT' && <span className="text-gray-600 text-xs font-normal">of holdings</span>}
                  </span>
                  <div className="flex items-center gap-1.5 ml-3 shrink-0">
                    {confirmingId !== rule.id && !isEditing && (
                      <button
                        type="button"
                        onClick={() => { setEditingId(rule.id); setConfirmingId(null); }}
                        className="text-xs px-2 py-0.5 border rounded-md transition-colors border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300"
                      >
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
                      <button type="button"
                        onClick={() => { setConfirmingId(rule.id); setEditingId(null); }}
                        className="text-gray-600 hover:text-red-400 w-6 h-6 flex items-center justify-center rounded transition-colors text-sm">×</button>
                    )}
                  </div>
                </div>
                {isEditing && (
                  <SellRuleEditForm
                    rule={rule}
                    isPending={updateRule.isPending}
                    onSave={async (eMin, eMax, eAmt, eType) => {
                      await updateRule.mutateAsync({ id: rule.id, minProfit: eMin, maxProfit: eMax, sellAmount: eAmt, sellAmountType: eType });
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                )}
              </div>
            );
          })}

          {/* add rule */}
          <div className="rounded-xl border border-dashed border-gray-700 bg-gray-800/30 p-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Add take profit rule</p>
            <div key={addKey} className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <input type="number" value={addMin} onChange={e => setAddMin(e.target.value)} placeholder="Min %" className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-brand-500" />
                <span className="text-gray-600 text-xs">% –</span>
                <input type="number" value={addMax} onChange={e => setAddMax(e.target.value)} placeholder="Max %" className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-brand-500" />
                <span className="text-gray-600 text-xs">% profit → sell</span>
                <div className="flex items-center gap-1">
                  <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder={addAmtType === 'USD' ? 'USD' : '%'} className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-brand-500" />
                  <div className="flex rounded overflow-hidden border border-gray-700 text-xs">
                    {(['USD', 'PCT'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setAddAmtType(t)}
                        className={`px-2 py-1 transition-colors ${addAmtType === t ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}>
                        {t === 'USD' ? '$' : '%'}
                      </button>
                    ))}
                  </div>
                  {addAmtType === 'PCT' && <span className="text-gray-600 text-xs">of holdings</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <button type="button" onClick={handleAdd}
                  className="text-xs bg-brand-600 hover:bg-brand-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors">
                  {createRule.isPending ? 'Adding…' : 'Add rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function DcaPlans() {
  const { data: plans = [], isLoading } = useDcaPlans();
  const { data: assets = [] } = useAssets();
  const { data: dashStats } = useDashboard();

  // build assetId → pnlPercent map from dashboard stats
  const assetPnlMap = new Map<string, number>(
    (dashStats?.assetStats ?? []).map(s => [s.asset.id, s.pnlPercent])
  );

  const getPlanPnl = (plan: DcaPlan): number | null => {
    if (!dashStats || plan.allocations.length === 0) return null;
    let weighted = 0;
    for (const alloc of plan.allocations) {
      const pnl = assetPnlMap.get(alloc.assetId);
      if (pnl === undefined) return null;
      weighted += (alloc.allocationPct / 100) * pnl;
    }
    return weighted;
  };
  const updatePlan = useUpdateDcaPlan();
  const deletePlan = useDeleteDcaPlan();
  const { format } = useCurrencyFormatter();
  const router = useRouter();

  // Quick Purchase modal
  const [quickAddPlan, setQuickAddPlan] = useState<DcaPlan | null>(null);

  // null = closed, object = open (form=undefined means new plan; form=object means duplicate)
  const [createModal, setCreateModal] = useState<{
    form?: PlanFormValues; allocs: AllocDraft[]; sourceRules?: SourceRule[]; sourceSellRules?: SourceSellRule[];
  } | null>(null);
  const [editingPlan, setEditingPlan] = useState<DcaPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<DcaPlan | null>(null);

  const openNew = () => setCreateModal({ allocs: [] });

  const openDuplicate = (source: DcaPlan) => setCreateModal({
    form: {
      name: source.name ? `Copy of ${source.name}` : '',
      amountUsd: String(source.amountUsd),
      frequency: source.frequency,
      intervalDays: source.intervalDays ? String(source.intervalDays) : '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      scheduledTime: utcTimeToLocal(source.scheduledTime ?? '08:00'),
      notes: source.notes ?? '',
      perAssetRules: source.perAssetRules ?? false,
    },
    allocs: source.allocations.map((a, i) => ({
      key: i, assetId: a.assetId, allocationPct: a.allocationPct,
    })),
    sourceRules: source.buyingRules.map(r => ({
      minDrawdown: r.minDrawdown, maxDrawdown: r.maxDrawdown, buyAmount: r.buyAmount,
    })),
    sourceSellRules: (source.sellRules ?? []).map(r => ({
      minProfit: r.minProfit, maxProfit: r.maxProfit, sellAmount: r.sellAmount, sellAmountType: r.sellAmountType,
    })),
  });

  return (
    <div className="space-y-6">
      {quickAddPlan && (
        <QuickAddModal
          plan={quickAddPlan}
          onClose={() => setQuickAddPlan(null)}
        />
      )}
      {createModal && (
        <CreateModal
          assets={assets}
          initialForm={createModal.form}
          initialAllocs={createModal.allocs}
          sourceRules={createModal.sourceRules}
          sourceSellRules={createModal.sourceSellRules}
          onClose={() => setCreateModal(null)}
        />
      )}
      {editingPlan && (
        <EditModal
          plan={plans.find(p => p.id === editingPlan.id) ?? editingPlan}
          assets={assets}
          onClose={() => setEditingPlan(null)}
        />
      )}
      {planToDelete && (
        <DeletePlanModal
          plan={planToDelete}
          onConfirm={() => deletePlan.mutate(planToDelete.id)}
          onClose={() => setPlanToDelete(null)}
        />
      )}

      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-gray-100">DCA Plans</h1>
            <InfoTooltip content="Create and manage your dollar-cost averaging plans. Each plan ties an amount and a frequency to one or more assets. The app tracks your next purchase date, suggests how much to buy based on market conditions, and alerts you when it's time to act." />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {plans.length} plan{plans.length !== 1 ? 's' : ''} · {plans.filter(p => p.isActive).length} active
          </p>
        </div>
        <button onClick={openNew}
          className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + New Plan
        </button>
      </div>

      {/* plans list */}
      {isLoading ? (
        <div className="text-gray-500 text-sm animate-pulse">Loading plans...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-4xl mb-3 text-gray-700">○</p>
          <p className="font-medium text-gray-400">No DCA plans yet</p>
          <p className="text-sm mt-1">Create your first plan to start tracking</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map(plan => (
            <div key={plan.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex flex-col gap-4">
                {/* content */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* title */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5 font-bold font-mono">
                        {plan.allocations.map((alloc, i) => (
                          <span key={alloc.assetId} className="flex items-center gap-1">
                            {i > 0 && <span className="text-gray-600 font-normal text-xs">·</span>}
                            <span style={alloc.asset.color ? { color: alloc.asset.color } : { color: '#f3f4f6' }}>
                              {alloc.asset.symbol}
                            </span>
                            {plan.allocations.length > 1 && (
                              <span className="text-gray-500 text-xs font-normal">{alloc.allocationPct}%</span>
                            )}
                          </span>
                        ))}
                      </span>
                      {plan.name && <span className="text-gray-400 text-sm">({plan.name})</span>}
                      <Badge variant={plan.isActive ? 'green' : 'gray'}>
                        {plan.isActive ? 'Active' : 'Paused'}
                      </Badge>
                      <Badge variant="blue">{FREQ_LABELS[plan.frequency]}</Badge>
                      {plan.frequency === 'CUSTOM' && plan.intervalDays && (
                        <Badge variant="gray">every {plan.intervalDays}d</Badge>
                      )}
                      {plan.perAssetRules && plan.buyingRules.length > 0 && (
                        <Badge variant="gray">per-asset</Badge>
                      )}
                    </div>

                    {/* meta */}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-400 flex-wrap">
                      <span className="font-mono font-semibold text-gray-200">{format(plan.amountUsd)}</span>
                      <span>Started {formatDate(plan.startDate)}</span>
                      {plan.endDate && (
                        <span>Ends <span className="text-gray-300">{formatDate(plan.endDate)}</span></span>
                      )}
                      {plan.nextPurchaseDate && (
                        <span>
                          Next: <span className="text-gray-300">{formatDate(plan.nextPurchaseDate)}</span>
                          <span className="text-gray-500 ml-1">@ {plan.scheduledTime ?? '08:00'}</span>
                        </span>
                      )}
                      {plan.notes && (
                        <span className="text-gray-600 italic truncate max-w-xs">{plan.notes}</span>
                      )}
                    </div>

                    {/* suggested amount */}
                    <div className="mt-3">
                      <SuggestedBadge plan={plan} />
                    </div>

                    {/* inline rules manager */}
                    <PlanRulesPanel plan={plan} />
                    <SellRulesPanel plan={plan} pnlPercent={getPlanPnl(plan)} />
                  </div>

                  {/* desktop-only 3-dot menu (top-right corner) */}
                  <div className="hidden md:block shrink-0">
                    <PlanMenu
                      plan={plan}
                      onEdit={() => setEditingPlan(plan)}
                      onDuplicate={() => openDuplicate(plan)}
                      onToggleActive={() => updatePlan.mutate({ id: plan.id, data: { isActive: !plan.isActive } })}
                      onDelete={() => setPlanToDelete(plan)}
                    />
                  </div>
                </div>

                {/* actions row, bottom of card, full-width on mobile */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-800">
                  <button
                    onClick={() => router.push(`/app/plans/${plan.id}`)}
                    className="flex-1 md:flex-none text-xs text-gray-500 hover:text-brand-400 border border-gray-700 hover:border-brand-500/50 px-3 py-2 md:py-1.5 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <Eye size={12} strokeWidth={1.75} />
                    View
                  </button>
                  {plan.isActive && (
                    <button
                      onClick={() => setQuickAddPlan(plan)}
                      className="flex-1 md:flex-none text-xs text-brand-400 hover:text-brand-300 border border-brand-500/40 hover:border-brand-500/70 bg-brand-500/5 hover:bg-brand-500/10 px-3 py-2 md:py-1.5 rounded-lg transition-colors font-medium inline-flex items-center justify-center gap-1.5"
                    >
                      <PlusCircle size={12} strokeWidth={1.75} />
                      Quick Purchase
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const topAlloc = [...plan.allocations].sort((a, b) => b.allocationPct - a.allocationPct)[0];
                      if (!topAlloc) return;
                      const params = new URLSearchParams({
                        assetId:   topAlloc.assetId,
                        startDate: plan.startDate.slice(0, 10),
                        amountUsd: String(Math.round(plan.amountUsd * (topAlloc.allocationPct / 100))),
                        frequency: plan.frequency,
                      });
                      router.push(`/app/simulator?${params.toString()}`);
                    }}
                    className="flex-1 md:flex-none text-xs text-gray-500 hover:text-brand-400 border border-gray-700 hover:border-brand-500/50 px-3 py-2 md:py-1.5 rounded-lg transition-colors text-center"
                    title="Simulate this plan"
                  >
                    ⏱ Simulate
                  </button>
                  {/* 3-dot menu moves here on mobile */}
                  <div className="md:hidden shrink-0">
                    <PlanMenu
                      plan={plan}
                      onEdit={() => setEditingPlan(plan)}
                      onDuplicate={() => openDuplicate(plan)}
                      onToggleActive={() => updatePlan.mutate({ id: plan.id, data: { isActive: !plan.isActive } })}
                      onDelete={() => setPlanToDelete(plan)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
