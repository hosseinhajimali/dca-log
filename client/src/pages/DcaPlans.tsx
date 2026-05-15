import { useState, useEffect, useRef } from 'react';
import {
  useDcaPlans, useCreateDcaPlan, useUpdateDcaPlan, useDeleteDcaPlan,
} from '@/hooks/useDcaPlans';
import { useAssets } from '@/hooks/useAssets';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { useCurrencyFormatter, formatDate } from '@/lib/format';
import { api } from '@/lib/api';
import { DcaFrequency, DcaPlan } from '@/types';

const FREQ_LABELS: Record<DcaFrequency, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', BIWEEKLY: 'Bi-weekly', MONTHLY: 'Monthly', CUSTOM: 'Custom',
};

const INPUT = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500 disabled:opacity-50';
const INPUT_SM = 'bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500 w-full';

// ─── types ────────────────────────────────────────────────────────────────────
interface PlanFormValues {
  assetId: string; name: string; amountUsd: string;
  frequency: DcaFrequency; intervalDays: string; startDate: string; endDate: string; notes: string;
}

// Used in create form (no plan id yet)
interface PendingRule {
  key: number;
  minDrawdown: number; maxDrawdown: number; buyAmount: number;
}

// Used in edit modal (may or may not have a server id)
interface DraftRule {
  id?: string;   // undefined = newly added, not yet saved
  key: number;
  minDrawdown: number; maxDrawdown: number; buyAmount: number;
}

const emptyForm = (): PlanFormValues => ({
  assetId: '', name: '', amountUsd: '', frequency: 'MONTHLY',
  intervalDays: '', startDate: new Date().toISOString().slice(0, 10), endDate: '', notes: '',
});

function planToForm(plan: DcaPlan): PlanFormValues {
  return {
    assetId: plan.assetId, name: plan.name ?? '',
    amountUsd: String(plan.amountUsd), frequency: plan.frequency,
    intervalDays: plan.intervalDays ? String(plan.intervalDays) : '',
    startDate: new Date(plan.startDate).toISOString().slice(0, 10),
    endDate: plan.endDate ? new Date(plan.endDate).toISOString().slice(0, 10) : '',
    notes: plan.notes ?? '',
  };
}

// ─── shared plan field grid ───────────────────────────────────────────────────
function PlanFields({ form, setForm, assets, lockAsset }: {
  form: PlanFormValues;
  setForm: React.Dispatch<React.SetStateAction<PlanFormValues>>;
  assets: { id: string; symbol: string; name: string }[];
  lockAsset?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Asset *</label>
        <select required disabled={lockAsset} value={form.assetId}
          onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))} className={INPUT}>
          <option value="">Select asset...</option>
          {assets.map(a => <option key={a.id} value={a.id}>{a.symbol} — {a.name}</option>)}
        </select>
        {!lockAsset && assets.length === 0 && (
          <p className="text-xs text-yellow-500 mt-1">No assets yet. Go to Settings to add one.</p>
        )}
      </div>
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
    </div>
  );
}

