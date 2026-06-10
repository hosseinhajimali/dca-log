'use client';

import { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, FlaskConical } from 'lucide-react';
import BacktestModal from '@/components/BacktestModal';
import {
  useBuyingRuleSets, useCreateBuyingRuleSet, useUpdateBuyingRuleSet, useDeleteBuyingRuleSet,
  useSellRuleSets,   useCreateSellRuleSet,   useUpdateSellRuleSet,   useDeleteSellRuleSet,
} from '@/hooks/useRuleSets';
import { useDcaPlans } from '@/hooks/useDcaPlans';
import { BuyingRuleSet, SellRuleSet } from '@/types';
import { toast as showToast } from '@/lib/toast';

const INPUT = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500';
const INPUT_SM = 'bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500';

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({ title, message, onConfirm, onClose }: {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 !mt-0"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6">
        <h2 className="text-base font-semibold text-gray-100 mb-2">{title}</h2>
        <p className="text-sm text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors">
            Delete
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

// ─── Drawdown row editor ──────────────────────────────────────────────────────

interface DrawdownBuyRow { minDrawdown: string; maxDrawdown: string; multiplier: string; }
interface DrawdownSellRow { minProfit: string; maxProfit: string; sellAmount: string; sellAmountType: 'USD' | 'PCT'; }

const MULT_PRESETS = [0.25, 0.5, 1, 1.5, 2, 3, 5];

function BuyRowEditor({ rows, setRows }: { rows: DrawdownBuyRow[]; setRows: (r: DrawdownBuyRow[]) => void }) {
  const add = () => setRows([...rows, { minDrawdown: '', maxDrawdown: '', multiplier: '1' }]);
  const remove = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof DrawdownBuyRow, val: string) =>
    setRows(rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr_1fr_28px] gap-2 mb-1">
        <span className="text-xs text-gray-500">Min drawdown %</span>
        <span className="text-xs text-gray-500">Max drawdown %</span>
        <span className="text-xs text-gray-500">Multiplier</span>
        <span />
      </div>
      {rows.map((row, i) => (
        <div key={i} className="space-y-1.5">
          <div className="grid grid-cols-[1fr_1fr_1fr_28px] gap-2 items-center">
            <input type="number" min="0" max="100" step="0.1" placeholder="e.g. 20"
              value={row.minDrawdown} onChange={e => update(i, 'minDrawdown', e.target.value)}
              className={INPUT_SM} required />
            <input type="number" min="0" max="100" step="0.1" placeholder="e.g. 40"
              value={row.maxDrawdown} onChange={e => update(i, 'maxDrawdown', e.target.value)}
              className={INPUT_SM} required />
            <div className="flex items-center gap-1.5">
              <input type="number" min="0.01" step="0.01" placeholder="1"
                value={row.multiplier} onChange={e => update(i, 'multiplier', e.target.value)}
                className={`${INPUT_SM} w-16`} required />
              <span className="text-xs text-gray-500">×</span>
            </div>
            <button type="button" onClick={() => remove(i)}
              className="text-gray-600 hover:text-red-400 transition-colors w-7 h-7 flex items-center justify-center rounded">
              <Trash2 size={13} />
            </button>
          </div>
          {/* preset chips */}
          <div className="flex gap-1 flex-wrap pl-0">
            {MULT_PRESETS.map(p => (
              <button key={p} type="button"
                onClick={() => update(i, 'multiplier', String(p))}
                className={`text-xs px-2 py-0.5 rounded-md border transition-colors ${
                  parseFloat(row.multiplier) === p
                    ? 'border-brand-500/60 text-brand-400 bg-brand-500/10'
                    : 'border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400'
                }`}>
                {p}×
              </button>
            ))}
          </div>
        </div>
      ))}
      <button type="button" onClick={add}
        className="text-xs text-brand-400 hover:text-brand-300 border border-brand-500/30 hover:border-brand-500/60 px-2.5 py-1 rounded-lg transition-colors">
        + Add row
      </button>
      {rows.length === 0 && <p className="text-xs text-yellow-500">Add at least one row.</p>}
    </div>
  );
}

