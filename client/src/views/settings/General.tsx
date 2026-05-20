'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '@/hooks/useAssets';
import { Badge } from '@/components/ui/Badge';
import { Asset, AssetType } from '@/types';
import { toast } from '@/lib/toast';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

const CURRENCIES = ['USD', 'EUR', 'CZK', 'GBP', 'JPY', 'CHF'];

const POPULAR_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', assetType: 'CRYPTO' as AssetType, coingeckoId: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', assetType: 'CRYPTO' as AssetType, coingeckoId: 'ethereum' },
  { symbol: 'SOL', name: 'Solana', assetType: 'CRYPTO' as AssetType, coingeckoId: 'solana' },
  { symbol: 'BNB', name: 'BNB', assetType: 'CRYPTO' as AssetType, coingeckoId: 'binancecoin' },
  { symbol: 'XAU', name: 'Gold', assetType: 'METAL' as AssetType },
  { symbol: 'XAG', name: 'Silver', assetType: 'METAL' as AssetType },
];

const INPUT = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500 disabled:opacity-50';

// ─── asset modal ──────────────────────────────────────────────────────────────
interface AssetModalProps {
  mode: 'add' | 'edit';
  asset?: Asset;
  onClose: () => void;
}

function AssetModal({ mode, asset, onClose }: AssetModalProps) {
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();

  const [symbol, setSymbol] = useState(asset?.symbol ?? '');
  const [name, setName] = useState(asset?.name ?? '');
  const [assetType, setAssetType] = useState<AssetType>(asset?.assetType ?? 'CRYPTO');
  const [coingeckoId, setCoingeckoId] = useState(asset?.coingeckoId ?? '');
  const [athOverride, setAthOverride] = useState(asset?.athOverride != null ? String(asset.athOverride) : '');
  const [useColor, setUseColor] = useState(!!asset?.color);
  const [color, setColor] = useState(asset?.color ?? '#ffffff');

  const isPending = createAsset.isPending || updateAsset.isPending;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'add') {
      const sym = symbol.toUpperCase();
      const athVal = athOverride !== '' ? parseFloat(athOverride) : undefined;
      await createAsset.mutateAsync({ symbol: sym, name, assetType, coingeckoId: coingeckoId || undefined, color: useColor ? color : undefined, athOverride: athVal });
      toast(`${sym} added`);
    } else if (asset) {
      const athVal = athOverride !== '' ? parseFloat(athOverride) : null;
      await updateAsset.mutateAsync({ id: asset.id, data: { name, coingeckoId: coingeckoId || undefined, color: useColor ? color : null, athOverride: athVal } });
      toast(`${asset.symbol} updated`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-gray-100">
            {mode === 'add' ? 'Add Asset' : `Edit ${asset?.symbol}`}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Symbol *</label>
              <input type="text" required disabled={mode === 'edit'} value={symbol}
                onChange={e => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. DOGE" className={INPUT} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Name *</label>
              <input type="text" required value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Dogecoin" className={INPUT} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Type *</label>
              <select required disabled={mode === 'edit'} value={assetType}
                onChange={e => setAssetType(e.target.value as AssetType)} className={INPUT}>
                {['CRYPTO', 'METAL', 'STOCK', 'ETF', 'OTHER'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">CoinGecko ID</label>
              <input type="text" value={coingeckoId}
                onChange={e => setCoingeckoId(e.target.value)}
                placeholder="e.g. bitcoin" className={INPUT} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5">
                ATH Override <span className="text-gray-600">(USD - optional)</span>
              </label>
              <input
                type="number" min="0" step="any"
                value={athOverride}
                onChange={e => setAthOverride(e.target.value)}
                placeholder={assetType === 'CRYPTO' ? 'Auto-fetched from CoinGecko' : 'e.g. 3500'}
                className={INPUT}
              />
              <p className="text-xs text-gray-600 mt-1.5">
                {assetType === 'CRYPTO'
                  ? 'Leave blank to use the auto-fetched ATH. Set manually to override it.'
                  : 'Enter the all-time high price in USD. Required for drawdown calculation and buying rules.'}
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-4 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={useColor} onChange={e => setUseColor(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-brand-500 cursor-pointer" />
              <span className="text-sm text-gray-300">Color identity</span>
              <span className="text-xs text-gray-600">colors the symbol text across the app</span>
            </label>
            {useColor && (
              <div className="flex items-center gap-3 pl-6">
                <input type="color" value={color} onChange={e => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer p-0.5" />
                <span className="font-mono font-bold text-sm" style={{ color }}>
                  {symbol || asset?.symbol || 'ABC'}
                </span>
                <span className="text-xs text-gray-600">{color}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={isPending}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              {isPending ? 'Saving...' : mode === 'add' ? 'Add Asset' : 'Save changes'}
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

// ─── asset row ────────────────────────────────────────────────────────────────
function AssetRow({ asset, onEdit, isConfirming, onRemoveRequest, onCancelRemove }: {
  asset: Asset; onEdit: () => void;
  isConfirming: boolean; onRemoveRequest: () => void; onCancelRemove: () => void;
}) {
  const deleteAsset = useDeleteAsset();

  return (
    <div className="px-5 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold"
          style={asset.color ? { color: asset.color } : { color: '#e5e7eb' }}>
          {asset.symbol}
        </span>
        <span className="text-gray-500 text-sm">{asset.name}</span>
        <Badge variant={asset.assetType === 'CRYPTO' ? 'blue' : asset.assetType === 'METAL' ? 'yellow' : 'gray'}>
          {asset.assetType}
        </Badge>
        {asset.color && (
          <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/10"
            style={{ background: asset.color }} />
        )}
      </div>
      <div className="flex items-center gap-3">
        {!isConfirming && (
          <button onClick={onEdit} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">Edit</button>
        )}
        {isConfirming ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Remove {asset.symbol}?</span>
            <button
              onClick={() => { deleteAsset.mutate(asset.id, { onSuccess: () => toast(`${asset.symbol} removed`) }); onCancelRemove(); }}
              className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60 px-2.5 py-1 rounded-lg transition-colors">
              Yes, remove
            </button>
            <button onClick={onCancelRemove}
              className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-2.5 py-1 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={onRemoveRequest} className="text-xs text-red-400 hover:text-red-300 transition-colors">Remove</button>
        )}
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function General() {
  const { currency, setCurrency, user } = useStore();
  const { data: assets = [] } = useAssets();
  const createAsset = useCreateAsset();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Backup / restore state
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear all data state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearInput, setClearInput] = useState('');
  const [clearLoading, setClearLoading] = useState(false);

  const assetSymbols = new Set(assets.map(a => a.symbol));

  async function handleDownloadBackup() {
    setBackupLoading(true);
    try {
      const res = await api.get('/backup', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `dcalog_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Backup downloaded');
    } catch {
      toast('Failed to download backup');
    } finally {
      setBackupLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast('Please select a .json backup file');
      return;
    }
    setPendingFile(file);
    setShowRestoreConfirm(true);
    // reset input so same file can be re-selected
    e.target.value = '';
  }

  async function handleConfirmRestore() {
    if (!pendingFile) return;
    setRestoreLoading(true);
    setShowRestoreConfirm(false);
    try {
      const text = await pendingFile.text();
      const json = JSON.parse(text);
      const res = await api.post<{ data: { restored: Record<string, number> } }>('/backup/restore', json);
      // Invalidate all cached data so UI reflects restored state
      await queryClient.invalidateQueries();
      const totals = Object.values(res.data.data.restored).reduce((s, n) => s + n, 0);
      toast(`Restore complete: ${totals} records restored`);
    } catch {
      toast('Restore failed, file may be invalid or corrupted.');
    } finally {
      setRestoreLoading(false);
      setPendingFile(null);
    }
  }

  async function handleClearAllData() {
    setClearLoading(true);
    try {
      await api.delete('/backup/clear');
      queryClient.invalidateQueries();
      toast('All data cleared');
      setShowClearConfirm(false);
      setClearInput('');
    } catch {
      toast('Failed to clear data');
    } finally {
      setClearLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {showAddModal && <AssetModal mode="add" onClose={() => setShowAddModal(false)} />}
      {editingAsset && <AssetModal mode="edit" asset={editingAsset} onClose={() => setEditingAsset(null)} />}

      {/* Currency */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">Display Currency</h2>
        <p className="text-xs text-gray-500">All values are stored in USD and converted at current exchange rates</p>
        <div className="flex flex-wrap gap-2">
          {CURRENCIES.map(c => (
            <button key={c}
              onClick={() => { setCurrency(c); toast(`Currency set to ${c}`); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                currency === c
                  ? 'bg-brand-600 border-brand-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}>
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Assets */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-300">My Assets</h2>
            <p className="text-xs text-gray-500 mt-1">Assets you track across plans and transactions</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="text-xs text-brand-400 hover:text-brand-300 border border-brand-500/30 hover:border-brand-500/60 px-3 py-1.5 rounded-lg transition-colors">
            + Add Asset
          </button>
        </div>
        <div className="px-5 py-4 border-b border-gray-800">
          <p className="text-xs text-gray-500 mb-3">Quick add:</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_ASSETS.map(a => (
              <button key={a.symbol}
                disabled={assetSymbols.has(a.symbol) || createAsset.isPending}
                onClick={() => createAsset.mutate(a, { onSuccess: () => toast(`${a.symbol} added`) })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  assetSymbols.has(a.symbol)
                    ? 'border-brand-500/30 text-brand-400 bg-brand-500/10 cursor-default'
                    : 'border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 bg-gray-800'
                }`}>
                {assetSymbols.has(a.symbol) ? '✓ ' : '+ '}{a.symbol}
              </button>
            ))}
          </div>
        </div>
        {assets.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-600 text-sm">No assets yet. Add one above.</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {assets.map(asset => (
              <AssetRow key={asset.id} asset={asset}
                onEdit={() => setEditingAsset(asset)}
                isConfirming={confirmRemoveId === asset.id}
                onRemoveRequest={() => setConfirmRemoveId(asset.id)}
                onCancelRemove={() => setConfirmRemoveId(null)} />
            ))}
          </div>
        )}
      </section>

      {/* Account */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Account</h2>
        <div className="space-y-1 text-sm text-gray-400">
          <p><span className="text-gray-500">Email: </span>{user?.email}</p>
          <p className="text-xs text-gray-600">Email cannot be changed</p>
        </div>
      </section>

      {/* Backup & Restore */}
      <section id="backup" className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-300">Backup & Restore</h2>
          <p className="text-xs text-gray-500 mt-1">
            Download all your data as a JSON file, or restore from a previous backup. Restore replaces all current data.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownloadBackup}
            disabled={backupLoading}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {backupLoading ? 'Preparing…' : '⬇ Download backup'}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={restoreLoading}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            {restoreLoading ? 'Restoring…' : '⬆ Restore from file'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="border-t border-gray-800 pt-4">
          <p className="text-xs text-gray-500 mb-2">New to DCAlog? Try it with sample data:</p>
          <a
            href="/sample-data.json"
            download="dcalog-sample-data.json"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            ⬇ Download sample data
          </a>
          <p className="text-xs text-gray-600 mt-1.5">Includes 17 months of BTC, ETH & Gold DCA, restore it to explore the app.</p>
        </div>

        <div className="border-t border-gray-800 pt-4">
          <p className="text-xs text-gray-500 mb-2">Want to start fresh?</p>
          <button
            onClick={() => { setShowClearConfirm(true); setClearInput(''); }}
            className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-400 text-sm font-medium rounded-lg transition-colors"
          >
            Clear all data
          </button>
        </div>
      </section>

      {/* Restore confirm modal */}
      {/* Clear all data modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col gap-2">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-base font-semibold text-gray-100">Clear all data?</h2>
              <p className="text-sm text-gray-400">
                This will permanently delete all your assets, plans, transactions, and goals. This cannot be undone.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Type <span className="font-mono text-red-400">DELETE</span> to confirm</p>
              <input
                type="text"
                value={clearInput}
                onChange={e => setClearInput(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500/50"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClearAllData}
                disabled={clearInput !== 'DELETE' || clearLoading}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {clearLoading ? 'Clearing…' : 'Clear all data'}
              </button>
              <button
                onClick={() => { setShowClearConfirm(false); setClearInput(''); }}
                className="flex-1 text-gray-400 border border-gray-700 text-sm py-2.5 rounded-lg hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showRestoreConfirm && pendingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col gap-2">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-base font-semibold text-gray-100">Replace all data?</h2>
              <p className="text-sm text-gray-400">
                This will permanently delete your current assets, plans, transactions, and goals, then restore from:
              </p>
              <p className="text-sm font-mono text-brand-400 bg-gray-800 px-3 py-2 rounded-lg truncate">
                {pendingFile.name}
              </p>
              <p className="text-xs text-gray-600">This cannot be undone. Download a fresh backup first if unsure.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmRestore}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Yes, restore
              </button>
              <button
                onClick={() => { setShowRestoreConfirm(false); setPendingFile(null); }}
                className="flex-1 text-gray-400 border border-gray-700 text-sm py-2.5 rounded-lg hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
