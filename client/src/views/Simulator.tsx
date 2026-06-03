'use client';

import { useState, useEffect, Suspense } from 'react';
import { FlaskConical } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useSearchParams } from 'next/navigation';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useAssets } from '@/hooks/useAssets';
import { useSimulator, SimulationParams, SimulationResult } from '@/hooks/useSimulator';
import { StatCard } from '@/components/ui/StatCard';
import { useCurrencyFormatter, formatQuantity } from '@/lib/format';
import { useStore } from '@/store/useStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const FREQ_OPTIONS = [
  { value: 'DAILY',    label: 'Daily' },
  { value: 'WEEKLY',   label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-weekly' },
  { value: 'MONTHLY',  label: 'Monthly' },
];

// Known simulatable symbols (those with CoinGecko coverage)
const KNOWN_CRYPTO = new Set([
  'BTC','ETH','SOL','BNB','ADA','DOT','MATIC','LINK','AVAX','DOGE',
  'XRP','LTC','UNI','ATOM','FIL','NEAR','ARB','OP','INJ','SUI',
]);

function isSimulatable(assetType: string, symbol: string) {
  return KNOWN_CRYPTO.has(symbol.toUpperCase()) || assetType === 'CRYPTO';
}

function defaultStartDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().slice(0, 10);
}

// ─── Simulator form ───────────────────────────────────────────────────────────

interface FormState {
  assetId:   string;
  startDate: string;
  amountUsd: string;
  frequency: string;
}

// ─── Results section ──────────────────────────────────────────────────────────