function SellRowEditor({ rows, setRows }: { rows: DrawdownSellRow[]; setRows: (r: DrawdownSellRow[]) => void }) {
  const add = () => setRows([...rows, { minProfit: '', maxProfit: '', sellAmount: '', sellAmountType: 'USD' }]);
  const remove = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof DrawdownSellRow, val: string) =>
    setRows(rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 mb-1">
        <span className="flex-1 min-w-0 text-xs text-gray-500">Min %</span>
        <span className="flex-1 min-w-0 text-xs text-gray-500">Max %</span>
        <span className="flex-1 min-w-0 text-xs text-gray-500">Amount</span>
        <span className="w-14 shrink-0 text-xs text-gray-500">Type</span>
        <span className="w-7 shrink-0" />
      </div>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <input type="number" min="0" step="0.1" placeholder="50"
            value={row.minProfit} onChange={e => update(i, 'minProfit', e.target.value)}
            className={`${INPUT_SM} flex-1 min-w-0`} required />
          <input type="number" min="0" step="0.1" placeholder="100"
            value={row.maxProfit} onChange={e => update(i, 'maxProfit', e.target.value)}
            className={`${INPUT_SM} flex-1 min-w-0`} required />
          <input type="number" min="0.01" step="0.01" placeholder="500"
            value={row.sellAmount} onChange={e => update(i, 'sellAmount', e.target.value)}
            className={`${INPUT_SM} flex-1 min-w-0`} required />
          <select value={row.sellAmountType} onChange={e => update(i, 'sellAmountType', e.target.value as 'USD' | 'PCT')}
            className={`${INPUT_SM} w-14 shrink-0`}>
            <option value="USD">USD</option>
            <option value="PCT">%</option>
          </select>
          <button type="button" onClick={() => remove(i)} title="Delete row"
            className="text-gray-600 hover:text-red-400 transition-colors w-7 h-7 shrink-0 flex items-center justify-center rounded">
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="text-xs text-brand-400 hover:text-brand-300 border border-brand-500/30 hover:border-brand-500/60 px-2.5 py-1 rounded-lg transition-colors">
        + Add row
      </button>
      {rows.length === 0 && <p className="text-xs text-yellow-500">Add at least one row.</p>}
    </div>
  );
}

// ─── Buying rule set form ─────────────────────────────────────────────────────

function toBuyRows(set?: BuyingRuleSet): DrawdownBuyRow[] {
  if (!set) return [{ minDrawdown: '', maxDrawdown: '', multiplier: '1' }];
  return set.rows.map(r => ({
    minDrawdown: String((r.params as { minDrawdown: number }).minDrawdown ?? ''),
    maxDrawdown: String((r.params as { maxDrawdown: number }).maxDrawdown ?? ''),
    multiplier:  String(r.multiplier),
  }));
}

function toSellRows(set?: SellRuleSet): DrawdownSellRow[] {
  if (!set) return [{ minProfit: '', maxProfit: '', sellAmount: '', sellAmountType: 'USD' }];
  return set.rows.map(r => ({
    minProfit:     String((r.params as { minProfit: number }).minProfit ?? ''),
    maxProfit:     String((r.params as { maxProfit: number }).maxProfit ?? ''),
    sellAmount:    String(r.sellAmount),
    sellAmountType: r.sellAmountType,
  }));
}

interface BuyFormProps { initial?: BuyingRuleSet; onDone: () => void; }

function BuyingRuleSetForm({ initial, onDone }: BuyFormProps) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [rows, setRows] = useState<DrawdownBuyRow[]>(toBuyRows(initial));
  const create = useCreateBuyingRuleSet();
  const update = useUpdateBuyingRuleSet();
  const saving = create.isPending || update.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rows.length === 0) return showToast('Add at least one row', 'error');
    const parsedRows = rows.map((r, i) => ({
      params: { minDrawdown: parseFloat(r.minDrawdown), maxDrawdown: parseFloat(r.maxDrawdown) },
      multiplier: parseFloat(r.multiplier) || 1,
      sortOrder: i,
    }));
    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, data: { label, notes: notes || undefined, rows: parsedRows } });
        showToast('Rule set updated');
      } else {
        await create.mutateAsync({ label, strategyType: 'DRAWDOWN_ATH', notes: notes || undefined, rows: parsedRows });
        showToast('Rule set created');
      }
      onDone();
    } catch {
      showToast('Something went wrong', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Label *</label>
          <input required value={label} onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Conservative, Aggressive" className={INPUT} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Strategy type</label>
          <div className={`${INPUT} opacity-60 cursor-not-allowed`}>Drawdown vs ATH</div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-400 mb-1.5">Notes (optional)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Any notes..." className={INPUT} />
        </div>
      </div>

      <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-3">Rules - price below ATH triggers a buy</p>
        <BuyRowEditor rows={rows} setRows={setRows} />
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone}
          className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : initial ? 'Save changes' : 'Create rule set'}
        </button>
      </div>
    </form>
  );
}

