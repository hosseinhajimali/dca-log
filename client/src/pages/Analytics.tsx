import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { useDashboard } from '@/hooks/useDashboard';
import { useCurrencyFormatter } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

export default function Analytics() {
  const { data, isLoading } = useDashboard();
  const { format, formatPct } = useCurrencyFormatter();

  if (isLoading) return <div className="text-gray-500 text-sm animate-pulse p-8">Loading analytics...</div>;
  if (!data) return null;

  const { assetStats, monthlyData } = data;

  const sorted = [...assetStats].sort((a, b) => b.pnlPercent - a.pnlPercent);

  const cumulativeData = monthlyData.reduce<{ month: string; invested: number; cumulative: number }[]>((acc, d) => {
    const prev = acc[acc.length - 1]?.cumulative ?? 0;
    acc.push({ month: d.month, invested: d.invested, cumulative: prev + d.invested });
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Performance breakdown across all assets</p>
      </div>

      {/* P&L by asset */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">P&L by Asset</h2>
        {assetStats.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-600 text-sm">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={assetStats.map(s => ({ name: s.asset.symbol, pnl: parseFloat(s.pnl.toFixed(2)), pct: parseFloat(s.pnlPercent.toFixed(2)) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8 }}
                formatter={(v: number) => [format(v), 'P&L']}
              />
              <Bar dataKey="pnl" fill="#22c55e" radius={[4, 4, 0, 0]}
                label={false}
                isAnimationActive={true} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Cumulative investment */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">Cumulative Investment over Time</h2>
        {cumulativeData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-600 text-sm">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8 }}
                formatter={(v: number) => [format(v)]}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              <Line type="monotone" dataKey="cumulative" name="Total invested" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="invested" name="Monthly" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Rankings */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300">Asset Rankings (by return %)</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {sorted.map((stat, i) => (
            <div key={stat.asset.id} className="px-5 py-4 flex items-center gap-4">
              <span className="text-lg font-bold text-gray-600 w-6 text-center">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono text-gray-100">{stat.asset.symbol}</span>
                  <span className="text-gray-500 text-sm">{stat.asset.name}</span>
                  <Badge variant={stat.asset.assetType === 'CRYPTO' ? 'blue' : 'yellow'}>{stat.asset.assetType}</Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>Invested: {format(stat.totalInvested)}</span>
                  <span>Avg cost: {format(stat.avgCost)}</span>
                  <span>Current: {format(stat.currentPrice)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-mono font-bold text-base ${stat.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPct(stat.pnlPercent)}
                </p>
                <p className={`text-xs font-mono ${stat.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {format(stat.pnl)}
                </p>
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <div className="px-5 py-10 text-center text-gray-600 text-sm">No data yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
