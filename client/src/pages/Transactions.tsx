import { useState, useEffect } from 'react';
import { useTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction, TxSortBy, TxSortOrder } from '@/hooks/useTransactions';
import { useAssets } from '@/hooks/useAssets';
import { Badge } from '@/components/ui/Badge';
import { useCurrencyFormatter, formatDate, formatQuantity } from '@/lib/format';
import { Transaction } from '@/types';

// ─── shared field shape ───────────────────────────────────────────────────────
interface TxFormValues {
  assetId: string;
  amountUsd: string;
  quantity: string;
  pricePerUnit: string;
  purchasedAt: string;
  exchange: string;
  notes: string;
}

const emptyForm = (): TxFormValues => ({
  assetId: '', amountUsd: '', quantity: '', pricePerUnit: '',
  purchasedAt: new Date().toISOString().slice(0, 16),
  exchange: '', notes: '',
});

function txToForm(tx: Transaction): TxFormValues {
  return {
    assetId: tx.assetId,
    amountUsd: String(tx.amountUsd),
    quantity: String(tx.quantity),
    pricePerUnit: String(tx.pricePerUnit),
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

  const recalcAmount = (qty: string, price: string) => {
    const q = parseFloat(qty), p = parseFloat(price);
    return q > 0 && p > 0 ? String(q * p) : '';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Asset *</label>
        <select required disabled={lockAsset} value={form.assetId}
          onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))}
          className={cls}>
          <option value="">Select asset...</option>
          {assets.map(a => <option key={a.id} value={a.id}>{a.symbol} — {a.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Quantity received *</label>
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
        <label className="block text-xs text-gray-400 mb-1.5">Amount spent (USD)</label>
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
          placeholder="Any notes about this purchase..." className={cls} />
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
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-gray-100">Add Transaction</h2>
          <button onClick={onClose}
            className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors"
            aria-label="Close">×</button>
        </div>

        {/* body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <TxFields form={form} setForm={setForm} assets={assets} />

          {createTx.isError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              Failed to save — please try again.
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
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
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
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <TxFields form={form} setForm={setForm} assets={assets} lockAsset />

          {updateTx.isError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              Failed to save — please try again.
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
}

function SortHeader({ label, field, current, order, onSort }: SortHeaderProps) {
  const active = field === current;
  return (
    <th className="px-5 py-3 text-left">
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

// ─── main page ────────────────────────────────────────────────────────────────
export default function Transactions() {
  const [assetFilter, setAssetFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
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

  const { data, isLoading } = useTransactions({ assetId: assetFilter || undefined, page, limit: 20, sortBy, sortOrder });
  const { data: assets = [] } = useAssets();
  const deleteTx = useDeleteTransaction();
  const { format } = useCurrencyFormatter();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">{meta?.total ?? 0} total purchases logged</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Transaction
        </button>
      </div>

      {/* filter bar */}
      <div className="flex items-center gap-3">
        <select value={assetFilter} onChange={e => { setAssetFilter(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-brand-500">
          <option value="">All assets</option>
          {assets.map(a => <option key={a.id} value={a.id}>{a.symbol}</option>)}
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
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                  <SortHeader label="Amount"   field="amountUsd"   current={sortBy} order={sortOrder} onSort={handleSort} />
                  <SortHeader label="Quantity" field="quantity"     current={sortBy} order={sortOrder} onSort={handleSort} />
                  <SortHeader label="Price"    field="pricePerUnit" current={sortBy} order={sortOrder} onSort={handleSort} />
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exchange</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-800/50 transition-colors group">
                    <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">{formatDate(tx.purchasedAt)}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold font-mono"
                        style={tx.asset.color ? { color: tx.asset.color } : { color: '#f3f4f6' }}
                      >{tx.asset.symbol}</span>
                      <span className="text-gray-500 text-xs ml-2">{tx.asset.name}</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-gray-200">{format(tx.amountUsd)}</td>
                    <td className="px-5 py-3.5 font-mono text-gray-300">{formatQuantity(tx.quantity)}</td>
                    <td className="px-5 py-3.5 font-mono text-gray-400">{format(tx.pricePerUnit)}</td>
                    <td className="px-5 py-3.5">
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
                        {confirmDeleteId === tx.id ? (
                          <span className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400">Sure?</span>
                            <button
                              onClick={() => { deleteTx.mutate(tx.id); setConfirmDeleteId(null); }}
                              className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60 px-2 py-0.5 rounded transition-colors"
                            >Yes</button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-2 py-0.5 rounded transition-colors"
                            >No</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(tx.id)}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >Delete</button>
                        )}
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
