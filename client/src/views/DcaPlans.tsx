'use client';

import { useState, useEffect, useRef } from 'react';
import { Eye, PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useRouter } from 'next/navigation';
import { QuickAddModal } from '@/components/QuickAddModal';
import {
  useDcaPlans, useCreateDcaPlan, useUpdateDcaPlan, useDeleteDcaPlan,
} from '@/hooks/useDcaPlans';
import { useAssets } from '@/hooks/useAssets';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { useCurrencyFormatter, formatDate, utcTimeToLocal, localTimeToUtc } from '@/lib/format';
import { DcaFrequency, DcaPlan, BuyingRuleSet, SellRuleSet } from '@/types';
import {
  useBuyingRuleSets, useSellRuleSets,
  useAssignBuyingRuleSet, useUnassignBuyingRuleSet,
  useAssignSellRuleSet, useUnassignSellRuleSet,
} from '@/hooks/useRuleSets';
import { toast } from '@/lib/toast';

const FREQ_LABELS: Record<DcaFrequency, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', BIWEEKLY: 'Bi-weekly', MONTHLY: 'Monthly', CUSTOM: 'Custom',
};


const INPUT = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500 disabled:opacity-50';
const INPUT_SM = 'bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500 w-full';

// ─── types ────────────────────────────────────────────────────────────────────
interface PlanFormValues {
  name: string; amountUsd: string;
  maxBudgetUsd: string;
  frequency: DcaFrequency; intervalDays: string; startDate: string; endDate: string;
  scheduledTime: string; notes: string;
}

interface AllocDraft {
  key: number;
  assetId: string;
  allocationPct: number;
}


const emptyForm = (): PlanFormValues => ({
  name: '', amountUsd: '', maxBudgetUsd: '',
  frequency: 'MONTHLY',
  intervalDays: '', startDate: new Date().toISOString().slice(0, 10), endDate: '',
  scheduledTime: '08:00', notes: '',
});

function planToForm(plan: DcaPlan): PlanFormValues {
  return {
    name: plan.name ?? '',
    amountUsd:    String(plan.amountUsd),
    maxBudgetUsd: plan.maxBudgetUsd != null ? String(plan.maxBudgetUsd) : '',
    frequency:    plan.frequency,
    intervalDays: plan.intervalDays ? String(plan.intervalDays) : '',
    startDate: new Date(plan.startDate).toISOString().slice(0, 10),
    endDate: plan.endDate ? new Date(plan.endDate).toISOString().slice(0, 10) : '',
    scheduledTime: utcTimeToLocal(plan.scheduledTime ?? '08:00'),
    notes: plan.notes ?? '',
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
        <label className="block text-xs text-gray-400 mb-1.5">
          Max amount <span className="text-gray-600">(optional)</span>
        </label>
        <input type="number" min="0.01" step="0.01" value={form.maxBudgetUsd}
          onChange={e => setForm(f => ({ ...f, maxBudgetUsd: e.target.value }))}
          placeholder="e.g. 500" className={INPUT} />
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

      </div>{/* end inner grid */}
    </div>
  );
}

