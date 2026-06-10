'use client';

import { useState, useRef } from 'react';
import { toast } from '@/lib/toast';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { DataExportModal } from '@/components/DataExportModal';
import { DataImportModal } from '@/components/DataImportModal';

export default function Data() {
  const queryClient = useQueryClient();

  // Backup / restore state
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Clear all data state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearInput, setClearInput] = useState('');
  const [clearLoading, setClearLoading] = useState(false);

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
      {showExport && <DataExportModal onClose={() => setShowExport(false)} />}
      {showImport && <DataImportModal onClose={() => setShowImport(false)} />}

      {/* Export / Import */}
      <section id="backup" className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-300">Export & Import</h2>
          <p className="text-xs text-gray-500 mt-1">
            Export any part of your data and share it, or import a file someone sent you.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowExport(true)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            ⬇ Export…
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            ⬆ Import…
          </button>
        </div>
        <p className="text-xs text-gray-600">
          Export selects exactly what to include, transactions by asset, individual plans, goals, or settings. Import adds data without touching anything else. Great for sharing plans with friends.
        </p>
      </section>

      {/* Full backup */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-300">Full Backup</h2>
          <p className="text-xs text-gray-500 mt-1">For safekeeping and migration</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownloadBackup}
            disabled={backupLoading}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            {backupLoading ? 'Preparing…' : '⬇ Download backup'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={restoreLoading}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            {restoreLoading ? 'Restoring…' : '⬆ Restore from backup'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <p className="text-xs text-gray-600">Full backup replaces all existing data on restore. Not the same as import.</p>

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
      </section>

      {/* Danger zone */}
      <section className="bg-gray-900 border border-red-500/20 rounded-xl p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
          <p className="text-xs text-gray-500 mt-1">Want to start fresh? This deletes everything.</p>
        </div>
        <button
          onClick={() => { setShowClearConfirm(true); setClearInput(''); }}
          className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40 text-red-400 text-sm font-medium rounded-lg transition-colors"
        >
          Clear all data
        </button>
      </section>

      {/* Clear all data modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
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

      {/* Restore confirm modal */}
      {showRestoreConfirm && pendingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
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