// ─── rule add row (shared between both modals) ────────────────────────────────
// NOTE: intentionally NOT a <form> — this component is often nested inside
// another <form> (create plan), and nested forms are invalid HTML.
function RuleAddRow({ onAdd }: {
  onAdd: (min: number, max: number, amount: number) => void;
}) {
  const [f, setF] = useState({ min: '', max: '', amount: '' });
  const [err, setErr] = useState('');

  const handle = () => {
    setErr('');
    const min = parseFloat(f.min), max = parseFloat(f.max), amount = parseFloat(f.amount);
    if (isNaN(min) || isNaN(max) || isNaN(amount)) return setErr('All fields are required.');
    if (min < 0 || max > 100) return setErr('Values must be 0–100.');
    if (max <= min) return setErr('Max must be greater than min.');
    if (amount <= 0) return setErr('Buy amount must be positive.');
    onAdd(min, max, amount);
    setF({ min: '', max: '', amount: '' });
  };

  return (
    <div className="space-y-2 pt-1">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Min drawdown %</label>
          <input type="number" min="0" max="99" step="1"
            value={f.min} onChange={e => setF(p => ({ ...p, min: e.target.value }))}
            placeholder="20" className={INPUT_SM} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Max drawdown %</label>
          <input type="number" min="1" max="100" step="1"
            value={f.max} onChange={e => setF(p => ({ ...p, max: e.target.value }))}
            placeholder="40" className={INPUT_SM} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Buy amount $</label>
          <input type="number" min="0.01" step="0.01"
            value={f.amount} onChange={e => setF(p => ({ ...p, amount: e.target.value }))}
            placeholder="400" className={INPUT_SM} />
        </div>
      </div>
      {err && <p className="text-xs text-red-400">{err}</p>}
      <button type="button" onClick={handle}
        className="text-xs text-brand-400 hover:text-brand-300 border border-brand-500/30 hover:border-brand-500/60 px-3 py-1.5 rounded-lg transition-colors">
        + Add Rule
      </button>
    </div>
  );
}