// ─── Sell rule set form ───────────────────────────────────────────────────────

interface SellFormProps { initial?: SellRuleSet; onDone: () => void; }

function SellRuleSetForm({ initial, onDone }: SellFormProps) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [rows, setRows] = useState<DrawdownSellRow[]>(toSellRows(initial));
  const create = useCreateSellRuleSet();
  const update = useUpdateSellRuleSet();
  const saving = create.isPending || update.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rows.length === 0) return showToast('Add at least one row', 'error');
    const parsedRows = rows.map((r, i) => ({
      params: { minProfit: parseFloat(r.minProfit), maxProfit: parseFloat(r.maxProfit) },
      sellAmount: parseFloat(r.sellAmount),
      sellAmountType: r.sellAmountType,
      sortOrder: i,
    }));
    try {
      if (initial) {
        await update.mutateAsync({ id: initial.id, data: { label, notes: notes || undefined, rows: parsedRows } });
        showToast('Rule set updated');
      } else {
        await create.mutateAsync({ label, strategyType: 'DRAWDOWN_ATH', notes: notes || undefined, rows: parsedRows });
        showToast('Rule set created');
      }
      onDone();
    } catch {
      showToast('Something went wrong', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Label *</label>
          <input required value={label} onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Conservative, Take profit 3x" className={INPUT} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Strategy type</label>
          <div className={`${INPUT} opacity-60 cursor-not-allowed`}>Profit target</div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-400 mb-1.5">Notes (optional)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Any notes..." className={INPUT} />
        </div>
      </div>

      <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-3">Rules - profit % above avg buy price triggers a sell</p>
        <SellRowEditor rows={rows} setRows={setRows} />
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onDone}
          className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors disabled:opacity-50">
          {saving ? 'Saving...' : initial ? 'Save changes' : 'Create rule set'}
        </button>
      </div>
    </form>
  );
}

// ─── Form modal ───────────────────────────────────────────────────────────────

function FormModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 !mt-0"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-base font-semibold text-gray-100">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── View modal ───────────────────────────────────────────────────────────────

