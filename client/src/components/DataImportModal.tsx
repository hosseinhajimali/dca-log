'use client';

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Upload } from 'lucide-react';

interface DataImportModalProps {
  onClose: () => void;
}

interface ParsedExport {
  version: string;
  exportedAt?: string;
  assets?: unknown[];
  transactions?: Record<string, unknown[]>;
  plans?: unknown[];
  goals?: unknown[];
  settings?: unknown;
}

interface ImportCounts {
  assets: number;
  transactions: number;
  plans: number;
  goals: number;
}

type Step = 'pick' | 'preview' | 'importing' | 'done';

export function DataImportModal({ onClose }: DataImportModalProps) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('pick');
  const [parsed, setParsed] = useState<ParsedExport | null>(null);
  const [parseError, setParseError] = useState('');
  const [importError, setImportError] = useState('');
  const [result, setResult] = useState<ImportCounts | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && step !== 'importing') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, step]);

  const handleFile = (file: File) => {
    setParseError('');
    if (!file.name.endsWith('.json')) {
      setParseError('Please select a .json file exported from DCAlog.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string) as ParsedExport;
        if (!json.version || !String(json.version).startsWith('2')) {
          setParseError(
            'This file uses an older format or is a full backup, use "Restore from backup" for that. Only custom exports (v2) can be imported here.',
          );
          return;
        }
        setParsed(json);
        setStep('preview');
      } catch {
        setParseError('Could not parse the file. Make sure it is a valid JSON export from DCAlog.');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImportError('');
    setStep('importing');
    try {
      const res = await api.post('/backup/import', parsed);
      setResult(res.data.data.imported as ImportCounts);
      await qc.invalidateQueries();
      setStep('done');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Import failed. Please try again.';
      setImportError(msg);
      setStep('preview');
    }
  };

  // ── helpers ─────────────────────────────────────────────────────────────────
  const txAssets = parsed?.transactions ? Object.keys(parsed.transactions) : [];
  const txCount  = parsed?.transactions
    ? Object.values(parsed.transactions).reduce((s, a) => s + a.length, 0)
    : 0;
  const planCount = parsed?.plans?.length ?? 0;
  const goalCount = parsed?.goals?.length ?? 0;
  const hasSettings = !!parsed?.settings;
  const assetCount = parsed?.assets?.length ?? 0;

  const exportedAt = parsed?.exportedAt
    ? new Date(parsed.exportedAt).toLocaleString()
    : null;

  const nothingToImport = txCount === 0 && planCount === 0 && goalCount === 0 && !hasSettings;

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && step !== 'importing') onClose(); }}
    >
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-100">Import Data</h2>
            <p className="text-xs text-gray-500 mt-0.5">Adds to existing data · nothing is deleted</p>
          </div>
          {step !== 'importing' && (
            <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors">×</button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* ── pick step ── */}
          {step === 'pick' && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-700 hover:border-brand-500 rounded-xl p-10 text-center cursor-pointer transition-colors group"
              >
                <Upload className="w-7 h-7 text-gray-600 group-hover:text-brand-400 mx-auto mb-3 transition-colors" />
                <p className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
                  Drop your export file here, or click to browse
                </p>
                <p className="text-xs text-gray-600 mt-1">dcalog_export_*.json</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              />
              {parseError && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {parseError}
                </p>
              )}
              <div className="bg-gray-800/50 border border-gray-800 rounded-xl px-4 py-3 space-y-1">
                <p className="text-xs font-medium text-gray-400">What gets imported</p>
                <p className="text-xs text-gray-600">
                  Transactions, plans, goals, and assets are <strong className="text-gray-400">added</strong> to your existing data, nothing is overwritten or deleted. Missing assets are created automatically.
                </p>
              </div>
            </div>
          )}

          {/* ── preview step ── */}
          {step === 'preview' && parsed && (
            <div className="space-y-4">
              {exportedAt && (
                <p className="text-xs text-gray-500">
                  Exported {exportedAt}
                </p>
              )}

              <div className="space-y-2">
                {/* assets */}
                {assetCount > 0 && (
                  <div className="flex items-center justify-between py-2.5 px-3 bg-gray-800/40 rounded-xl">
                    <span className="text-sm text-gray-300">Assets</span>
                    <span className="text-xs text-gray-500">{assetCount} referenced</span>
                  </div>
                )}

                {/* transactions */}
                {txCount > 0 && (
                  <div className="bg-gray-800/40 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between py-2.5 px-3">
                      <span className="text-sm text-gray-300">Transactions</span>
                      <span className="text-xs text-gray-500">{txCount} total</span>
                    </div>
                    <div className="border-t border-gray-800 px-3 py-2 flex flex-wrap gap-2">
                      {txAssets.map(sym => (
                        <span key={sym} className="text-xs font-mono bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-md text-gray-300">
                          {sym} · {(parsed.transactions![sym] ?? []).length}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* plans */}
                {planCount > 0 && (
                  <div className="bg-gray-800/40 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between py-2.5 px-3">
                      <span className="text-sm text-gray-300">DCA Plans</span>
                      <span className="text-xs text-gray-500">{planCount}</span>
                    </div>
                    <div className="border-t border-gray-800 px-3 py-2 flex flex-col gap-1">
                      {(parsed.plans as Array<{ name?: string; frequency?: string; amountUsd?: number }>).map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-xs text-gray-400">
                          <span>{p.name || 'Unnamed plan'}</span>
                          <span className="text-gray-600">{p.frequency} · ${p.amountUsd}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* goals */}
                {goalCount > 0 && (
                  <div className="flex items-center justify-between py-2.5 px-3 bg-gray-800/40 rounded-xl">
                    <span className="text-sm text-gray-300">Goals</span>
                    <span className="text-xs text-gray-500">{goalCount}</span>
                  </div>
                )}

                {/* settings */}
                {hasSettings && (
                  <div className="flex items-center justify-between py-2.5 px-3 bg-gray-800/40 rounded-xl">
                    <span className="text-sm text-gray-300">Settings</span>
                    <span className="text-xs text-gray-500">preferences</span>
                  </div>
                )}

                {nothingToImport && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    This file has no importable data.
                  </p>
                )}
              </div>

              {importError && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {importError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleImport}
                  disabled={nothingToImport}
                  className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  Import
                </button>
                <button
                  onClick={() => { setStep('pick'); setParsed(null); }}
                  className="text-gray-400 hover:text-gray-200 text-sm px-4 py-2.5 border border-gray-700 rounded-lg transition-colors"
                >
                  ← Different file
                </button>
              </div>
            </div>
          )}

          {/* ── importing step ── */}
          {step === 'importing' && (
            <div className="py-10 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-400">Importing…</p>
            </div>
          )}

          {/* ── done step ── */}
          {step === 'done' && result && (
            <div className="py-4 space-y-4">
              <div className="text-center">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-sm font-medium text-gray-200">Import complete</p>
              </div>
              <div className="bg-gray-800/40 border border-gray-800 rounded-xl divide-y divide-gray-800 text-sm">
                {result.assets > 0 && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-gray-400">Assets created</span>
                    <span className="text-gray-200 font-medium">{result.assets}</span>
                  </div>
                )}
                {result.transactions > 0 && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-gray-400">Transactions added</span>
                    <span className="text-gray-200 font-medium">{result.transactions}</span>
                  </div>
                )}
                {result.plans > 0 && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-gray-400">Plans added</span>
                    <span className="text-gray-200 font-medium">{result.plans}</span>
                  </div>
                )}
                {result.goals > 0 && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-gray-400">Goals added</span>
                    <span className="text-gray-200 font-medium">{result.goals}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-center pt-1">
                <button
                  onClick={onClose}
                  className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
                >
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