// ─── create modal ─────────────────────────────────────────────────────────────
function CreateModal({ assets, onClose }: {
  assets: { id: string; symbol: string; name: string; color?: string | null }[];
  onClose: () => void;
}) {
  const createPlan = useCreateDcaPlan();
  const [form, setForm] = useState<PlanFormValues>(emptyForm());
  const [allocations, setAllocations] = useState<AllocDraft[]>([]);
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
    if (allocations.length === 0 || Math.abs(allocTotal - 100) >= 0.01) return;
    try {
      await createPlan.mutateAsync({
        name: form.name || undefined,
        amountUsd: parseFloat(form.amountUsd),
        maxBudgetUsd: form.maxBudgetUsd ? parseFloat(form.maxBudgetUsd) : undefined,
        frequency: form.frequency,
        intervalDays: form.frequency === 'CUSTOM' ? parseInt(form.intervalDays) : undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        scheduledTime: localTimeToUtc(form.scheduledTime || '08:00'),
        notes: form.notes || undefined,
        allocations: allocations.map(a => ({ assetId: a.assetId, allocationPct: a.allocationPct })),
      } as Parameters<typeof createPlan.mutateAsync>[0]);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Failed to create plan. Please check your inputs and try again.';
      setSubmitError(msg);
    }
  };

  const allocTotal = allocations.reduce((s, a) => s + a.allocationPct, 0);
  const allocError = allocations.length === 0
    ? 'Add at least one asset'
    : Math.abs(allocTotal - 100) >= 0.01
    ? `Allocations must sum to 100% (currently ${allocTotal.toFixed(1)}%)`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-base font-semibold text-gray-100">New DCA Plan</h2>
          <button onClick={onClose}
            className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <form id="create-plan-form" onSubmit={handleSubmit}>
            <PlanFields form={form} setForm={setForm} assets={assets}
              allocations={allocations} setAllocations={setAllocations} />
          </form>
        </div>
        <div className="px-6 py-4 border-t border-gray-800 shrink-0 flex gap-3 flex-wrap">
          {(submitError || allocError) && (
            <p className="text-xs text-red-400 self-center mr-2 w-full">{allocError || submitError}</p>
          )}
          <button type="submit" form="create-plan-form" disabled={createPlan.isPending || !!allocError}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
            {createPlan.isPending ? 'Creating...' : 'Create plan'}
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
          maxBudgetUsd: form.maxBudgetUsd ? parseFloat(form.maxBudgetUsd) : null,
          frequency: form.frequency,
          intervalDays: form.frequency === 'CUSTOM' ? parseInt(form.intervalDays) : undefined,
          startDate: new Date(form.startDate).toISOString(),
          endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
          scheduledTime: localTimeToUtc(form.scheduledTime || '08:00'),
          notes: form.notes || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6">
        <h2 className="text-base font-semibold text-gray-100 mb-2">Delete plan?</h2>
        <p className="text-sm text-gray-400 mb-1">
          <span className="font-medium text-gray-200">{label}{name}</span> will be permanently deleted.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Transactions linked to this plan will remain in your history.
        </p>
        <div className="flex gap-3">
          <button onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">
            Delete plan
          </button>
          <button onClick={onClose}
            className="flex-1 text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-500 text-sm py-2.5 rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── plan card 3-dot menu ─────────────────────────────────────────────────────