function ResultsSection({ data }: { data: SimulationResult }) {
  const { format } = useCurrencyFormatter();
  const { summary, chartData, recentBuys, asset } = data;
  const profitable = summary.totalReturn >= 0;
  const theme = useStore((s) => s.theme);
  const isLight = theme === 'light' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches);

  // Thin chart data for readability (max 120 points)
  const displayChart = chartData.length > 120
    ? chartData.filter((_, i) => i % Math.ceil(chartData.length / 120) === 0)
    : chartData;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Invested"  value={format(summary.totalInvested)} />
        <StatCard
          label="Current Value"
          value={format(summary.currentValue)}
          positive={profitable}
          negative={!profitable}
        />
        <StatCard
          label="Total Return"
          value={format(summary.totalReturn)}
          sub={`${summary.totalReturnPct >= 0 ? '+' : ''}${summary.totalReturnPct.toFixed(2)}%`}
          positive={profitable}
          negative={!profitable}
        />
        <StatCard label="Avg Buy Price"  value={format(summary.avgCost)} />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Buys executed',  value: String(summary.buyCount) },
          { label: `${asset.symbol} accumulated`, value: formatQuantity(summary.totalQuantity) },
          { label: 'Best buy price',  value: format(summary.bestBuyPrice) },
          { label: 'Worst buy price', value: format(summary.worstBuyPrice) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="font-mono font-semibold text-gray-200 text-sm">{value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-1">Portfolio Value vs Amount Invested</h2>
        <p className="text-xs text-gray-600 mb-4">
          {summary.firstBuyDate} → {summary.lastBuyDate}
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={displayChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="simValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={profitable ? '#22c55e' : '#ef4444'} stopOpacity={0.25} />
                <stop offset="95%" stopColor={profitable ? '#22c55e' : '#ef4444'} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="simInvested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickFormatter={v => v.slice(0, 7)} // YYYY-MM
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              width={52}
            />
            <Tooltip
              contentStyle={{ background: isLight ? '#ffffff' : '#111827', border: `1px solid ${isLight ? '#e8ecf1' : '#1f2937'}`, borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              labelStyle={{ color: isLight ? '#475569' : '#9ca3af' }}
              formatter={(value: number, name: string) => [
                `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                name === 'portfolioValue' ? 'Portfolio value' : 'Total invested',
              ]}
            />
            <Legend
              formatter={v => v === 'portfolioValue' ? 'Portfolio value' : 'Total invested'}
              wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
            />
            <Area
              type="monotone"
              dataKey="portfolioValue"
              stroke={profitable ? '#22c55e' : '#ef4444'}
              fill="url(#simValue)"
              strokeWidth={2}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="totalInvested"
              stroke="#6366f1"
              fill="url(#simInvested)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent buys table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300">Recent Simulated Buys</h2>
          <span className="text-xs text-gray-600">showing last {recentBuys.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                {['Date', 'Price', 'Qty bought', 'Amount', 'Portfolio value'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBuys.map((buy, i) => (
                <tr key={i} className="hover:bg-gray-700/50 transition-colors border-b border-gray-800 last:border-0">
                  <td className="px-5 py-3.5 text-gray-400">{buy.date}</td>
                  <td className="px-5 py-3.5 font-mono text-gray-300">{format(buy.price)}</td>
                  <td className="px-5 py-3.5 font-mono text-gray-400">
                    {formatQuantity(buy.quantity)}
                    <span className="text-gray-600 text-xs ml-1">{asset.symbol}</span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-gray-300">{format(buy.amountUsd)}</td>
                  <td className="px-5 py-3.5 font-mono text-gray-200">{format(buy.portfolioValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function SimulatorInner() {
  const searchParams = useSearchParams();
  const { data: assets = [] } = useAssets();
  const { format } = useCurrencyFormatter();

  const simulatableAssets = assets.filter(a => isSimulatable(a.assetType, a.symbol));

  // Form state, pre-filled from URL params when coming from Plan Detail
  const [form, setForm] = useState<FormState>({
    assetId:   searchParams?.get('assetId')   || '',
    startDate: searchParams?.get('startDate') || defaultStartDate(),
    amountUsd: searchParams?.get('amountUsd') || '100',
    frequency: searchParams?.get('frequency') || 'WEEKLY',
  });

  // The committed params that actually trigger the query
  const [activeParams, setActiveParams] = useState<SimulationParams | null>(null);

  // Auto-run if all params are pre-filled from URL (coming from Plan Detail)
  useEffect(() => {
    const fromUrl = searchParams?.get('assetId');
    if (fromUrl && searchParams?.get('startDate') && searchParams?.get('amountUsd')) {
      setActiveParams({
        assetId:   fromUrl,
        startDate: searchParams.get('startDate')!,
        amountUsd: parseFloat(searchParams.get('amountUsd')!),
        frequency: searchParams.get('frequency') || 'WEEKLY',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading, error } = useSimulator(activeParams);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.assetId || !form.startDate || !form.amountUsd) return;
    setActiveParams({
      assetId:   form.assetId,
      startDate: form.startDate,
      amountUsd: parseFloat(form.amountUsd),
      frequency: form.frequency,
    });
  };

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500';

  const errorMessage = error
    ? ((error as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Simulation failed. Try a different asset or date range.')
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-gray-100">DCA Simulator</h1>
          <InfoTooltip content="Pick a crypto asset, set a start date, enter how much you would have bought each time, choose a frequency, then hit Run. You'll see the full backtest: total invested, current value, return, and a chart of how your portfolio would have grown." />
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Asset */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Asset</label>
            <select
              required
              value={form.assetId}
              onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select asset…</option>
              {simulatableAssets.map(a => (
                <option key={a.id} value={a.id}>{a.symbol} · {a.name}</option>
              ))}
              {simulatableAssets.length === 0 && assets.length > 0 && (
                <option disabled>No crypto assets found</option>
              )}
            </select>
            <p className="text-xs text-gray-600 mt-1">Crypto with CoinGecko data only</p>
          </div>

          {/* Start date */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Start date</label>
            <input
              type="date"
              required
              value={form.startDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              className={inputCls}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Amount per buy (USD)</label>
            <input
              type="number"
              required
              min="1"
              step="any"
              value={form.amountUsd}
              onChange={e => setForm(f => ({ ...f, amountUsd: e.target.value }))}
              placeholder="100"
              className={inputCls}
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Frequency</label>
            <select
              value={form.frequency}
              onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
              className={inputCls}
            >
              {FREQ_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {isLoading ? 'Simulating…' : 'Run simulation'}
          </button>

          {activeParams && !isLoading && data && (
            <p className="text-xs text-gray-600">
              Showing results for{' '}
              <span className="text-gray-400 font-medium">{format(activeParams.amountUsd)}/{activeParams.frequency.toLowerCase()}</span>
              {' '}starting <span className="text-gray-400 font-medium">{activeParams.startDate}</span>
            </p>
          )}
        </div>
      </form>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-500 text-sm animate-pulse">
          Fetching historical prices and running simulation…
        </div>
      )}

      {/* Error */}
      {errorMessage && !isLoading && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4 text-sm text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Results */}
      {data && !isLoading && <ResultsSection data={data} />}

      {/* Empty state */}
      {!activeParams && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
          <FlaskConical size={40} strokeWidth={1.5} className="text-gray-700" />
          <p className="text-gray-400 text-sm font-medium">No simulation run yet.</p>
          <p className="text-gray-600 text-xs">Fill in the fields above and hit Run.</p>
        </div>
      )}
    </div>
  );
}

export default function Simulator() {
  return (
    <Suspense>
      <SimulatorInner />
    </Suspense>
  );
}