function BuyViewModal({ set, onClose }: { set: BuyingRuleSet; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const rows = toBuyRows(set);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 !mt-0"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-100">{set.label}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Drawdown vs ATH. buying rule set</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {set.notes && (
            <div className="bg-gray-800/50 border border-gray-700/60 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-300">{set.notes}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Rules. price below ATH triggers a buy</p>
            <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-800/40">
                    <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium">#</th>
                    <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium">Min drawdown</th>
                    <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium">Max drawdown</th>
                    <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium">Multiplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-600">{i + 1}</td>
                      <td className="px-4 py-3 text-gray-300">{parseFloat(row.minDrawdown) !== 0 ? '-' : ''}{row.minDrawdown}%</td>
                      <td className="px-4 py-3 text-gray-300">{parseFloat(row.maxDrawdown) !== 0 ? '-' : ''}{row.maxDrawdown}%</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 font-medium text-brand-400">
                          {row.multiplier}<span className="text-gray-500 font-normal">×</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-800 shrink-0 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SellViewModal({ set, onClose }: { set: SellRuleSet; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const rows = toSellRows(set);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 !mt-0"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-100">{set.label}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Profit target. selling rule set</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {set.notes && (
            <div className="bg-gray-800/50 border border-gray-700/60 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-300">{set.notes}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Rules. profit % above avg buy price triggers a sell</p>
            <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-800/40">
                    <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium">#</th>
                    <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium">Min profit</th>
                    <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium">Max profit</th>
                    <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium">Sell amount</th>
                    <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-600">{i + 1}</td>
                      <td className="px-4 py-3 text-gray-300">{row.minProfit}%</td>
                      <td className="px-4 py-3 text-gray-300">{row.maxProfit}%</td>
                      <td className="px-4 py-3 font-medium text-brand-400">{row.sellAmount}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                          row.sellAmountType === 'PCT'
                            ? 'bg-purple-500/10 text-purple-400'
                            : 'bg-green-500/10 text-green-400'
                        }`}>
                          {row.sellAmountType === 'PCT' ? '%' : 'USD'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-800 shrink-0 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

type Tab = 'buying' | 'selling';

export default function RuleSets() {
  const [tab, setTab] = useState<Tab>('buying');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [addingBuy, setAddingBuy] = useState(false);
  const [addingSell, setAddingSell] = useState(false);
  const [backtestingId, setBacktestingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string; kind: Tab } | null>(null);

  const { data: buyingSets = [], isLoading: loadingBuy } = useBuyingRuleSets();
  const { data: sellSets = [], isLoading: loadingSell } = useSellRuleSets();
  const { data: plans = [] } = useDcaPlans();
  const delBuy = useDeleteBuyingRuleSet();
  const delSell = useDeleteSellRuleSet();

  // Derive usage maps: ruleSetId -> { total, active }
  const buyUsage = new Map<string, { total: number; active: number }>();
  const sellUsage = new Map<string, { total: number; active: number }>();
  for (const plan of plans) {
    for (const pr of plan.planBuyingRuleSets) {
      const prev = buyUsage.get(pr.ruleSetId) ?? { total: 0, active: 0 };
      buyUsage.set(pr.ruleSetId, { total: prev.total + 1, active: prev.active + (pr.isActive ? 1 : 0) });
    }
    for (const pr of plan.planSellRuleSets) {
      const prev = sellUsage.get(pr.ruleSetId) ?? { total: 0, active: 0 };
      sellUsage.set(pr.ruleSetId, { total: prev.total + 1, active: prev.active + (pr.isActive ? 1 : 0) });
    }
  }

  const TH = 'px-5 py-3 text-left text-xs text-gray-500 uppercase tracking-wider font-medium whitespace-nowrap';
  const TD = 'px-5 py-3.5 text-sm';

  return (
    <div className="space-y-6">
      {confirmDelete && (
        <ConfirmModal
          title="Delete rule set?"
          message={`"${confirmDelete.label}" will be permanently deleted and removed from any plans it was assigned to.`}
          onConfirm={() => {
            if (confirmDelete.kind === 'buying') delBuy.mutate(confirmDelete.id);
            else delSell.mutate(confirmDelete.id);
          }}
          onClose={() => setConfirmDelete(null)}
        />
      )}

      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-100">Rule sets</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define reusable buying and selling strategies, then assign them to your plans.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-800">
        <div className="flex">
          {(['buying', 'selling'] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setEditingId(null); setViewingId(null); setAddingBuy(false); setAddingSell(false); }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-brand-400 text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'
              }`}>
              {t === 'buying' ? 'Buying' : 'Selling'}
            </button>
          ))}
        </div>
        <button
          onClick={() => { tab === 'buying' ? setAddingBuy(true) : setAddingSell(true); setEditingId(null); }}
          className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors mb-1">
          + New {tab === 'buying' ? 'buying' : 'selling'} rule set
        </button>
      </div>

      {/* Buying tab */}
      {tab === 'buying' && (
        <div className="space-y-4">
          {loadingBuy ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : buyingSets.length === 0 && !addingBuy ? (
            <div className="border border-dashed border-gray-700 rounded-xl py-10 text-center">
              <p className="text-sm text-gray-500">No buying rule sets yet.</p>
              <p className="text-xs text-gray-600 mt-1">Create one to assign it to your plans.</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className={TH}>Label</th>
                    <th className={TH}>Type</th>
                    <th className={TH}>Rows</th>
                    <th className={TH}>Plans</th>
                    <th className={TH}>Notes</th>
                    <th className={TH}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {buyingSets.map(set => {
                    const usage = buyUsage.get(set.id);
                    return (
                    <tr key={set.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className={`${TD} font-medium text-gray-100`}>{set.label}</td>
                      <td className={`${TD} text-gray-500`}>Drawdown vs ATH</td>
                      <td className={`${TD} text-gray-400`}>{set.rows.length}</td>
                      <td className={TD}>
                        {!usage ? (
                          <span className="text-xs text-gray-600">Not used</span>
                        ) : usage.active > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                            {usage.active} active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-600 shrink-0" />
                            {usage.total} assigned
                          </span>
                        )}
                      </td>
                      <td className={`${TD} text-gray-500 max-w-xs truncate`}>{set.notes ?? '-'}</td>
                      <td className={`${TD} text-right`}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewingId(set.id)} title="View rule set"
                            className="text-gray-500 hover:text-gray-200 transition-colors p-1.5 rounded hover:bg-gray-800">
                            <Eye size={13} />
                          </button>
                          <button onClick={() => setBacktestingId(set.id)} title="Backtest rule set"
                            className="text-gray-500 hover:text-green-400 transition-colors p-1.5 rounded hover:bg-gray-800">
                            <FlaskConical size={13} />
                          </button>
                          <button onClick={() => setEditingId(set.id)} title="Edit rule set"
                            className="text-gray-500 hover:text-brand-400 transition-colors p-1.5 rounded hover:bg-gray-800">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setConfirmDelete({ id: set.id, label: set.label, kind: 'buying' })} title="Delete rule set"
                            className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded hover:bg-gray-800">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          )}

          {addingBuy && (
            <FormModal title="New buying rule set" onClose={() => setAddingBuy(false)}>
              <BuyingRuleSetForm onDone={() => setAddingBuy(false)} />
            </FormModal>
          )}

          {editingId && tab === 'buying' && (() => { const set = buyingSets.find(s => s.id === editingId); return set ? (
            <FormModal title="Edit buying rule set" onClose={() => setEditingId(null)}>
              <BuyingRuleSetForm initial={set} onDone={() => setEditingId(null)} />
            </FormModal>
          ) : null; })()}

          {viewingId && tab === 'buying' && (() => { const set = buyingSets.find(s => s.id === viewingId); return set ? (
            <BuyViewModal set={set} onClose={() => setViewingId(null)} />
          ) : null; })()}

          {backtestingId && (() => { const set = buyingSets.find(s => s.id === backtestingId); return set ? (
            <BacktestModal ruleSet={set} onClose={() => setBacktestingId(null)} />
          ) : null; })()}
        </div>
      )}

      {/* Selling tab */}
      {tab === 'selling' && (
        <div className="space-y-4">
          {loadingSell ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : sellSets.length === 0 && !addingSell ? (
            <div className="border border-dashed border-gray-700 rounded-xl py-10 text-center">
              <p className="text-sm text-gray-500">No selling rule sets yet.</p>
              <p className="text-xs text-gray-600 mt-1">Create one to assign it to your plans.</p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border border-gray-700 last:border-0">
                    <th className={TH}>Label</th>
                    <th className={TH}>Type</th>
                    <th className={TH}>Rows</th>
                    <th className={TH}>Plans</th>
                    <th className={TH}>Notes</th>
                    <th className={TH}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {sellSets.map(set => {
                    const usage = sellUsage.get(set.id);
                    return (
                    <tr key={set.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className={`${TD} font-medium text-gray-100`}>{set.label}</td>
                      <td className={`${TD} text-gray-500`}>Profit target</td>
                      <td className={`${TD} text-gray-400`}>{set.rows.length}</td>
                      <td className={TD}>
                        {!usage ? (
                          <span className="text-xs text-gray-600">Not used</span>
                        ) : usage.active > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                            {usage.active} active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-600 shrink-0" />
                            {usage.total} assigned
                          </span>
                        )}
                      </td>
                      <td className={`${TD} text-gray-500 max-w-xs truncate`}>{set.notes ?? '-'}</td>
                      <td className={`${TD} text-right`}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewingId(set.id)} title="View rule set"
                            className="text-gray-500 hover:text-gray-200 transition-colors p-1.5 rounded hover:bg-gray-800">
                            <Eye size={13} />
                          </button>
                          <button onClick={() => setEditingId(set.id)} title="Edit rule set"
                            className="text-gray-500 hover:text-brand-400 transition-colors p-1.5 rounded hover:bg-gray-800">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setConfirmDelete({ id: set.id, label: set.label, kind: 'selling' })} title="Delete rule set"
                            className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded hover:bg-gray-800">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          )}

          {addingSell && (
            <FormModal title="New selling rule set" onClose={() => setAddingSell(false)}>
              <SellRuleSetForm onDone={() => setAddingSell(false)} />
            </FormModal>
          )}

          {editingId && tab === 'selling' && (() => { const set = sellSets.find(s => s.id === editingId); return set ? (
            <FormModal title="Edit selling rule set" onClose={() => setEditingId(null)}>
              <SellRuleSetForm initial={set} onDone={() => setEditingId(null)} />
            </FormModal>
          ) : null; })()}

          {viewingId && tab === 'selling' && (() => { const set = sellSets.find(s => s.id === viewingId); return set ? (
            <SellViewModal set={set} onClose={() => setViewingId(null)} />
          ) : null; })()}
        </div>
      )}
    </div>
  );
}
