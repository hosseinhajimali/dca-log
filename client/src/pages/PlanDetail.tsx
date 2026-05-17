import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { usePlanStats } from '@/hooks/useDcaPlans';
import { useCreateSellRule, useUpdateSellRule, useDeleteSellRule } from '@/hooks/useSellRules';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { useCurrencyFormatter, formatDate, formatQuantity } from '@/lib/format';
import { SellRule } from '@/types';

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', BIWEEKLY: 'Bi-weekly', MONTHLY: 'Monthly', CUSTOM: 'Custom',
};

// ─── Sell Rules Section ───────────────────────────────────────────────────────

function SellRuleRow({
  rule, planId, profitPct,
}: { rule: SellRule; planId: string; profitPct: number | null }) {
  const updateRule = useUpdateSellRule();
  const deleteRule = useDeleteSellRule();
  const { format } = useCurrencyFormatter();
  const [editing, setEditing] = useState(false);
  const [min, setMin] = useState(String(rule.minProfit));
  const [max, setMax] = useState(String(rule.maxProfit));
  const [amount, setAmount] = useState(String(rule.sellAmount));
  const [amtType, setAmtType] = useState<'USD' | 'PCT'>(rule.sellAmountType ?? 'USD');

  const isTriggered = profitPct !== null && profitPct >= rule.minProfit && profitPct <= rule.maxProfit;

  async function handleSave() {
    await updateRule.mutateAsync({ id: rule.id, minProfit: Number(min), maxProfit: Number(max), sellAmount: Number(amount), sellAmountType: amtType });
    setEditing(false);
  }

  const amtLabel = rule.sellAmountType === 'PCT' ? `${rule.sellAmount}%` : format(rule.sellAmount);

  if (editing) {
    return (
      <div className="py-2 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <input type="number" value={min} onChange={e => setMin(e.target.value)} placeholder="Min %" className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-brand-500" />
          <span className="text-gray-600 text-xs">% –</span>
          <input type="number" value={max} onChange={e => setMax(e.target.value)} placeholder="Max %" className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-brand-500" />
          <span className="text-gray-600 text-xs">% profit → sell</span>
          <div className="flex items-center gap-1">
            <div className="flex rounded overflow-hidden border border-gray-700 text-xs">
              {(['USD', 'PCT'] as const).map(t => (
                <button key={t} type="button" onClick={() => setAmtType(t)}
                  className={`px-2 py-1 transition-colors ${amtType === t ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}>
                  {t === 'USD' ? '$' : '%'}
                </button>
              ))}
            </div>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={amtType === 'USD' ? 'USD' : '%'} className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-brand-500" />
            {amtType === 'PCT' && <span className="text-gray-600 text-xs">% of holdings</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} className="text-xs bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg transition-colors">Save</button>
          <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between py-2 px-3 rounded-lg ${isTriggered ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-gray-800/50'}`}>
      <div className="flex items-center gap-3">
        {isTriggered && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
        <span className="text-xs font-mono text-amber-400/80">+{rule.minProfit}% – +{rule.maxProfit}%</span>
        <span className="text-gray-600 text-xs">→</span>
        <span className="text-xs font-mono text-gray-200 font-medium">sell {amtLabel}</span>
        {rule.sellAmountType === 'PCT' && <span className="text-xs text-gray-600">of holdings</span>}
        {isTriggered && <Badge variant="yellow">Active</Badge>}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => setEditing(true)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Edit</button>
        <button onClick={() => deleteRule.mutate(rule.id)} className="text-xs text-red-400/60 hover:text-red-400 transition-colors">Remove</button>
      </div>
    </div>
  );
}

function AddSellRuleRow({ planId, onDone }: { planId: string; onDone: () => void }) {
  const createRule = useCreateSellRule();
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [amount, setAmount] = useState('');
  const [amtType, setAmtType] = useState<'USD' | 'PCT'>('USD');

  async function handleAdd() {
    if (!min || !max || !amount) return;
    await createRule.mutateAsync({ dcaPlanId: planId, minProfit: Number(min), maxProfit: Number(max), sellAmount: Number(amount), sellAmountType: amtType });
    onDone();
  }

  return (
    <div className="py-2 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <input type="number" value={min} onChange={e => setMin(e.target.value)} placeholder="Min %" className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-brand-500" />
        <span className="text-gray-600 text-xs">% –</span>
        <input type="number" value={max} onChange={e => setMax(e.target.value)} placeholder="Max %" className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-brand-500" />
        <span className="text-gray-600 text-xs">% profit → sell</span>
        <div className="flex items-center gap-1">
          <div className="flex rounded overflow-hidden border border-gray-700 text-xs">
            {(['USD', 'PCT'] as const).map(t => (
              <button key={t} type="button" onClick={() => setAmtType(t)}
                className={`px-2 py-1 transition-colors ${amtType === t ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}>
                {t === 'USD' ? '$' : '%'}
              </button>
            ))}
          </div>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={amtType === 'USD' ? 'USD' : '%'} className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-brand-500" />
          {amtType === 'PCT' && <span className="text-gray-600 text-xs">% of holdings</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handleAdd} disabled={createRule.isPending} className="text-xs bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors">
          {createRule.isPending ? 'Adding…' : 'Add rule'}
        </button>
        <button onClick={onDone} className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
      </div>
    </div>
  );
}

export default function PlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = usePlanStats(id!);
  const { format, formatPct } = useCurrencyFormatter();
  const [showAddSellRule, setShowAddSellRule] = useState(false);

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
      {/* Back + header */}
      <div>
        <button
          onClick={() => navigate('/app/plans')}
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
              {plan.name && <span className="text-gray-400">— {plan.name}</span>}
              <Badge variant={plan.isActive ? 'green' : 'gray'}>
                {plan.isActive ? 'Active' : 'Paused'}
              </Badge>
              <Badge variant="blue">{FREQ_LABELS[plan.frequency]}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {format(plan.amountUsd)} per cycle · Started {formatDate(plan.startDate)}
              {plan.nextPurchaseDate && <> · Next: <span className="text-gray-300">{formatDate(plan.nextPurchaseDate)}</span></>}
            </p>
          </div>

          {/* Simulate Plan shortcut */}
          {(() => {
            // Pick highest-allocation asset for simulation
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
                onClick={() => navigate(`/app/simulator?${params.toString()}`)}
                className="shrink-0 flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 border border-brand-500/30 hover:border-brand-500/60 px-3 py-2 rounded-lg transition-colors"
              >
                <span>⏱</span> Simulate Plan
              </button>
            );
          })()}
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
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="planGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8 }}
                labelStyle={{ color: '#9ca3af' }}
                itemStyle={{ color: '#22c55e' }}
              />
              <Area type="monotone" dataKey="invested" stroke="#22c55e" fill="url(#planGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Asset breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">Asset Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                {['Asset', 'Allocation', 'Holdings', 'Invested', 'Value', 'Avg Buy', 'Price', 'P&L', 'Drawdown'].map(h => (
                  <th key={h} className="px-5 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {assetStats.map((stat) => (
                <tr key={stat.asset.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-4">
                    <span className="font-bold font-mono" style={stat.asset.color ? { color: stat.asset.color } : undefined}>
                      {stat.asset.symbol}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">{stat.asset.name}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-400">{stat.allocationPct}%</td>
                  <td className="px-5 py-4 font-mono text-gray-300">
                    {formatQuantity(stat.totalQuantity)}
                    <span className="text-gray-600 text-xs ml-1">{stat.asset.symbol}</span>
                  </td>
                  <td className="px-5 py-4 font-mono text-gray-300">{format(stat.totalInvested)}</td>
                  <td className="px-5 py-4 font-mono text-gray-300">{format(stat.currentValue)}</td>
                  <td className="px-5 py-4 font-mono text-gray-400">{format(stat.avgCost)}</td>
                  <td className="px-5 py-4 font-mono text-gray-400">{format(stat.currentPrice)}</td>
                  <td className="px-5 py-4">
                    <span className={`font-mono font-medium ${stat.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {format(stat.pnl)}
                    </span>
                    <p className={`text-xs mt-0.5 ${stat.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {stat.pnlPercent >= 0 ? '+' : ''}{stat.pnlPercent.toFixed(2)}%
                    </p>
                  </td>
                  <td className="px-5 py-4">
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

      {/* Take Profit / Sell Rules */}
      {(() => {
        const profitPct = portfolio.totalPnlPercent;
        const anyTriggered = plan.sellRules.some(
          (r) => profitPct >= r.minProfit && profitPct <= r.maxProfit,
        );
        return (
          <div className={`bg-gray-900 border rounded-xl overflow-hidden ${anyTriggered ? 'border-amber-500/30' : 'border-gray-800'}`}>
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-300">Take Profit Rules</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Current profit:{' '}
                  <span className={`font-mono font-medium ${profitPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
                  </span>
                  {anyTriggered && (
                    <span className="ml-2 text-amber-400 font-medium">· rule triggered</span>
                  )}
                </p>
              </div>
              {!showAddSellRule && (
                <button
                  onClick={() => setShowAddSellRule(true)}
                  className="text-xs text-brand-400 hover:text-brand-300 border border-brand-500/30 hover:border-brand-500/60 px-3 py-1.5 rounded-lg transition-colors"
                >
                  + Add rule
                </button>
              )}
            </div>
            <div className="px-5 py-4 space-y-2">
              {plan.sellRules.length === 0 && !showAddSellRule && (
                <p className="text-sm text-gray-600 text-center py-4">
                  No take profit rules yet. Add one to get sell suggestions on the dashboard.
                </p>
              )}
              {plan.sellRules.map((rule) => (
                <SellRuleRow key={rule.id} rule={rule} planId={plan.id} profitPct={profitPct} />
              ))}
              {showAddSellRule && (
                <AddSellRuleRow planId={plan.id} onDone={() => setShowAddSellRule(false)} />
              )}
            </div>
          </div>
        );
      })()}

      {/* Recent transactions */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
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
                    <th key={h} className="px-5 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 text-gray-400">{formatDate(tx.purchasedAt)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium font-mono px-2 py-0.5 rounded-full ${
                        tx.type === 'SELL' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                      }`}>
                        {tx.type ?? 'BUY'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-mono font-bold"
                        style={tx.asset.color ? { color: tx.asset.color } : undefined}>
                        {tx.asset.symbol}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-gray-300">{format(tx.amountUsd)}</td>
                    <td className="px-5 py-3 font-mono text-gray-400">
                      {formatQuantity(tx.quantity)}
                    </td>
                    <td className="px-5 py-3 font-mono text-gray-400">{format(tx.pricePerUnit)}</td>
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
