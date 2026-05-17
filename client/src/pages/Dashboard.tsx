import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/hooks/useDashboard';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { useCurrencyFormatter, formatDate, formatQuantity } from '@/lib/format';
import FearGreedWidget from '@/components/ui/FearGreedWidget';
import { ActivePlanSummary } from '@/types';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a78bfa', '#06b6d4', '#f97316'];

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', BIWEEKLY: 'Bi-weekly', MONTHLY: 'Monthly', CUSTOM: 'Custom',
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

function ActivePlanCard({ plan, onClick }: { plan: ActivePlanSummary; onClick: () => void }) {
  const { format } = useCurrencyFormatter();
  const days = daysUntil(plan.nextPurchaseDate);
  const isBoosted = plan.suggestedAmount > plan.amountUsd;

  const urgency =
    days === null     ? 'gray'
    : days <= 0       ? 'green'   // today or overdue
    : days <= 3       ? 'yellow'
    : 'gray';

  const urgencyColors: Record<string, string> = {
    green:  'border-green-500/30 bg-green-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    gray:   'border-gray-800 bg-transparent',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-colors hover:border-gray-600 ${urgencyColors[urgency]}`}
    >
      {/* Asset symbols */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className="font-bold font-mono text-sm">
          {plan.allocations.map((a, i) => (
            <span key={a.asset.symbol}>
              {i > 0 && <span className="text-gray-600 mx-1">·</span>}
              <span style={a.asset.color ? { color: a.asset.color } : { color: '#f3f4f6' }}>
                {a.asset.symbol}
              </span>
              {plan.allocations.length > 1 && (
                <span className="text-gray-500 text-xs font-normal ml-0.5">{a.allocationPct}%</span>
              )}
            </span>
          ))}
        </span>
        {plan.name && <span className="text-xs text-gray-500">— {plan.name}</span>}
        <Badge variant="blue">{FREQ_LABELS[plan.frequency] ?? plan.frequency}</Badge>
      </div>

      {/* Next date + amount */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Next purchase</p>
          {plan.nextPurchaseDate ? (
            <p className={`text-sm font-medium ${days !== null && days <= 0 ? 'text-green-400' : days !== null && days <= 3 ? 'text-yellow-400' : 'text-gray-300'}`}>
              {days !== null && days <= 0
                ? 'Today'
                : days === 1
                ? 'Tomorrow'
                : days !== null
                ? `in ${days} days`
                : '—'}
              <span className="text-gray-600 font-normal text-xs ml-1.5">
                {formatDate(plan.nextPurchaseDate)}
              </span>
            </p>
          ) : (
            <p className="text-sm text-gray-600">Not scheduled</p>
          )}
        </div>

        <div className="text-right space-y-1.5">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Suggested buy</p>
            <p className={`text-sm font-bold font-mono ${isBoosted ? 'text-brand-400' : 'text-gray-200'}`}>
              {format(plan.suggestedAmount)}
            </p>
            {isBoosted && (
              <p className="text-xs text-gray-500 line-through">{format(plan.amountUsd)}</p>
            )}
          </div>
          {plan.suggestedSellAmount != null && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Suggested sell</p>
              <p className="text-sm font-bold font-mono text-amber-400">
                {format(plan.suggestedSellAmount)}
              </p>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export default function Dashboard() {
  const { data, isLoading, error } = useDashboard();
  const { format, formatPct } = useCurrencyFormatter();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-sm animate-pulse">Loading portfolio...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400 text-sm">Failed to load dashboard data.</div>
      </div>
    );
  }

  const { portfolio, assetStats, activePlans, activePlanList, monthlyData } = data;
  const isProfitable = portfolio.totalPnl >= 0;

  // Pie chart data
  const rawPieData = assetStats.filter((a) => a.currentValue > 0);
  const totalPieValue = rawPieData.reduce((s, a) => s + a.currentValue, 0);
  const pieData = rawPieData.map((a) => ({
    name: a.asset.symbol,
    value: a.currentValue,
    pct: totalPieValue > 0 ? (a.currentValue / totalPieValue) * 100 : 0,
  }));

  // Monthly chart data
  const chartData = monthlyData.map((d) => ({
    month: d.month,
    invested: Math.round(d.invested * 100) / 100,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-100">Portfolio Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Last updated {formatDate(data.lastUpdated)} · {activePlans} active plan{activePlans !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Invested" value={format(portfolio.totalInvested)} />
        <StatCard label="Current Value"  value={format(portfolio.totalCurrentValue)} />
        <StatCard
          label="Total P&L"
          value={format(portfolio.totalPnl)}
          sub={formatPct(portfolio.totalPnlPercent)}
          positive={isProfitable}
          negative={!isProfitable}
        />
      </div>

      {/* Active plans */}
      {activePlanList.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">Active Plans</h2>
            <button
              onClick={() => navigate('/app/plans')}
              className="text-xs text-gray-500 hover:text-brand-400 transition-colors"
            >
              Manage →
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activePlanList.map(plan => (
              <ActivePlanCard
                key={plan.id}
                plan={plan}
                onClick={() => navigate(`/app/plans/${plan.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fear & Greed */}
      <FearGreedWidget />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly investment chart */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Monthly Investment (last 12 months)</h2>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="investGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
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
                <Area type="monotone" dataKey="invested" stroke="#22c55e" fill="url(#investGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Portfolio allocation */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Allocation</h2>
          {pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">No assets yet</div>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, color: '#f3f4f6' }}
                    itemStyle={{ color: '#f3f4f6' }}
                    labelStyle={{ color: '#9ca3af' }}
                    formatter={(v: number, _name: string, props: { payload?: { pct?: number } }) => [
                      `${format(v)}  (${props.payload?.pct?.toFixed(1) ?? '0.0'}%)`,
                      'Value',
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Custom legend with percentages */}
              <div className="mt-3 space-y-1.5">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-400">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-gray-500">{format(d.value)}</span>
                      <span className="text-gray-200 font-semibold w-12 text-right">{d.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Asset breakdown table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">Asset Breakdown</h2>
        </div>
        {assetStats.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-600 text-sm">
            No assets yet. Add an asset to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                  {['Asset', 'Total Amount', 'Invested', 'Current Value', 'Avg Buy', 'Current Price', 'P&L', 'Drawdown vs ATH', 'Purchases'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {assetStats.map((stat) => (
                  <tr key={stat.asset.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono"
                        style={stat.asset.color ? { color: stat.asset.color } : undefined}
                      >{stat.asset.symbol}</span>
                        <Badge variant={stat.asset.assetType === 'CRYPTO' ? 'blue' : stat.asset.assetType === 'METAL' ? 'yellow' : 'gray'}>
                          {stat.asset.assetType}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{stat.asset.name}</p>
                    </td>
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
                        <span className="text-green-400 font-mono font-medium text-xs">ATH 🔥</span>
                      ) : (
                        <div>
                          <span className="font-mono font-medium text-orange-400">
                            {stat.drawdownFromAth.toFixed(1)}%
                          </span>
                          <p className="text-xs text-gray-600 mt-0.5">
                            ATH {format(stat.ath!)}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-500">{stat.txCount}</td>
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