function PlanMenu({ plan, onEdit, onDelete }: {
  plan: DcaPlan;
  onEdit: () => void;
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
          <button onClick={() => { onEdit(); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800 transition-colors flex items-center gap-2">
            <Pencil size={13} />
            Edit
          </button>
          <div className="border-t border-gray-800 mt-1 pt-1">
            <button onClick={() => { onDelete(); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-gray-800 transition-colors flex items-center gap-2">
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── rule sets panel ─────────────────────────────────────────────────────────

function AddRuleSetModal({ plan, kind, onClose }: {
  plan: DcaPlan;
  kind: 'buying' | 'selling';
  onClose: () => void;
}) {
  const { data: allBuyingSets = [] } = useBuyingRuleSets();
  const { data: allSellSets = [] } = useSellRuleSets();
  const assignBuy = useAssignBuyingRuleSet();
  const assignSell = useAssignSellRuleSet();

  const assignedIds = new Set(
    kind === 'buying'
      ? (plan.planBuyingRuleSets?.map(p => p.ruleSetId) ?? [])
      : (plan.planSellRuleSets?.map(p => p.ruleSetId) ?? [])
  );
  const available = (kind === 'buying' ? allBuyingSets : allSellSets).filter(s => !assignedIds.has(s.id));

  const [selectedId, setSelectedId] = useState(available[0]?.id ?? '');
  const saving = assignBuy.isPending || assignSell.isPending;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleAdd = async () => {
    if (!selectedId) return;
    const isFirst = assignedIds.size === 0;
    if (kind === 'buying') {
      await assignBuy.mutateAsync({ planId: plan.id, ruleSetId: selectedId, isActive: isFirst });
    } else {
      await assignSell.mutateAsync({ planId: plan.id, ruleSetId: selectedId, isActive: isFirst });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6">
        <h2 className="text-base font-semibold text-gray-100 mb-4">
          Add {kind} rule set
        </h2>
        {available.length === 0 ? (
          <p className="text-sm text-gray-500 mb-6">
            All your {kind} rule sets are already assigned to this plan.
          </p>
        ) : (
          <div className="mb-6">
            <label className="block text-xs text-gray-400 mb-1.5">Rule set</label>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500">
              {available.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        )}
        <div className="flex gap-3">
          {available.length > 0 && (
            <button onClick={handleAdd} disabled={saving || !selectedId}
              className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">
              {saving ? 'Adding...' : 'Add'}
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-500 text-sm py-2.5 rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function PlanRuleSetsPanel({ plan }: { plan: DcaPlan }) {
  const [addModal, setAddModal] = useState<'buying' | 'selling' | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<{ kind: 'buying' | 'selling'; ruleSetId: string; label: string } | null>(null);

  const { data: allBuyingSets = [] } = useBuyingRuleSets();
  const { data: allSellSets = [] } = useSellRuleSets();
  const assignBuy = useAssignBuyingRuleSet();
  const unassignBuy = useUnassignBuyingRuleSet();
  const assignSell = useAssignSellRuleSet();
  const unassignSell = useUnassignSellRuleSet();

  const { format } = useCurrencyFormatter();

  const hasBuyingSets = allBuyingSets.length > 0;
  const hasSellingSets = allSellSets.length > 0;
  if (!hasBuyingSets && !hasSellingSets) return null;

  // Evaluate a rule set per asset - each asset checked independently
  function getPerAssetSuggestions(set: BuyingRuleSet) {
    const assetDrawdowns = plan.assetDrawdowns ?? plan.allocations.map(a => ({ ...a, drawdownPct: null }));
    return assetDrawdowns.map(a => {
      const baseAmount = plan.amountUsd * (a.allocationPct / 100);
      const match = a.drawdownPct != null
        ? set.rows
            .slice()
            .sort((x, y) => y.sortOrder - x.sortOrder)
            .find(r => {
              const p = r.params as { minDrawdown?: number; maxDrawdown?: number };
              return p.minDrawdown != null && p.maxDrawdown != null
                && a.drawdownPct! >= p.minDrawdown && a.drawdownPct! <= p.maxDrawdown;
            }) ?? null
        : null;
      return {
        symbol: a.symbol,
        color: a.color,
        drawdownPct: a.drawdownPct,
        multiplier: match ? match.multiplier : 1,
        amount: +(baseAmount * (match ? match.multiplier : 1)).toFixed(2),
        fires: match !== null,
      };
    });
  }

  const buyingSets = plan.planBuyingRuleSets ?? [];
  const sellingSets = plan.planSellRuleSets ?? [];

  const TD = 'px-3 py-2.5 text-sm';
  const TH = 'px-3 py-2.5 text-xs text-gray-500 uppercase tracking-wider font-medium text-left';

  return (
    <div className="mt-3 space-y-3">
      {addModal && (
        <AddRuleSetModal plan={plan} kind={addModal} onClose={() => setAddModal(null)} />
      )}
      {removeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setRemoveConfirm(null); }}>
          <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6">
            <h2 className="text-base font-semibold text-gray-100 mb-2">Remove rule set?</h2>
            <p className="text-sm text-gray-400 mb-6">"{removeConfirm.label}" will be removed from this plan.</p>
            <div className="flex gap-3">
              <button onClick={() => {
                if (removeConfirm.kind === 'buying') unassignBuy.mutate({ planId: plan.id, ruleSetId: removeConfirm.ruleSetId });
                else unassignSell.mutate({ planId: plan.id, ruleSetId: removeConfirm.ruleSetId });
                setRemoveConfirm(null);
              }} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">
                Remove
              </button>
              <button onClick={() => setRemoveConfirm(null)}
                className="flex-1 text-gray-400 hover:text-gray-200 border border-gray-700 text-sm py-2.5 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buying rules table */}
      {hasBuyingSets && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Buying rules</h2>
            <button onClick={() => setAddModal('buying')}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
              + Add rule set
            </button>
          </div>
          {buyingSets.length === 0 ? (
            <p className="text-xs text-gray-600 px-3 py-3">No rule sets assigned.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className={TH}>Label</th>
                  <th className={TH}>Per asset</th>
                  <th className={TH}>Total</th>
                  <th className={TH}></th>
                </tr>
              </thead>
              <tbody>
                {buyingSets.map(prs => {
                  const perAsset = getPerAssetSuggestions(prs.ruleSet);
                  const total = +perAsset.reduce((s, a) => s + a.amount, 0).toFixed(2);
                  const anyFires = perAsset.some(a => a.fires);
                  return (
                    <tr key={prs.ruleSetId} className="border-b border-gray-800 last:border-0">
                      <td className={TD}>
                        <span className="text-gray-200">{prs.ruleSet.label}</span>
                      </td>
                      <td className={TD}>
                        {anyFires || plan.allocations.length > 0 ? (
                          <div className="space-y-0.5">
                            {perAsset.map(a => (
                              <div key={a.symbol} className="flex items-center gap-1.5 text-xs font-mono">
                                <span style={a.color ? { color: a.color } : { color: '#9ca3af' }} className="font-medium">{a.symbol}</span>
                                {a.drawdownPct != null
                                  ? <span className="text-red-400/70">-{a.drawdownPct.toFixed(1)}%</span>
                                  : <span className="text-gray-700">no price</span>}
                                <span className="text-gray-600">→</span>
                                <span className={a.fires ? 'text-brand-300 font-semibold' : 'text-gray-500'}>
                                  {a.multiplier}× {format(a.amount)}
                                </span>
                                {!a.fires && a.drawdownPct != null && <span className="text-gray-700">no rule</span>}
                              </div>
                            ))}
                          </div>
                        ) : <span className="text-gray-700 text-xs">-</span>}
                      </td>
                      <td className={`${TD} font-mono font-semibold ${anyFires ? 'text-brand-300' : 'text-gray-600'}`}>
                        <div className="flex flex-col gap-0.5">
                          <span>{format(total)}</span>
                          {plan.maxBudgetUsd && total > plan.maxBudgetUsd && (
                            <span className="text-xs text-yellow-500 font-normal">Exceeds max {format(plan.maxBudgetUsd)}</span>
                          )}
                        </div>
                      </td>
                      <td className={`${TD} text-right`}>
                        <div className="flex items-center justify-end gap-2">
                          {prs.isActive && <Badge variant="green">default</Badge>}
                          {!prs.isActive && (
                            <button onClick={() => assignBuy.mutate({ planId: plan.id, ruleSetId: prs.ruleSetId, isActive: true })}
                              className="text-xs text-gray-500 hover:text-brand-400 border border-gray-700 hover:border-brand-500/50 px-2 py-0.5 rounded transition-colors whitespace-nowrap">
                              Set default
                            </button>
                          )}
                          <button onClick={() => setRemoveConfirm({ kind: 'buying', ruleSetId: prs.ruleSetId, label: prs.ruleSet.label })}
                            title="Remove" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Selling rules table */}
      {hasSellingSets && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300">Selling rules</h2>
            <button onClick={() => setAddModal('selling')}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
              + Add rule set
            </button>
          </div>
          {sellingSets.length === 0 ? (
            <p className="text-xs text-gray-600 px-3 py-3">No rule sets assigned.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className={TH}>Label</th>
                  <th className={TH}>Type</th>
                  <th className={TH}></th>
                </tr>
              </thead>
              <tbody>
                {sellingSets.map(prs => (
                  <tr key={prs.ruleSetId} className="border-b border-gray-800 last:border-0">
                    <td className={TD}>
                      <span className="text-gray-200">{prs.ruleSet.label}</span>
                    </td>
                    <td className={`${TD} text-xs text-gray-500`}>Profit target</td>
                    <td className={`${TD} text-right`}>
                      <div className="flex items-center justify-end gap-2">
                        {prs.isActive && <Badge variant="green">default</Badge>}
                        {!prs.isActive && (
                          <button onClick={() => assignSell.mutate({ planId: plan.id, ruleSetId: prs.ruleSetId, isActive: true })}
                            className="text-xs text-gray-500 hover:text-brand-400 border border-gray-700 hover:border-brand-500/50 px-2 py-0.5 rounded transition-colors whitespace-nowrap">
                            Set default
                          </button>
                        )}
                        <button onClick={() => setRemoveConfirm({ kind: 'selling', ruleSetId: prs.ruleSetId, label: prs.ruleSet.label })}
                          title="Remove" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function DcaPlans() {
  const { data: plans = [], isLoading } = useDcaPlans();
  const { data: assets = [] } = useAssets();
  const updatePlan = useUpdateDcaPlan();
  const deletePlan = useDeleteDcaPlan();
  const { format } = useCurrencyFormatter();
  const router = useRouter();

  // Quick Purchase modal
  const [quickAddPlan, setQuickAddPlan] = useState<DcaPlan | null>(null);

  const [createModal, setCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DcaPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<DcaPlan | null>(null);

  const openNew = () => setCreateModal(true);

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
          onClose={() => setCreateModal(false)}
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
          <p className="text-sm text-gray-500 mt-1">
            {plans.length} plan{plans.length !== 1 ? 's' : ''}
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
                      <Badge variant="blue">{FREQ_LABELS[plan.frequency]}</Badge>
                      {plan.frequency === 'CUSTOM' && plan.intervalDays && (
                        <Badge variant="gray">every {plan.intervalDays}d</Badge>
                      )}
                    </div>

                    {/* meta */}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-400 flex-wrap">
                      <span className="font-mono font-semibold text-gray-200">{format(plan.amountUsd)}</span>
                      <span>
                        <span>{formatDate(plan.startDate)}</span>
                        {plan.endDate && (
                            <span> - {formatDate(plan.endDate)}</span>
                        )}
                      </span>
                      {plan.nextPurchaseDate && (
                        <span>
                          Next buy: <span className="text-gray-300">{formatDate(plan.nextPurchaseDate)}</span>
                          <span className="text-gray-500 ml-1">@ {utcTimeToLocal(plan.scheduledTime ?? '08:00')}</span>
                        </span>
                      )}
                      {plan.notes && (
                        <span className="text-gray-600 italic truncate max-w-xs">{plan.notes}</span>
                      )}
                    </div>

                    {/* rule set assignments */}
                    <PlanRuleSetsPanel plan={plan} />
                  </div>

                  {/* desktop-only 3-dot menu (top-right corner) */}
                  <div className="hidden md:block shrink-0">
                    <PlanMenu
                      plan={plan}
                      onEdit={() => setEditingPlan(plan)}
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
                  <button
                    onClick={() => setQuickAddPlan(plan)}
                    className="flex-1 md:flex-none text-xs text-brand-400 hover:text-brand-300 border border-brand-500/40 hover:border-brand-500/70 bg-brand-500/5 hover:bg-brand-500/10 px-3 py-2 md:py-1.5 rounded-lg transition-colors font-medium inline-flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle size={12} strokeWidth={1.75} />
                    Quick Purchase
                  </button>
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