// ─── draft rules panel (edit modal — local state, applied only on save) ──────
function DraftRulesPanel({ drawdownFromAth, rules, onAdd, onRemove }: {
  drawdownFromAth: number | null;
  rules: DraftRule[];
  onAdd: (min: number, max: number, amount: number) => void;
  onRemove: (key: number) => void;
}) {
  const { format } = useCurrencyFormatter();
  const drawdownPct = drawdownFromAth !== null ? Math.abs(drawdownFromAth) : null;
  const sorted = [...rules].sort((a, b) => b.minDrawdown - a.minDrawdown);
  const [confirmKey, setConfirmKey] = useState<number | null>(null);

  const handleRemove = (key: number) => {
    if (confirmKey === key) {
      onRemove(key);
      setConfirmKey(null);
    } else {
      setConfirmKey(key);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Buying Rules</p>
      <p className="text-xs text-gray-500">
        Changes apply when you click Save changes.
        {drawdownPct !== null && (
          <span className="ml-1 text-brand-400 font-medium">
            Current drawdown: {drawdownPct.toFixed(1)}%
          </span>
        )}
      </p>

      {sorted.length === 0 ? (
        <p className="text-xs text-gray-600 italic">No rules yet.</p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map(rule => {
            const active = drawdownPct !== null &&
              drawdownPct >= rule.minDrawdown && drawdownPct <= rule.maxDrawdown;
            const isNew = !rule.id;
            const confirming = confirmKey === rule.key;
            return (
              <div key={rule.key}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
                  active
                    ? 'bg-brand-500/10 border-brand-500/30'
                    : isNew
                    ? 'bg-gray-800/80 border-dashed border-gray-600/60'
                    : 'bg-gray-800/50 border-gray-700/50'
                }`}>
                <div className="flex items-center gap-3">
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />}
                  <span className="font-mono text-gray-300">{rule.minDrawdown}% – {rule.maxDrawdown}%</span>
                  <span className="text-gray-600">→</span>
                  <span className={`font-mono font-semibold ${active ? 'text-brand-300' : 'text-gray-200'}`}>
                    {format(rule.buyAmount)}
                  </span>
                  {active && <Badge variant="green">active</Badge>}
                  {isNew && <span className="text-xs text-gray-500 italic">unsaved</span>}
                </div>
                <div className="flex items-center gap-1.5 ml-3 shrink-0">
                  {confirming ? (
                    <>
                      <span className="text-xs text-gray-400">Remove?</span>
                      <button type="button" onClick={() => handleRemove(rule.key)}
                        className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60 px-2 py-0.5 rounded transition-colors">
                        Yes
                      </button>
                      <button type="button" onClick={() => setConfirmKey(null)}
                        className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-2 py-0.5 rounded transition-colors">
                        No
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => handleRemove(rule.key)}
                      className="text-gray-600 hover:text-red-400 text-sm transition-colors">×</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RuleAddRow onAdd={onAdd} />
    </div>
  );
}

// ─── pending rules list (create form — plan doesn't exist yet) ────────────────
function PendingRulesList({ rules, onAdd, onRemove }: {
  rules: PendingRule[];
  onAdd: (min: number, max: number, amount: number) => void;
  onRemove: (key: number) => void;
}) {
  const sorted = [...rules].sort((a, b) => b.minDrawdown - a.minDrawdown);
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Buying Rules (optional)</p>
      <p className="text-xs text-gray-500">
        Define how much to buy at different drawdown levels. These will be saved with the plan.
      </p>
      {sorted.length > 0 && (
        <div className="space-y-1.5">
          {sorted.map(rule => (
            <div key={rule.key}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-700/50 bg-gray-800/50 text-sm">
              <span className="font-mono text-gray-300">
                {rule.minDrawdown}% – {rule.maxDrawdown}% → <span className="text-gray-200 font-semibold">${rule.buyAmount}</span>
              </span>
              <button type="button" onClick={() => onRemove(rule.key)}
                className="text-gray-600 hover:text-red-400 text-sm transition-colors ml-3">×</button>
            </div>
          ))}
        </div>
      )}
      <RuleAddRow onAdd={onAdd} />
    </div>
  );
}

// ─── create modal (new plan + duplicate) ─────────────────────────────────────
function CreateModal({ assets, initialForm, initialRules, onClose }: {
  assets: { id: string; symbol: string; name: string }[];
  initialForm?: PlanFormValues;
  initialRules?: PendingRule[];
  onClose: () => void;
}) {
  const createPlan = useCreateDcaPlan();
  const qc = useQueryClient();
  const [form, setForm] = useState<PlanFormValues>(initialForm ?? emptyForm());
  const [pendingRules, setPendingRules] = useState<PendingRule[]>(initialRules ?? []);
  const [ruleKey, setRuleKey] = useState(initialRules?.length ?? 0);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const addRule = (min: number, max: number, amount: number) => {
    setPendingRules(r => [...r, { key: ruleKey, minDrawdown: min, maxDrawdown: max, buyAmount: amount }]);
    setRuleKey(k => k + 1);
  };
  const removeRule = (key: number) => setPendingRules(r => r.filter(x => x.key !== key));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const plan = await createPlan.mutateAsync({
      assetId: form.assetId,
      name: form.name || undefined,
      amountUsd: parseFloat(form.amountUsd),
      frequency: form.frequency,
      intervalDays: form.frequency === 'CUSTOM' ? parseInt(form.intervalDays) : undefined,
      startDate: new Date(form.startDate).toISOString(),
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      notes: form.notes || undefined,
    });

    for (const rule of pendingRules) {
      await api.post(`/dca-plans/${plan.id}/rules`, {
        minDrawdown: rule.minDrawdown,
        maxDrawdown: rule.maxDrawdown,
        buyAmount: rule.buyAmount,
      });
    }

    if (pendingRules.length > 0) qc.invalidateQueries({ queryKey: ['dca-plans'] });
    onClose();
  };

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
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          <form id="create-plan-form" onSubmit={handleSubmit}>
            <PlanFields form={form} setForm={setForm} assets={assets} />
          </form>

          <div className="border-t border-gray-800 pt-5">
            <PendingRulesList rules={pendingRules} onAdd={addRule} onRemove={removeRule} />
          </div>
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t border-gray-800 shrink-0 flex gap-3">
          {createPlan.isError && (
            <p className="text-xs text-red-400 self-center mr-2">Failed to create. Try again.</p>
          )}
          <button type="submit" form="create-plan-form" disabled={createPlan.isPending}
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
  );
}

// ─── edit modal ───────────────────────────────────────────────────────────────
function EditModal({ plan, assets, onClose }: {
  plan: DcaPlan;
  assets: { id: string; symbol: string; name: string }[];
  onClose: () => void;
}) {
  const updatePlan = useUpdateDcaPlan();
  const qc = useQueryClient();
  const [form, setForm] = useState<PlanFormValues>(planToForm(plan));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Draft rules — local only, applied on save
  const [draftRules, setDraftRules] = useState<DraftRule[]>(() =>
    plan.buyingRules.map((r, i) => ({ ...r, key: i }))
  );
  const [draftKey, setDraftKey] = useState(plan.buyingRules.length);

  const addDraftRule = (min: number, max: number, amount: number) => {
    setDraftRules(r => [...r, { key: draftKey, minDrawdown: min, maxDrawdown: max, buyAmount: amount }]);
    setDraftKey(k => k + 1);
  };

  const removeDraftRule = (key: number) =>
    setDraftRules(r => r.filter(x => x.key !== key));

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setIsSaving(true);
    try {
      // 1. Save plan fields
      await updatePlan.mutateAsync({
        id: plan.id,
        data: {
          name: form.name || undefined,
          amountUsd: parseFloat(form.amountUsd),
          frequency: form.frequency,
          intervalDays: form.frequency === 'CUSTOM' ? parseInt(form.intervalDays) : undefined,
          startDate: new Date(form.startDate).toISOString(),
          endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
          notes: form.notes || undefined,
        },
      });

      // 2. Diff rules: delete removed, create new
      const draftIds = new Set(draftRules.filter(r => r.id).map(r => r.id!));
      const toDelete = plan.buyingRules.filter(r => !draftIds.has(r.id));
      const toCreate = draftRules.filter(r => !r.id);

      await Promise.all([
        ...toDelete.map(r => api.delete(`/buying-rules/${r.id}`)),
        ...toCreate.map(r => api.post(`/dca-plans/${plan.id}/rules`, {
          minDrawdown: r.minDrawdown,
          maxDrawdown: r.maxDrawdown,
          buyAmount: r.buyAmount,
        })),
      ]);

      if (toDelete.length > 0 || toCreate.length > 0) {
        qc.invalidateQueries({ queryKey: ['dca-plans'] });
      }

      onClose();
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-100">Edit DCA Plan</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {plan.asset.symbol} · {plan.name || FREQ_LABELS[plan.frequency]}
            </p>
          </div>
          <button onClick={onClose}
            className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors">×</button>
        </div>

        {/* scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          <form id="edit-plan-form" onSubmit={handleSubmit}>
            <PlanFields form={form} setForm={setForm} assets={assets} lockAsset />
          </form>

          <div className="border-t border-gray-800 pt-5">
            <DraftRulesPanel
              drawdownFromAth={plan.drawdownFromAth}
              rules={draftRules}
              onAdd={addDraftRule}
              onRemove={removeDraftRule}
            />
          </div>
        </div>

        {/* sticky footer */}
        <div className="px-6 py-4 border-t border-gray-800 shrink-0 flex gap-3">
          {saveError && (
            <p className="text-xs text-red-400 self-center mr-2">{saveError}</p>
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

// ─── suggested amount badge (on card) ────────────────────────────────────────
function SuggestedBadge({ plan }: { plan: DcaPlan }) {
  const { format } = useCurrencyFormatter();
  if (plan.buyingRules.length === 0) return null;

  const drawdownPct = plan.drawdownFromAth !== null ? Math.abs(plan.drawdownFromAth) : null;
  const hasPrice = drawdownPct !== null;
  const isOverride = plan.suggestedAmount !== plan.amountUsd;

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${
      isOverride
        ? 'bg-brand-500/10 border-brand-500/30 text-brand-300'
        : 'bg-gray-800 border-gray-700 text-gray-400'
    }`}>
      <span>Suggested</span>
      <span className="font-mono font-semibold">
        {hasPrice ? format(plan.suggestedAmount) : '—'}
      </span>
      {hasPrice && drawdownPct !== null && (
        <span className="text-gray-500">· {drawdownPct.toFixed(1)}% drawdown</span>
      )}
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
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setConfirming(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => { setOpen(o => !o); setConfirming(false); }}
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
            {confirming ? (
              <div className="px-4 py-2.5 space-y-2">
                <p className="text-xs text-gray-400">Delete this plan?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { onDelete(); setOpen(false); }}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60 px-3 py-1 rounded-lg transition-colors"
                  >Yes, delete</button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-3 py-1 rounded-lg transition-colors"
                  >Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-gray-800 transition-colors"
              >
                Delete
              </button>
            )}
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
  const updatePlan = useUpdateDcaPlan();
  const deletePlan = useDeleteDcaPlan();
  const { format } = useCurrencyFormatter();

  // null = closed, object = open (empty = new, filled = duplicate)
  const [createModal, setCreateModal] = useState<{ form: PlanFormValues; rules: PendingRule[] } | null>(null);
  const [editingPlan, setEditingPlan] = useState<DcaPlan | null>(null);

  const openNew = () => setCreateModal({ form: emptyForm(), rules: [] });

  const openDuplicate = (source: DcaPlan) => setCreateModal({
    form: {
      assetId: source.assetId,
      name: source.name ? `Copy of ${source.name}` : '',
      amountUsd: String(source.amountUsd),
      frequency: source.frequency,
      intervalDays: source.intervalDays ? String(source.intervalDays) : '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      notes: source.notes ?? '',
    },
    rules: source.buyingRules.map((r, i) => ({
      key: i, minDrawdown: r.minDrawdown, maxDrawdown: r.maxDrawdown, buyAmount: r.buyAmount,
    })),
  });

  return (
    <div className="space-y-6">
      {createModal && (
        <CreateModal
          assets={assets}
          initialForm={createModal.form}
          initialRules={createModal.rules}
          onClose={() => setCreateModal(null)}
        />
      )}
      {editingPlan && (
        <EditModal plan={editingPlan} assets={assets} onClose={() => setEditingPlan(null)} />
      )}

      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">DCA Plans</h1>
          <p className="text-sm text-gray-500 mt-1">
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
          <p className="text-4xl mb-3">♻</p>
          <p className="font-medium text-gray-400">No DCA plans yet</p>
          <p className="text-sm mt-1">Create your first plan to start tracking</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map(plan => (
            <div key={plan.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* title */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold font-mono"
                      style={plan.asset.color ? { color: plan.asset.color } : { color: '#f3f4f6' }}
                    >{plan.asset.symbol}</span>
                    {plan.name && <span className="text-gray-400 text-sm">— {plan.name}</span>}
                    <Badge variant={plan.isActive ? 'green' : 'gray'}>
                      {plan.isActive ? 'Active' : 'Paused'}
                    </Badge>
                    <Badge variant="blue">{FREQ_LABELS[plan.frequency]}</Badge>
                    {plan.frequency === 'CUSTOM' && plan.intervalDays && (
                      <Badge variant="gray">every {plan.intervalDays}d</Badge>
                    )}
                    {plan.buyingRules.length > 0 && (
                      <Badge variant="yellow">{plan.buyingRules.length} rule{plan.buyingRules.length !== 1 ? 's' : ''}</Badge>
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
                      <span>Next: <span className="text-gray-300">{formatDate(plan.nextPurchaseDate)}</span></span>
                    )}
                    {plan.notes && (
                      <span className="text-gray-600 italic truncate max-w-xs">{plan.notes}</span>
                    )}
                  </div>

                  {/* suggested badge */}
                  <div className="mt-3">
                    <SuggestedBadge plan={plan} />
                  </div>
                </div>

                {/* actions */}
                <PlanMenu
                  plan={plan}
                  onEdit={() => setEditingPlan(plan)}
                  onDuplicate={() => openDuplicate(plan)}
                  onToggleActive={() => updatePlan.mutate({ id: plan.id, data: { isActive: !plan.isActive } })}
                  onDelete={() => deletePlan.mutate(plan.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
