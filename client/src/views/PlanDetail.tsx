'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/store/useStore';
import { PlusCircle, Pencil, Copy, Trash2 } from 'lucide-react';
import { QuickAddModal } from '@/components/QuickAddModal';
import { EditModal, DeletePlanModal } from '@/views/DcaPlans';
import { useAssets } from '@/hooks/useAssets';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { usePlanStats, PlanStats, useDeleteDcaPlan, useDuplicateDcaPlan } from '@/hooks/useDcaPlans';
import { toast } from '@/lib/toast';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { useCurrencyFormatter, formatDate, formatQuantity } from '@/lib/format';
import { PlanRuleSetsPanel } from '@/views/DcaPlans';

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', BIWEEKLY: 'Bi-weekly', MONTHLY: 'Monthly', CUSTOM: 'Custom',
};



export default function PlanDetail() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading, error } = usePlanStats(id!);
  const { format, formatPct } = useCurrencyFormatter();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const { data: assets = [] } = useAssets();
  const deletePlan = useDeleteDcaPlan();
  const duplicatePlan = useDuplicateDcaPlan();

  const handleDuplicate = async () => {
    try {
      await duplicatePlan.mutateAsync(id!);
      toast('Plan duplicated', 'success');
      router.push('/app/plans');
    } catch {
      toast('Failed to duplicate plan', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deletePlan.mutateAsync(id!);
      router.push('/app/plans');
    } catch {
      toast('Failed to delete plan', 'error');
    }
  };
  const theme = useStore((s) => s.theme);
  const isLight = theme === 'light' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-sm animate-pulse">Loading plan...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400 text-sm">Failed to load plan data.</div>
      </div>
    );
  }

  const { plan, portfolio, assetStats, monthlyData, recentTransactions } = data;
  const isProfitable = portfolio.totalPnl >= 0;

  const chartData = monthlyData.map((d) => ({
    month: d.month,
    invested: Math.round(d.invested * 100) / 100,
  }));

  return (
    <div className="space-y-6">
      {showQuickAdd && (
        <QuickAddModal plan={plan} onClose={() => setShowQuickAdd(false)} />
      )}
      {showEdit && (
        <EditModal plan={plan} assets={assets} onClose={() => {
          setShowEdit(false);
          qc.invalidateQueries({ queryKey: ['plan-stats', plan.id] });
        }} />
      )}
      {showDelete && (
        <DeletePlanModal
          plan={plan}
          onConfirm={handleDelete}
          onClose={() => setShowDelete(false)}
        />
      )}

      {/* Back + header */}
      <div>
        <button
          onClick={() => router.push('/app/plans')}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3 flex items-center gap-1"
        >
          ← Back to plans
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-gray-100">
                {plan.allocations.map((a) => a.asset.symbol).join(' · ')}
              </h1>
              {plan.name && <span className="text-gray-400">({plan.name})</span>}
              <Badge variant="blue">{FREQ_LABELS[plan.frequency]}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {format(plan.amountUsd)} per cycle · Started {formatDate(plan.startDate)}
              {plan.nextPurchaseDate && <> · Next: <span className="text-gray-300">{formatDate(plan.nextPurchaseDate)}</span></>}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowEdit(true)}
              className="shrink-0 flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-400 hover:bg-gray-800 border border-gray-700 hover:border-brand-500/50 px-3 py-2 rounded-lg transition-colors"
            >
              <Pencil size={12} strokeWidth={1.75} />
              Edit
            </button>
            <button
              onClick={() => setShowQuickAdd(true)}
              className="shrink-0 flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 border border-brand-500/40 hover:border-brand-500/70 bg-brand-500/5 hover:bg-brand-500/10 px-3 py-2 rounded-lg transition-colors font-medium"
            >
              <PlusCircle size={12} strokeWidth={1.75} />
              Quick Purchase
            </button>
            {(() => {
              const topAlloc = [...plan.allocations].sort((a, b) => b.allocationPct - a.allocationPct)[0];
              if (!topAlloc) return null;
              const params = new URLSearchParams({
                assetId:   topAlloc.assetId,
                startDate: plan.startDate.slice(0, 10),
                amountUsd: String(Math.round(plan.amountUsd * (topAlloc.allocationPct / 100))),
                frequency: plan.frequency,
              });
              return (
                <button
                  onClick={() => router.push(`/app/simulator?${params.toString()}`)}
                  className="shrink-0 flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-400 hover:bg-gray-800 border border-gray-700 hover:border-brand-500/50 px-3 py-2 rounded-lg transition-colors"
                >
                  ⏱ Simulate
                </button>
              );
            })()}
            <button
              onClick={handleDuplicate}
              className="shrink-0 flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-400 hover:bg-gray-800 border border-gray-700 hover:border-brand-500/50 px-3 py-2 rounded-lg transition-colors"
            >
              <Copy size={12} strokeWidth={1.75} />
              Duplicate
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="shrink-0 flex items-center gap-1.5 text-xs text-white bg-red-600 hover:bg-red-500 border border-red-600 hover:border-red-500 px-3 py-2 rounded-lg transition-colors"
            >
              <Trash2 size={12} strokeWidth={1.75} />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Invested"  value={format(portfolio.totalInvested)} />
        <StatCard label="Current Value"   value={format(portfolio.totalCurrentValue)} />
        <StatCard
          label="P&L"
          value={format(portfolio.totalPnl)}
          sub={formatPct(portfolio.totalPnlPercent)}
          positive={isProfitable}
          negative={!isProfitable}
        />
        <StatCard label="Transactions" value={String(recentTransactions.length)} />
      </div>

      {/* Monthly chart */}
      {chartData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Monthly Investment (last 12 months)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e8ecf1' : '#1f2937'} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: isLight ? '#ffffff' : '#111827', border: `1px solid ${isLight ? '#e8ecf1' : '#1f2937'}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                labelStyle={{ color: isLight ? '#475569' : '#9ca3af' }}
                itemStyle={{ color: '#22c55e' }}
                cursor={{ fill: isLight ? '#f1f5f9' : '#1f2937' }}
              />
              <Bar dataKey="invested" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Asset breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">Asset Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                {['Asset', 'Allocation', 'Holdings', 'Invested', 'Value', 'Avg Buy', 'Price', 'P&L', 'Drawdown'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assetStats.map((stat) => (
                <tr key={stat.asset.id} className="hover:bg-gray-700/50 transition-colors border-b border-gray-800 last:border-0">
                  <td className="px-5 py-3.5">
                    <span className="font-bold font-mono" style={stat.asset.color ? { color: stat.asset.color } : undefined}>
                      {stat.asset.symbol}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">{stat.asset.name}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    {(() => {
                      const target = stat.allocationPct;
                      const actual = portfolio.totalCurrentValue > 0
                        ? (stat.currentValue / portfolio.totalCurrentValue) * 100
                        : 0;
                      const diff = actual - target;
                      const isOver  = diff >  1;
                      const isUnder = diff < -1;
                      return (
                        <>
                          <span className="text-xs text-gray-500">{target}%</span>
                          <p className={`text-xs font-medium mt-0.5 flex items-center gap-0.5 ${isOver ? 'text-green-400' : isUnder ? 'text-red-400' : 'text-gray-400'}`}>
                            {isOver ? '↑' : isUnder ? '↓' : '≈'}
                            {actual.toFixed(1)}%
                          </p>
                        </>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-gray-300">
                    {formatQuantity(stat.totalQuantity)}
                    <span className="text-gray-600 text-xs ml-1">{stat.asset.symbol}</span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-gray-300">{format(stat.totalInvested)}</td>
                  <td className="px-5 py-3.5 font-mono text-gray-300">{format(stat.currentValue)}</td>
                  <td className="px-5 py-3.5 font-mono text-gray-400">{format(stat.avgCost)}</td>
                  <td className="px-5 py-3.5 font-mono text-gray-400">{format(stat.currentPrice)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`font-mono font-medium ${stat.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {format(stat.pnl)}
                    </span>
                    <p className={`text-xs mt-0.5 ${stat.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {stat.pnlPercent >= 0 ? '+' : ''}{stat.pnlPercent.toFixed(2)}%
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    {stat.drawdownFromAth === null ? (
                      <span className="text-gray-600">—</span>
                    ) : stat.drawdownFromAth >= -0.5 ? (
                      <span className="text-green-400 font-mono text-xs font-medium">ATH 🔥</span>
                    ) : (
                      <span className="font-mono font-medium text-orange-400">
                        {stat.drawdownFromAth.toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rule sets */}
      <PlanRuleSetsPanel plan={plan} />

      {/* Recent transactions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">Transactions</h2>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-600 text-sm">No transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                  {['Date', 'Type', 'Asset', 'Amount', 'Quantity', 'Price'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-700/50 transition-colors border-b border-gray-800 last:border-0">
                    <td className="px-5 py-3.5 text-gray-400">{formatDate(tx.purchasedAt)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium font-mono px-2 py-0.5 rounded-full ${
                        tx.type === 'SELL' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                      }`}>
                        {tx.type ?? 'BUY'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold"
                        style={tx.asset.color ? { color: tx.asset.color } : undefined}>
                        {tx.asset.symbol}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-gray-300">{format(tx.amountUsd)}</td>
                    <td className="px-5 py-3.5 font-mono text-gray-400">
                      {formatQuantity(tx.quantity)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-gray-400">{format(tx.pricePerUnit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
