'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, Download } from 'lucide-react';
import { useTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction, TxSortBy, TxSortOrder } from '@/hooks/useTransactions';
import { useAssets } from '@/hooks/useAssets';
import { Badge } from '@/components/ui/Badge';
import { useCurrencyFormatter, formatDate, formatQuantity } from '@/lib/format';
import { Transaction, Asset } from '@/types';
import { api } from '@/lib/api';
import { toCSVString, downloadFile, downloadXLSX, parseImportCSV, ParsedImportRow } from '@/lib/exportUtils';

// ─── delete confirm modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({ tx, onConfirm, onCancel }: {
  tx: Transaction;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { format } = useCurrencyFormatter();
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-100">Delete transaction?</h2>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Asset</span>
            <span
              className="font-mono font-semibold"
              style={tx.asset?.color ? { color: tx.asset.color } : { color: '#f3f4f6' }}
            >{tx.asset?.symbol}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Type</span>
            <span className={tx.type === 'BUY' ? 'text-green-400' : 'text-red-400'}>{tx.type}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Amount</span>
            <span className="text-gray-100">{format(tx.amountUsd)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Date</span>
            <span className="text-gray-100">{formatDate(tx.purchasedAt)}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500">This will permanently remove the transaction and update your portfolio stats.</p>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Delete
          </button>
          <button
            onClick={onCancel}
            className="flex-1 text-gray-400 hover:text-gray-200 text-sm border border-gray-700 py-2.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── shared field shape ───────────────────────────────────────────────────────
interface TxFormValues {
  type: 'BUY' | 'SELL';
  assetId: string;
  amountUsd: string;
  quantity: string;
  pricePerUnit: string;
  purchasedAt: string;
  exchange: string;
  notes: string;
}

const emptyForm = (): TxFormValues => ({
  type: 'BUY',
  assetId: '', amountUsd: '', quantity: '', pricePerUnit: '',
  purchasedAt: new Date().toISOString().slice(0, 16),
  exchange: '', notes: '',
});

function txToForm(tx: Transaction): TxFormValues {
  return {
    type: tx.type ?? 'BUY',
    assetId: tx.assetId,
    amountUsd: tx.amountUsd.toFixed(2),
    quantity: parseFloat(tx.quantity.toFixed(8)).toString(),
    pricePerUnit: tx.pricePerUnit.toFixed(2),
    purchasedAt: new Date(tx.purchasedAt).toISOString().slice(0, 16),
    exchange: tx.exchange ?? '',
    notes: tx.notes ?? '',
  };
}

// ─── reusable field grid ──────────────────────────────────────────────────────
interface TxFieldsProps {
  form: TxFormValues;
  setForm: React.Dispatch<React.SetStateAction<TxFormValues>>;
  assets: { id: string; symbol: string; name: string }[];
  lockAsset?: boolean; // editing: don't allow changing the asset
}

function TxFields({ form, setForm, assets, lockAsset }: TxFieldsProps) {
  const cls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500 disabled:opacity-50';
  const isSell = form.type === 'SELL';

  const recalcAmount = (qty: string, price: string) => {
    const q = parseFloat(qty), p = parseFloat(price);
    return q > 0 && p > 0 ? (q * p).toFixed(2) : '';
  };

  return (
    <div className="space-y-4">
      {/* BUY / SELL toggle */}
      <div className="flex gap-2">
        {(['BUY', 'SELL'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setForm(f => ({ ...f, type: t }))}
            className={`px-5 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              form.type === t
                ? t === 'BUY'
                  ? 'bg-green-600 border-green-500 text-white'
                  : 'bg-red-600 border-red-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Asset *</label>
        <select required disabled={lockAsset} value={form.assetId}
          onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))}
          className={cls}>
          <option value="">Select asset...</option>
          {assets.map(a => <option key={a.id} value={a.id}>{a.symbol} · {a.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">{isSell ? 'Quantity sold *' : 'Quantity received *'}</label>
        <input type="number" required min="0" step="any" value={form.quantity}
          onChange={e => {
            const qty = e.target.value;
            setForm(f => ({ ...f, quantity: qty, amountUsd: recalcAmount(qty, f.pricePerUnit) }));
          }}
          placeholder="0.00153" className={cls} />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Price per unit (USD) *</label>
        <input type="number" required min="0" step="any" value={form.pricePerUnit}
          onChange={e => {
            const price = e.target.value;
            setForm(f => ({ ...f, pricePerUnit: price, amountUsd: recalcAmount(f.quantity, price) }));
          }}
          placeholder="65000" className={cls} />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">{isSell ? 'Amount received (USD)' : 'Amount spent (USD)'}</label>
        <input type="number" min="0" step="0.01" value={form.amountUsd}
          onChange={e => setForm(f => ({ ...f, amountUsd: e.target.value }))}
          placeholder="100" className={cls} />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Date & time *</label>
        <input type="datetime-local" required value={form.purchasedAt}
          onChange={e => setForm(f => ({ ...f, purchasedAt: e.target.value }))}
          className={cls} />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Exchange (optional)</label>
        <input type="text" list="exchange-suggestions" value={form.exchange}
          onChange={e => setForm(f => ({ ...f, exchange: e.target.value }))}
          placeholder="Binance, Coinbase..." className={cls} />
        <datalist id="exchange-suggestions">
          {['Binance', 'Coinbase', 'Kraken', 'KuCoin', 'OKX', 'Bybit', 'Bitfinex', 'Gate.io', 'MEXC', 'Huobi'].map(ex => (
            <option key={ex} value={ex} />
          ))}
        </datalist>
      </div>

      <div className="md:col-span-2 lg:col-span-3">
        <label className="block text-xs text-gray-400 mb-1.5">Notes (optional)</label>
        <input type="text" value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder={isSell ? 'e.g. Taking 20% profit at ATH...' : 'Any notes about this purchase...'} className={cls} />
      </div>
    </div>
    </div>
  );
}

// ─── create modal ────────────────────────────────────────────────────────────
function CreateModal({ assets, onClose }: {
  assets: { id: string; symbol: string; name: string }[];
  onClose: () => void;
}) {
  const createTx = useCreateTransaction();
  const [form, setForm] = useState<TxFormValues>(emptyForm());

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTx.mutateAsync({
      type: form.type,
      assetId: form.assetId,
      amountUsd: parseFloat(form.amountUsd),
      quantity: parseFloat(form.quantity),
      pricePerUnit: parseFloat(form.pricePerUnit),
      purchasedAt: new Date(form.purchasedAt).toISOString(),
      exchange: form.exchange || undefined,
      notes: form.notes || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-base font-semibold text-gray-100">Add Transaction</h2>
          <button onClick={onClose}
            className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors"
            aria-label="Close">×</button>
        </div>

        {/* body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 overflow-y-auto">
          <TxFields form={form} setForm={setForm} assets={assets} />

          {createTx.isError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              Failed to save, please try again.
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={createTx.isPending}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              {createTx.isPending ? 'Saving...' : 'Add Transaction'}
            </button>
            <button type="button" onClick={onClose}
              className="text-gray-400 hover:text-gray-200 text-sm px-4 py-2.5 border border-gray-700 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── edit modal ───────────────────────────────────────────────────────────────
interface EditModalProps {
  tx: Transaction;
  assets: { id: string; symbol: string; name: string }[];
  onClose: () => void;
}

function EditModal({ tx, assets, onClose }: EditModalProps) {
  const updateTx = useUpdateTransaction();
  const [form, setForm] = useState<TxFormValues>(txToForm(tx));

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTx.mutateAsync({
      id: tx.id,
      data: {
        type: form.type,
        amountUsd: parseFloat(form.amountUsd),
        quantity: parseFloat(form.quantity),
        pricePerUnit: parseFloat(form.pricePerUnit),
        purchasedAt: new Date(form.purchasedAt).toISOString(),
        exchange: form.exchange || undefined,
        notes: form.notes || undefined,
      },
    });
    onClose();
  };

  return (
    // backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-100">Edit Transaction</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {tx.asset.symbol} · {formatDate(tx.purchasedAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 overflow-y-auto">
          <TxFields form={form} setForm={setForm} assets={assets} lockAsset />

          {updateTx.isError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              Failed to save, please try again.
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={updateTx.isPending}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {updateTx.isPending ? 'Saving...' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 text-sm px-4 py-2.5 border border-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── sortable column header ───────────────────────────────────────────────────
interface SortHeaderProps {
  label: string;
  field: TxSortBy;
  current: TxSortBy;
  order: TxSortOrder;
  onSort: (field: TxSortBy) => void;
  className?: string;
}

function SortHeader({ label, field, current, order, onSort, className }: SortHeaderProps) {
  const active = field === current;
  return (
    <th className={`px-5 py-3 text-left ${className ?? ''}`}>
      <button
        onClick={() => onSort(field)}
        className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
          active ? 'text-brand-400' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        {label}
        <span className="flex flex-col leading-none" aria-hidden>
          <span className={active && order === 'asc'  ? 'text-brand-400' : 'text-gray-700'}>▲</span>
          <span className={active && order === 'desc' ? 'text-brand-400' : 'text-gray-700'}>▼</span>
        </span>
      </button>
    </th>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

type ExportFormat = 'csv' | 'xlsx' | 'json';
type ExportPeriod = 'all' | 'year' | '6mo' | 'month' | 'week' | 'custom';

function periodToRange(period: ExportPeriod, customFrom: string, customTo: string): { from?: string; to?: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  if (period === 'all')    return {};
  if (period === 'week')   return { from: iso(new Date(now.getTime() - 7  * 864e5)) };
  if (period === 'month')  return { from: iso(new Date(now.getTime() - 30 * 864e5)) };
  if (period === '6mo')    return { from: iso(new Date(now.getTime() - 180 * 864e5)) };
  if (period === 'year')   return { from: iso(new Date(now.getTime() - 365 * 864e5)) };
  return { from: customFrom ? new Date(customFrom).toISOString() : undefined,
           to:   customTo   ? new Date(customTo).toISOString()   : undefined };
}

function txToExportRow(tx: Transaction) {
  return {
    date:        new Date(tx.purchasedAt).toISOString(),
    symbol:      tx.asset.symbol,
    asset_name:  tx.asset.name,
    quantity:    tx.quantity,
    price_usd:   tx.pricePerUnit,
    amount_usd:  tx.amountUsd,
    exchange:    tx.exchange ?? '',
    notes:       tx.notes ?? '',
  };
}

// ─── export modal ─────────────────────────────────────────────────────────────

interface ExportModalProps {
  assets: Asset[];
  onClose: () => void;
}

function ExportModal({ assets, onClose }: ExportModalProps) {
  const [format, setFormat]           = useState<ExportFormat>('csv');
  const [period, setPeriod]           = useState<ExportPeriod>('all');
  const [customFrom, setCustomFrom]   = useState('');
  const [customTo, setCustomTo]       = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);  // empty = all
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const toggleAsset = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleExport = async () => {
    setLoading(true);
    setError('');
    try {
      const { from, to } = periodToRange(period, customFrom, customTo);
      const assetIds = selectedIds.length > 0 ? selectedIds : assets.map(a => a.id);

      // Fetch all matching transactions (one request per asset if filtered, otherwise one big one)
      let allTx: Transaction[] = [];
      if (selectedIds.length > 0) {
        // fetch per selected asset
        for (const assetId of assetIds) {
          const res = await api.get('/transactions', { params: { assetId, from, to, limit: 10000, sortBy: 'purchasedAt', sortOrder: 'asc' } });
          allTx = allTx.concat(res.data.data as Transaction[]);
        }
      } else {
        const res = await api.get('/transactions', { params: { from, to, limit: 10000, sortBy: 'purchasedAt', sortOrder: 'asc' } });
        allTx = res.data.data as Transaction[];
      }

      if (allTx.length === 0) {
        setError('No transactions found for the selected filters.');
        setLoading(false);
        return;
      }

      const rows = allTx.map(txToExportRow);
      const filename = `transactions_${new Date().toISOString().slice(0, 10)}`;

      if (format === 'csv') {
        downloadFile(toCSVString(rows), `${filename}.csv`, 'text/csv');
      } else if (format === 'json') {
        downloadFile(JSON.stringify(allTx, null, 2), `${filename}.json`, 'application/json');
      } else if (format === 'xlsx') {
        await downloadXLSX(rows, `${filename}.xlsx`);
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Cannot find module') || msg.includes("Failed to resolve import")) {
        setError('XLSX not installed. Run: cd client && npm install xlsx, then try again.');
      } else {
        setError('Export failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-500 w-full';
  const optionBtn = (active: boolean) =>
    `flex-1 text-xs py-1.5 rounded-md border transition-colors ${active
      ? 'border-brand-500 bg-brand-500/10 text-brand-300'
      : 'border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-gray-100">Export Transactions</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* format */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Format</label>
            <div className="flex gap-2">
              {(['csv', 'xlsx', 'json'] as ExportFormat[]).map(f => (
                <button key={f} onClick={() => setFormat(f)} className={optionBtn(format === f)}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            {format === 'xlsx' && (
              <p className="text-xs text-gray-600 mt-1.5">Requires <code className="text-gray-500">npm install xlsx</code> in the client directory.</p>
            )}
          </div>

          {/* period */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Period</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {([
                ['all',   'All time'],
                ['year',  'Last year'],
                ['6mo',   'Last 6 months'],
                ['month', 'Last month'],
                ['week',  'Last week'],
                ['custom','Custom range'],
              ] as [ExportPeriod, string][]).map(([val, label]) => (
                <button key={val} onClick={() => setPeriod(val)} className={optionBtn(period === val)}>
                  {label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className={inputCls} />
                </div>
              </div>
            )}
          </div>

          {/* assets */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">
              Assets
              {selectedIds.length > 0 && (
                <button onClick={() => setSelectedIds([])} className="ml-2 text-gray-600 hover:text-gray-400 underline">
                  clear ({selectedIds.length} selected)
                </button>
              )}
            </label>
            <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {assets.map(a => {
                const selected = selectedIds.includes(a.id);
                return (
                  <button key={a.id} onClick={() => toggleAsset(a.id)}
                    className={`text-xs px-2 py-1.5 rounded-lg border text-left transition-colors ${
                      selected
                        ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                        : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300'}`}>
                    <span className="font-mono font-bold" style={a.color ? { color: a.color } : undefined}>{a.symbol}</span>
                    <span className="text-gray-600 ml-1 truncate">{a.name}</span>
                  </button>
                );
              })}
            </div>
            {selectedIds.length === 0 && (
              <p className="text-xs text-gray-600 mt-1">No selection = all assets</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={handleExport} disabled={loading}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              {loading ? 'Exporting...' : `Export ${format.toUpperCase()}`}
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

// ─── import modal ─────────────────────────────────────────────────────────────

interface ImportModalProps {
  assets: Asset[];
  onClose: () => void;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'done';

function ImportModal({ assets, onClose }: ImportModalProps) {
  const createTx     = useCreateTransaction();
  const fileRef      = useRef<HTMLInputElement>(null);
  const [step, setStep]     = useState<ImportStep>('upload');
  const [rows, setRows]     = useState<ParsedImportRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Symbol → assetId lookup
  const symbolMap = Object.fromEntries(assets.map(a => [a.symbol.toUpperCase(), a.id]));

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseImportCSV(text);

      // Resolve asset IDs
      const resolved = parsed.map(r => {
        const assetId = symbolMap[r.symbol];
        return {
          ...r,
          assetId,
          matchError: assetId ? undefined : `Asset "${r.symbol}" not found in your portfolio`,
        };
      });

      setRows(resolved);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) handleFile(file);
  };

  const validRows = rows.filter(r => !r.matchError && r.quantity > 0 && r.priceUsd > 0);

  const handleImport = async () => {
    setStep('importing');
    const errs: string[] = [];
    let done = 0;

    for (const row of validRows) {
      try {
        await createTx.mutateAsync({
          assetId:      row.assetId!,
          quantity:     row.quantity,
          pricePerUnit: row.priceUsd,
          amountUsd:    row.amountUsd || row.quantity * row.priceUsd,
          purchasedAt:  row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
          exchange:     row.exchange,
          notes:        row.notes,
        });
      } catch {
        errs.push(`Row ${done + 1} (${row.symbol}): failed to save`);
      }
      done++;
      setProgress(Math.round((done / validRows.length) * 100));
    }

    setErrors(errs);
    setStep('done');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && step !== 'importing') onClose(); }}>
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-100">Import Transactions</h2>
            <p className="text-xs text-gray-500 mt-0.5">CSV format · columns: date, symbol, quantity, price_usd, amount_usd, exchange, notes</p>
          </div>
          {step !== 'importing' && (
            <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors">×</button>
          )}
        </div>

        <div className="px-6 py-5">
          {/* ── upload step ── */}
          {step === 'upload' && (
            <div>
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-700 hover:border-brand-500 rounded-xl p-12 text-center cursor-pointer transition-colors group"
              >
                <p className="text-3xl mb-2">📂</p>
                <p className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
                  Drop a CSV file here, or click to browse
                </p>
                <p className="text-xs text-gray-600 mt-1">Accepted: .csv</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

              <div className="mt-4 p-4 bg-gray-800/50 border border-gray-800 rounded-xl">
                <p className="text-xs font-medium text-gray-400 mb-2">Expected CSV columns:</p>
                <code className="text-xs text-gray-500 font-mono">date, symbol, quantity, price_usd, amount_usd, exchange, notes</code>
                <p className="text-xs text-gray-600 mt-2">The <code className="text-gray-500">date</code>, <code className="text-gray-500">symbol</code>, <code className="text-gray-500">quantity</code>, and <code className="text-gray-500">price_usd</code> columns are required. You can also import the CSV exported from this app directly.</p>
              </div>
            </div>
          )}

          {/* ── preview step ── */}
          {step === 'preview' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-300">
                  <span className="text-green-400 font-medium">{validRows.length}</span> valid ·{' '}
                  <span className="text-red-400 font-medium">{rows.length - validRows.length}</span> skipped
                </p>
                <button onClick={() => setStep('upload')} className="text-xs text-gray-500 hover:text-gray-300 underline">
                  ← Change file
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-800">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
                    <tr className="text-gray-500 uppercase tracking-wider">
                      {['Date', 'Asset', 'Qty', 'Price', 'Amount', 'Exchange', 'Status'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {rows.map((r, i) => (
                      <tr key={i} className={r.matchError ? 'opacity-40' : ''}>
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{r.date.slice(0, 10)}</td>
                        <td className="px-3 py-2 font-mono font-bold text-gray-200">{r.symbol}</td>
                        <td className="px-3 py-2 font-mono text-gray-300">{r.quantity}</td>
                        <td className="px-3 py-2 font-mono text-gray-400">{r.priceUsd}</td>
                        <td className="px-3 py-2 font-mono text-gray-400">{r.amountUsd || '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{r.exchange || '—'}</td>
                        <td className="px-3 py-2">
                          {r.matchError
                            ? <span className="text-red-400" title={r.matchError}>✗</span>
                            : <span className="text-green-400">✓</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rows.some(r => r.matchError) && (
                <p className="text-xs text-red-400/80 mt-2">
                  Rows marked ✗ will be skipped (asset symbol not recognised).
                </p>
              )}

              {validRows.length === 0 ? (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-3">
                  No valid rows found. Check that your CSV columns match the expected format.
                </p>
              ) : (
                <div className="flex gap-3 mt-4">
                  <button onClick={handleImport}
                    className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                    Import {validRows.length} transaction{validRows.length !== 1 ? 's' : ''}
                  </button>
                  <button onClick={onClose}
                    className="text-gray-400 hover:text-gray-200 text-sm px-4 py-2.5 border border-gray-700 rounded-lg transition-colors">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── importing step ── */}
          {step === 'importing' && (
            <div className="py-8 text-center space-y-4">
              <p className="text-sm text-gray-400">Importing transactions…</p>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600">{progress}%</p>
            </div>
          )}

          {/* ── done step ── */}
          {step === 'done' && (
            <div className="py-4 space-y-4">
              <div className="text-center">
                <p className="text-3xl mb-2">{errors.length === 0 ? '✅' : '⚠️'}</p>
                <p className="text-sm font-medium text-gray-200">
                  {errors.length === 0
                    ? `${validRows.length} transaction${validRows.length !== 1 ? 's' : ''} imported successfully!`
                    : `${validRows.length - errors.length} imported, ${errors.length} failed`}
                </p>
              </div>
              {errors.length > 0 && (
                <div className="text-xs text-red-400 space-y-1 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {errors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}
              <div className="flex justify-center pt-1">
                <button onClick={onClose}
                  className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function Transactions() {
  const [assetFilter, setAssetFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'BUY' | 'SELL' | ''>('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [sortBy, setSortBy] = useState<TxSortBy>('purchasedAt');
  const [sortOrder, setSortOrder] = useState<TxSortOrder>('desc');

  const handleSort = (field: TxSortBy) => {
    if (field === sortBy) {
      setSortOrder(o => o === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1); // reset to first page on sort change
  };

  const { data, isLoading } = useTransactions({ assetId: assetFilter || undefined, type: typeFilter || undefined, page, limit: 20, sortBy, sortOrder });
  const { data: assets = [] } = useAssets();
  const deleteTx = useDeleteTransaction();
  const { format } = useCurrencyFormatter();

  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  const transactions = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {showCreate && (
        <CreateModal assets={assets} onClose={() => setShowCreate(false)} />
      )}
      {editingTx && (
        <EditModal tx={editingTx} assets={assets} onClose={() => setEditingTx(null)} />
      )}
      {showExport && (
        <ExportModal assets={assets} onClose={() => setShowExport(false)} />
      )}
      {showImport && (
        <ImportModal assets={assets} onClose={() => setShowImport(false)} />
      )}
      {deletingTx && (
        <DeleteConfirmModal
          tx={deletingTx}
          onConfirm={() => { deleteTx.mutate(deletingTx.id); setDeletingTx(null); }}
          onCancel={() => setDeletingTx(null)}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-100">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">{meta?.total ?? 0} total logged</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 text-sm font-medium px-4 py-2 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 text-sm font-medium px-4 py-2 border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add Transaction
          </button>
        </div>
      </div>

      {/* filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={assetFilter} onChange={e => { setAssetFilter(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-brand-500">
          <option value="">All assets</option>
          {assets.map(a => <option key={a.id} value={a.id}>{a.symbol}</option>)}
        </select>

        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value as 'BUY' | 'SELL' | ''); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-brand-500">
          <option value="">All types</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
      </div>

      {/* table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-gray-600">
            <p className="text-4xl mb-3">↕</p>
            <p className="font-medium text-gray-400">No transactions yet</p>
            <p className="text-sm mt-1">Log your first purchase to start tracking</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <SortHeader label="Date"     field="purchasedAt" current={sortBy} order={sortOrder} onSort={handleSort} />
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                  <SortHeader label="Amount"   field="amountUsd"   current={sortBy} order={sortOrder} onSort={handleSort} />
                  <SortHeader label="Quantity" field="quantity"     current={sortBy} order={sortOrder} onSort={handleSort} className="hidden md:table-cell" />
                  <SortHeader label="Price"    field="pricePerUnit" current={sortBy} order={sortOrder} onSort={handleSort} className="hidden lg:table-cell" />
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Exchange</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-800/50 transition-colors group">
                    <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">{formatDate(tx.purchasedAt)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded font-mono ${tx.type === 'SELL' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                        {tx.type ?? 'BUY'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold font-mono"
                        style={tx.asset.color ? { color: tx.asset.color } : { color: '#f3f4f6' }}
                      >{tx.asset.symbol}</span>
                      <span className="text-gray-500 text-xs ml-2 hidden sm:inline">{tx.asset.name}</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-gray-200">{format(tx.amountUsd)}</td>
                    <td className="px-5 py-3.5 font-mono text-gray-300 hidden md:table-cell">{formatQuantity(tx.quantity)}</td>
                    <td className="px-5 py-3.5 font-mono text-gray-400 hidden lg:table-cell">{format(tx.pricePerUnit)}</td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {tx.exchange
                        ? <Badge variant="gray">{tx.exchange}</Badge>
                        : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingTx(tx)}
                          className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingTx(tx)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* pagination */}
        {meta && meta.total > meta.limit && (
          <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-30 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                Previous
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * meta.limit >= meta.total}
                className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-30 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
