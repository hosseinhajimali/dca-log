import { useParams, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { usePlanStats } from '@/hooks/useDcaPlans';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { useCurrencyFormatter, formatDate, formatQuantity } from '@/lib/format';

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', BIWEEKLY: 'Bi-weekly', MONTHLY: 'Monthly', CUSTOM: 'Custom',
};

export default function PlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = usePlanStats(id!);
  const { format, formatPct } = useCurrencyFormatter();

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
          onClick={() => navigate('/plans')}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors mb-3 flex items-center gap-1"
        >
          ← Back to plans
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-100">
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
                  {['Date', 'Asset', 'Amount', 'Quantity', 'Price'].map(h => (
                    <th key={h} className="px-5 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 text-gray-400">{formatDate(tx.purchasedAt)}</td>
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
