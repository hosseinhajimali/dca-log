'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAssets } from '@/hooks/useAssets';
import { useDcaPlans } from '@/hooks/useDcaPlans';
import { useGoals } from '@/hooks/useGoals';
import { useStore } from '@/store/useStore';
import { Asset, BuyingRuleSet, DcaPlan, Goal, SellRuleSet, Transaction } from '@/types';
import { useBuyingRuleSets, useSellRuleSets } from '@/hooks/useRuleSets';
import { ChevronRight } from 'lucide-react';

interface DataExportModalProps {
  onClose: () => void;
}

// ─── tiny checkbox ────────────────────────────────────────────────────────────
function Checkbox({
  checked,
  indeterminate = false,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <span
      onClick={e => { e.stopPropagation(); onChange(!checked); }}
      className={`inline-flex items-center justify-center w-4 h-4 rounded border cursor-pointer shrink-0 transition-colors ${
        checked || indeterminate
          ? 'bg-brand-600 border-brand-500'
          : 'bg-gray-800 border-gray-600 hover:border-gray-400'
      }`}
    >
      {indeterminate && !checked
        ? <span className="block w-2 h-0.5 bg-white rounded-full" />
        : checked
        ? <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        : null}
    </span>
  );
}

// ─── section row ──────────────────────────────────────────────────────────────
function SectionRow({
  label,
  count,
  checked,
  indeterminate,
  expanded,
  onToggleCheck,
  onToggleExpand,
  children,
}: {
  label: string;
  count: number | string;
  checked: boolean;
  indeterminate?: boolean;
  expanded: boolean;
  onToggleCheck: (v: boolean) => void;
  onToggleExpand: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-gray-800/50 cursor-pointer select-none"
        onClick={onToggleExpand}
      >
        <Checkbox checked={checked} indeterminate={indeterminate} onChange={onToggleCheck} />
        <ChevronRight
          className={`w-3.5 h-3.5 text-gray-500 transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`}
        />
        <span className="text-sm text-gray-200 font-medium flex-1">{label}</span>
        <span className="text-xs text-gray-500">{count}</span>
      </div>
      {expanded && children && (
        <div className="ml-9 space-y-0.5 mb-1">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── leaf row ─────────────────────────────────────────────────────────────────
function LeafRow({
  label,
  sub,
  color,
  checked,
  onToggle,
}: {
  label: string;
  sub?: string;
  color?: string | null;
  checked: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center gap-2.5 py-2 px-3 rounded-lg hover:bg-gray-800/40 cursor-pointer select-none"
      onClick={() => onToggle(!checked)}
    >
      <Checkbox checked={checked} onChange={onToggle} />
      {color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />}
      <span className="text-sm text-gray-300 flex-1" style={color ? { color } : undefined}>
        {label}
      </span>
      {sub && <span className="text-xs text-gray-600">{sub}</span>}
    </div>
  );
}

// ─── simple leaf (no expand) ──────────────────────────────────────────────────
function SimpleRow({
  label,
  sub,
  checked,
  onToggle,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-gray-800/50 cursor-pointer select-none"
      onClick={() => onToggle(!checked)}
    >
      <Checkbox checked={checked} onChange={onToggle} />
      <span className="w-3.5 shrink-0" /> {/* spacer to align with expandable rows */}
      <span className="text-sm text-gray-200 font-medium flex-1">{label}</span>
      {sub && <span className="text-xs text-gray-500">{sub}</span>}
    </div>
  );
}

// ─── main modal ───────────────────────────────────────────────────────────────
export function DataExportModal({ onClose }: DataExportModalProps) {
  const { user, currency, theme } = useStore();
  const { data: assets = [] } = useAssets();
  const { data: plans = [] } = useDcaPlans();
  const { data: goals = [] } = useGoals();
  const { data: buyingRuleSets = [] } = useBuyingRuleSets();
  const { data: sellRuleSets = [] } = useSellRuleSets();

  // selection state
  const [txAssets, setTxAssets]     = useState<Set<string>>(new Set());
  const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());
  const [goalsSelected, setGoalsSelected]       = useState(true);
  const [ruleSetsSelected, setRuleSetsSelected] = useState(true);
  const [settingsSelected, setSettingsSelected] = useState(true);

  // expand state
  const [txExpanded, setTxExpanded]     = useState(true);
  const [plansExpanded, setPlansExpanded] = useState(true);

  const [exporting, setExporting] = useState(false);
  const [error, setError]         = useState('');

  // init: select all
  useEffect(() => {
    setTxAssets(new Set(assets.map(a => a.id)));
  }, [assets]);

  useEffect(() => {
    setSelectedPlans(new Set(plans.map(p => p.id)));
  }, [plans]);

  // Escape to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // ── derived ──────────────────────────────────────────────────────────────────
  const allSelected =
    txAssets.size === assets.length &&
    selectedPlans.size === plans.length &&
    goalsSelected &&
    ruleSetsSelected &&
    settingsSelected;

  const noneSelected =
    txAssets.size === 0 &&
    selectedPlans.size === 0 &&
    !goalsSelected &&
    !ruleSetsSelected &&
    !settingsSelected;

  const toggleAll = (on: boolean) => {
    setTxAssets(on ? new Set(assets.map(a => a.id)) : new Set());
    setSelectedPlans(on ? new Set(plans.map(p => p.id)) : new Set());
    setGoalsSelected(on);
    setRuleSetsSelected(on);
    setSettingsSelected(on);
  };

  const toggleAsset = (id: string, on: boolean) => {
    setTxAssets(prev => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const togglePlan = (id: string, on: boolean) => {
    setSelectedPlans(prev => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  };

  // ── export ───────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      const output: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        version: '2.0',
      };

      // Collect all assets that are referenced by the selected content,
      // so the importer can create them if they don't exist.
      const referencedAssetIds = new Set<string>();
      txAssets.forEach(id => referencedAssetIds.add(id));
      plans
        .filter(p => selectedPlans.has(p.id))
        .forEach(p => p.allocations.forEach(a => referencedAssetIds.add(a.assetId)));
      if (goalsSelected) {
        (goals as Goal[]).forEach(g => { if (g.asset) referencedAssetIds.add(g.asset.id); });
      }
      if (settingsSelected) {
        assets.forEach(a => referencedAssetIds.add(a.id)); // all assets
      }
      output.assets = assets
        .filter(a => referencedAssetIds.has(a.id))
        .map(a => ({
          symbol: a.symbol, name: a.name, assetType: a.assetType,
          coingeckoId: a.coingeckoId ?? null, color: a.color ?? null,
          athOverride: a.athOverride ?? null,
        }));

      // settings (preferences + user info, assets already at top level)
      if (settingsSelected) {
        output.settings = {
          user: user
            ? { email: user.email, name: user.name, currency: user.currency }
            : null,
          preferences: { currency, theme },
        };
      }

      // transactions per asset
      if (txAssets.size > 0) {
        const txByAsset: Record<string, unknown[]> = {};
        for (const assetId of txAssets) {
          const asset = assets.find(a => a.id === assetId);
          if (!asset) continue;
          const res = await api.get('/transactions', {
            params: { assetId, limit: 10000, sortBy: 'purchasedAt', sortOrder: 'asc' },
          });
          const txList: Transaction[] = res.data.data;
          txByAsset[asset.symbol] = txList.map(tx => ({
            date: tx.purchasedAt,
            type: tx.type,
            quantity: tx.quantity,
            pricePerUnit: tx.pricePerUnit,
            amountUsd: tx.amountUsd,
            exchange: tx.exchange ?? null,
            notes: tx.notes ?? null,
            plan: tx.dcaPlan?.name ?? null,
          }));
        }
        output.transactions = txByAsset;
      }

      // plans
      if (selectedPlans.size > 0) {
        output.plans = plans
          .filter(p => selectedPlans.has(p.id))
          .map((p: DcaPlan) => ({
            name: p.name,
            frequency: p.frequency,
            intervalDays: p.intervalDays,
            amountUsd: p.amountUsd,
            isActive: p.isActive,
            startDate: p.startDate,
            endDate: p.endDate,
            scheduledTime: p.scheduledTime,
            notes: p.notes,
            allocations: p.allocations.map(a => ({
              symbol: a.asset.symbol,
              allocationPct: a.allocationPct,
            })),
          }));
      }

      // rule sets
      if (ruleSetsSelected) {
        if (buyingRuleSets.length > 0) {
          output.buyingRuleSets = buyingRuleSets.map((rs: BuyingRuleSet) => ({
            label: rs.label,
            strategyType: rs.strategyType,
            notes: rs.notes ?? null,
            rows: rs.rows.map(r => ({
              params: r.params,
              multiplier: r.multiplier,
              sortOrder: r.sortOrder,
            })),
          }));
        }
        if (sellRuleSets.length > 0) {
          output.sellRuleSets = sellRuleSets.map((rs: SellRuleSet) => ({
            label: rs.label,
            strategyType: rs.strategyType,
            notes: rs.notes ?? null,
            rows: rs.rows.map(r => ({
              params: r.params,
              sellAmount: r.sellAmount,
              sellAmountType: r.sellAmountType,
              sortOrder: r.sortOrder,
            })),
          }));
        }
      }

      // goals
      if (goalsSelected && goals.length > 0) {
        output.goals = (goals as Goal[]).map(g => ({
          name: g.name,
          type: g.type,
          notes: g.notes,
          asset: g.asset?.symbol ?? null,
          targetQty: g.targetQty,
          targetValue: g.targetValue,
          targetMonthlyAmount: g.targetMonthlyAmount,
          startDate: g.startDate,
          deadline: g.deadline,
          isCompleted: g.isCompleted,
          createdAt: g.createdAt,
        }));
      }

      const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dcalog_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const planName = (p: DcaPlan) =>
    p.name || p.allocations.map(a => a.asset.symbol).join(' · ') || 'Unnamed plan';

  const totalSelected =
    txAssets.size +
    selectedPlans.size +
    (goalsSelected ? 1 : 0) +
    (ruleSetsSelected ? 1 : 0) +
    (settingsSelected ? 1 : 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-100">Custom Export</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Select what to include · exports as JSON
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors">×</button>
        </div>

        {/* tree */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-0.5">
          {/* select all */}
          <div
            className="flex items-center gap-2.5 py-2.5 px-3 rounded-lg hover:bg-gray-800/50 cursor-pointer select-none border-b border-gray-800 mb-2 pb-4"
            onClick={() => toggleAll(!allSelected)}
          >
            <Checkbox
              checked={allSelected}
              indeterminate={!noneSelected && !allSelected}
              onChange={toggleAll}
            />
            <span className="text-sm text-gray-100 font-semibold flex-1">Export All</span>
            <span className="text-xs text-gray-500">everything</span>
          </div>

          {/* transactions */}
          <SectionRow
            label="Transactions"
            count={txAssets.size === assets.length ? assets.length : `${txAssets.size} / ${assets.length}`}
            checked={txAssets.size === assets.length}
            indeterminate={txAssets.size > 0 && txAssets.size < assets.length}
            expanded={txExpanded}
            onToggleCheck={on => setTxAssets(on ? new Set(assets.map(a => a.id)) : new Set())}
            onToggleExpand={() => setTxExpanded(v => !v)}
          >
            {assets.map((asset: Asset) => (
              <LeafRow
                key={asset.id}
                label={asset.symbol}
                sub={asset.name}
                color={asset.color}
                checked={txAssets.has(asset.id)}
                onToggle={on => toggleAsset(asset.id, on)}
              />
            ))}
            {assets.length === 0 && (
              <p className="text-xs text-gray-600 py-2 px-3">No assets yet</p>
            )}
          </SectionRow>

          {/* plans */}
          <SectionRow
            label="DCA Plans"
            count={selectedPlans.size === plans.length ? plans.length : `${selectedPlans.size} / ${plans.length}`}
            checked={selectedPlans.size === plans.length && plans.length > 0}
            indeterminate={selectedPlans.size > 0 && selectedPlans.size < plans.length}
            expanded={plansExpanded}
            onToggleCheck={on => setSelectedPlans(on ? new Set(plans.map(p => p.id)) : new Set())}
            onToggleExpand={() => setPlansExpanded(v => !v)}
          >
            {plans.map((plan: DcaPlan) => (
              <LeafRow
                key={plan.id}
                label={planName(plan)}
                sub={plan.isActive ? 'active' : 'paused'}
                checked={selectedPlans.has(plan.id)}
                onToggle={on => togglePlan(plan.id, on)}
              />
            ))}
            {plans.length === 0 && (
              <p className="text-xs text-gray-600 py-2 px-3">No plans yet</p>
            )}
          </SectionRow>

          {/* goals */}
          <SimpleRow
            label="Goals"
            sub={`${goals.length}`}
            checked={goalsSelected}
            onToggle={setGoalsSelected}
          />

          {/* rule sets */}
          <SimpleRow
            label="Rule Sets"
            sub={`${buyingRuleSets.length} buying · ${sellRuleSets.length} selling`}
            checked={ruleSetsSelected}
            onToggle={setRuleSetsSelected}
          />

          {/* settings */}
          <SimpleRow
            label="Settings"
            sub="profile · assets · preferences"
            checked={settingsSelected}
            onToggle={setSettingsSelected}
          />
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t border-gray-800 shrink-0 space-y-3">
          <p className="text-xs text-amber-400/70">
            This export is for analysis only, it cannot be used with Restore. Use "Download backup" for a restorable snapshot.
          </p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-3 items-center">
            <button
              onClick={handleExport}
              disabled={exporting || noneSelected}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {exporting ? 'Exporting…' : `Export${totalSelected > 0 ? ` (${totalSelected} sections)` : ''}`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 text-sm px-4 py-2.5 border border-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
