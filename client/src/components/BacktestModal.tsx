'use client';

/**
 * Backtest modal. Runs a buying rule set against historical prices and
 * compares it to plain DCA. See docs/backtest-design.md.
 *
 * Flow: parameters form -> loading -> results.
 * Blocking states (non-crypto asset, unlisted pair, provider down) are shown
 * inside the modal before submission, per the design doc decision table.
 */

import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Info, RefreshCw } from 'lucide-react';
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useAssets } from '@/hooks/useAssets';
import {
  useBacktestAvailability, useBacktest,
  BacktestParams, BacktestResult,
} from '@/hooks/useBacktest';
import { BuyingRuleSet } from '@/types';
import { useCurrencyFormatter, formatQuantity, formatDate } from '@/lib/format';
import { useStore } from '@/store/useStore';

const INPUT = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500';

const FREQ_OPTIONS = [
  { value: 'DAILY',    label: 'Daily' },
  { value: 'WEEKLY',   label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-weekly' },
  { value: 'MONTHLY',  label: 'Monthly' },
  { value: 'CUSTOM',   label: 'Custom interval' },
];

function defaultStartDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, to: Date): number {
  return Math.floor((to.getTime() - new Date(fromIso).getTime()) / 86_400_000);
}

// ─── Notice panels ────────────────────────────────────────────────────────────

function BlockingNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
      <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="text-sm text-yellow-200">{children}</div>
    </div>
  );
}

function InfoNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-gray-800/50 border border-gray-700/60 rounded-xl px-4 py-3">
      <Info size={16} className="text-gray-500 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="text-sm text-gray-400">{children}</div>
    </div>
  );
}

function ErrorNotice({ children, onRetry }: { children: React.ReactNode; onRetry?: () => void }) {
  return (
    <div className="flex gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
      <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="text-sm text-red-300 flex-1">{children}</div>
      {onRetry && (
        <button onClick={onRetry} title="Retry"
          className="text-red-300 hover:text-red-100 transition-colors self-start p-1 rounded">
          <RefreshCw size={14} />
        </button>
      )}
    </div>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────────

function BacktestResults({ data }: { data: BacktestResult }) {
  const { format } = useCurrencyFormatter();
  const theme = useStore((s) => s.theme);
  const isLight = theme === 'light' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches);

  const { strategy, control, comparison, chartData, asset } = data;
  const ahead = comparison.deltaFinalValueUsd >= 0;

  // Thin the chart for readability but always keep boosted buys so the
  // multiplier markers stay accurate.
  const displayChart = useMemo(() => {
    if (chartData.length <= 120) return chartData;
    const step = Math.ceil(chartData.length / 120);
    const kept = chartData.filter((p, i) => i % step === 0 || p.multiplier !== 1);
    return kept;
  }, [chartData]);

  const boosted = useMemo(
    () => displayChart.filter(p => p.multiplier !== 1),
    [displayChart],
  );

  const shortHistory = daysBetween(data.dataStartDate, new Date()) < 90;

  const rows: { label: string; s: string; c: string; d: string; dPositive?: boolean }[] = [
    {
      label: 'Total invested',
      s: format(strategy.totalInvested),
      c: format(control.totalInvested),
      d: `${comparison.deltaTotalInvested >= 0 ? '+' : ''}${format(comparison.deltaTotalInvested)}`,
    },
    {
      label: `${asset.symbol} accumulated`,
      s: formatQuantity(strategy.totalQuantity),
      c: formatQuantity(control.totalQuantity),
      d: formatQuantity(strategy.totalQuantity - control.totalQuantity),
    },
    {
      label: 'Avg buy price',
      s: format(strategy.averageBuyPrice),
      c: format(control.averageBuyPrice),
      d: `${comparison.deltaAverageBuyPrice >= 0 ? '+' : ''}${format(comparison.deltaAverageBuyPrice)}`,
      dPositive: comparison.deltaAverageBuyPrice <= 0, // cheaper is better
    },
    {
      label: 'Final value',
      s: format(strategy.finalValue),
      c: format(control.finalValue),
      d: `${comparison.deltaFinalValueUsd >= 0 ? '+' : ''}${format(comparison.deltaFinalValueUsd)}`,
      dPositive: comparison.deltaFinalValueUsd >= 0,
    },
    {
      label: 'ROI',
      s: `${strategy.roiPct >= 0 ? '+' : ''}${strategy.roiPct.toFixed(2)}%`,
      c: `${control.roiPct >= 0 ? '+' : ''}${control.roiPct.toFixed(2)}%`,
      d: `${comparison.deltaFinalValuePct >= 0 ? '+' : ''}${comparison.deltaFinalValuePct.toFixed(2)} pts`,
      dPositive: comparison.deltaFinalValuePct >= 0,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Verdict */}
      <div className={`rounded-xl px-4 py-3 border ${
        ahead ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
      }`}>
        <p className={`text-sm font-semibold ${ahead ? 'text-green-400' : 'text-red-400'}`}>
          &quot;{data.ruleSet.label}&quot; ended {comparison.deltaFinalValuePct >= 0 ? '+' : ''}{comparison.deltaFinalValuePct.toFixed(2)} ROI points {ahead ? 'ahead of' : 'behind'} plain DCA
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {format(Math.abs(comparison.deltaFinalValueUsd))} {ahead ? 'more' : 'less'} final value on {data.totalBuyCount} buys, {asset.symbol}, {formatDate(data.requestedStartDate)} to {data.params.endDate ? formatDate(data.params.endDate) : 'today'}
        </p>
      </div>

      {/* Data notices */}
      {data.clamped && (
        <InfoNotice>Price history for {asset.symbol} starts on {formatDate(data.dataStartDate)}. Results are computed from that date.</InfoNotice>
      )}
      {data.skippedDates > 0 && (
        <InfoNotice>{data.skippedDates} scheduled buys were skipped because no price was available within 3 days.</InfoNotice>
      )}
      {shortHistory && (
        <BlockingNotice>Only {daysBetween(data.dataStartDate, new Date())} days of history exist for {asset.symbol}. Treat these results as indicative, not conclusive.</BlockingNotice>
      )}

      {/* Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-1">Rule set vs plain DCA</h3>
        <p className="text-xs text-gray-600 mb-3">Dots mark boosted buys, sized by multiplier.</p>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={displayChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e8ecf1' : '#1f2937'} />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }}
              tickFormatter={v => v.slice(0, 7)} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }}
              tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} width={52} />
            <Tooltip
              contentStyle={{ background: isLight ? '#ffffff' : '#111827', border: `1px solid ${isLight ? '#e8ecf1' : '#1f2937'}`, borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              labelStyle={{ color: isLight ? '#475569' : '#9ca3af' }}
              formatter={(value: number, name: string) => [
                `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                name === 'strategyValue' ? 'Rule set' : name === 'controlValue' ? 'Plain DCA' : 'Boosted buy',
              ]}
            />
            <Legend
              formatter={v => v === 'strategyValue' ? 'Rule set' : v === 'controlValue' ? 'Plain DCA' : 'Boosted buys'}
              wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
            />
            <Line type="monotone" dataKey="strategyValue" stroke="#0ecb81" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="controlValue" stroke="#6b7280" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            <Scatter data={boosted} dataKey="strategyValue" fill="#f0b90b"
              shape={(props: { cx?: number; cy?: number; payload?: { multiplier?: number } }) => (
                <circle cx={props.cx} cy={props.cy}
                  r={Math.min(2 + (props.payload?.multiplier ?? 1) * 1.2, 8)}
                  fill="#f0b90b" fillOpacity={0.85} />
              )} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Comparison table */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800/40">
              <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium"></th>
              <th className="px-4 py-2.5 text-right text-xs text-gray-500 font-medium whitespace-nowrap">Rule set</th>
              <th className="px-4 py-2.5 text-right text-xs text-gray-500 font-medium whitespace-nowrap">Plain DCA</th>
              <th className="px-4 py-2.5 text-right text-xs text-gray-500 font-medium whitespace-nowrap">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {rows.map(r => (
              <tr key={r.label} className="hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{r.label}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-200 whitespace-nowrap">{r.s}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-400 whitespace-nowrap">{r.c}</td>
                <td className={`px-4 py-3 text-right font-mono whitespace-nowrap ${
                  r.dPositive === undefined ? 'text-gray-400' : r.dPositive ? 'text-green-400' : 'text-red-400'
                }`}>{r.d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Honesty notices */}
      <div className="space-y-1">
        <p className="text-xs text-gray-600">Backtests use daily closing prices, so real purchases will differ slightly.</p>
        <p className="text-xs text-gray-600">Drawdown is measured against the highest price within the available data window, which may be lower than the true all-time high early in the period.</p>
        <p className="text-xs text-gray-600">Past performance does not predict future results.</p>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function BacktestModal({ ruleSet, onClose, initialAssetId, initialAmountUsd, initialFrequency, initialIntervalDays }: {
  ruleSet: BuyingRuleSet;
  onClose: () => void;
  initialAssetId?: string;
  initialAmountUsd?: number;
  initialFrequency?: string;
  initialIntervalDays?: number;
}) {
  const [assetId, setAssetId] = useState(initialAssetId ?? '');
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState('');
  const [amountUsd, setAmountUsd] = useState(initialAmountUsd ? String(initialAmountUsd) : '100');
  const [frequency, setFrequency] = useState(initialFrequency ?? 'WEEKLY');
  const [intervalDays, setIntervalDays] = useState(initialIntervalDays ? String(initialIntervalDays) : '30');
  const [params, setParams] = useState<BacktestParams | null>(null);

  const { data: assets = [] } = useAssets();
  const selectedAsset = assets.find(a => a.id === assetId) ?? null;
  const isCrypto = selectedAsset?.assetType === 'CRYPTO';

  const availability = useBacktestAvailability(isCrypto ? assetId : null);
  const backtest = useBacktest(params);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const emptyRuleSet = ruleSet.rows.length === 0;
  const blocked =
    !assetId
    || emptyRuleSet
    || (selectedAsset !== null && !isCrypto)
    || availability.isLoading
    || (availability.data !== undefined && !availability.data.available);

  const blockedTitle =
    emptyRuleSet ? 'This rule set has no rows yet'
    : !assetId ? 'Select an asset first'
    : selectedAsset && !isCrypto ? 'Backtesting is only available for crypto assets'
    : availability.data && !availability.data.available ? 'No price history is available for this asset'
    : availability.isLoading ? 'Checking price history availability'
    : 'Run backtest';

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked) return;
    setParams({
      assetId,
      ruleSetId: ruleSet.id,
      startDate,
      endDate: endDate || undefined,
      amountUsd: parseFloat(amountUsd) || 100,
      frequency,
      intervalDays: frequency === 'CUSTOM' ? parseInt(intervalDays) || 30 : undefined,
    });
  };

  const showForm = !params;
  const dataStart = availability.data?.dataStartDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 !mt-0"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-100">Backtest &quot;{ruleSet.label}&quot;</h2>
            <p className="text-xs text-gray-500 mt-0.5">Compare this rule set against plain DCA on historical prices</p>
          </div>
          <button onClick={onClose} title="Close"
            className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {showForm && (
            <form onSubmit={handleRun} className="space-y-4">
              {emptyRuleSet && (
                <BlockingNotice>This rule set has no rows yet. Add at least one row to backtest it.</BlockingNotice>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Asset *</label>
                  <select required value={assetId} onChange={e => setAssetId(e.target.value)} className={INPUT}>
                    <option value="">Select an asset...</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>{a.symbol}, {a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Base amount per buy (USD) *</label>
                  <input required type="number" min="1" step="0.01" value={amountUsd}
                    onChange={e => setAmountUsd(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Start date *</label>
                  <input required type="date" value={startDate}
                    onChange={e => setStartDate(e.target.value)} className={INPUT} />
                  {dataStart && startDate && startDate < dataStart && (
                    <p className="text-xs text-gray-500 mt-1">Price history starts on {formatDate(dataStart)}. Results will begin there.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">End date (optional)</label>
                  <input type="date" value={endDate}
                    onChange={e => setEndDate(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Frequency *</label>
                  <select value={frequency} onChange={e => setFrequency(e.target.value)} className={INPUT}>
                    {FREQ_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                {frequency === 'CUSTOM' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Interval (days) *</label>
                    <input required type="number" min="1" value={intervalDays}
                      onChange={e => setIntervalDays(e.target.value)} className={INPUT} />
                  </div>
                )}
              </div>

              {/* Availability states */}
              {selectedAsset && !isCrypto && (
                <BlockingNotice>
                  Backtesting currently supports crypto assets only. {selectedAsset.name} is {selectedAsset.assetType.toLowerCase()}.
                </BlockingNotice>
              )}
              {isCrypto && availability.isLoading && (
                <InfoNotice>Checking price history availability for {selectedAsset?.symbol}...</InfoNotice>
              )}
              {isCrypto && availability.data && !availability.data.available && availability.data.reason === 'NOT_LISTED' && (
                <BlockingNotice>
                  No price history is available for {selectedAsset?.symbol}. Backtesting needs daily history from Binance, and this asset is not listed there. Major assets like BTC, ETH and SOL are fully supported.
                </BlockingNotice>
              )}
              {isCrypto && ((availability.data && !availability.data.available && availability.data.reason === 'PROVIDER_DOWN') || availability.isError) && (
                <ErrorNotice onRetry={() => availability.refetch()}>
                  Could not load price history right now. This is a data provider issue, not a problem with your account. Try again in a few minutes.
                </ErrorNotice>
              )}
              {isCrypto && availability.data?.available && dataStart && (
                <p className="text-xs text-gray-500">Price history available since {formatDate(dataStart)}.</p>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={blocked} title={blockedTitle}
                  className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Run backtest
                </button>
              </div>
            </form>
          )}

          {params && backtest.isLoading && (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400">Running backtest...</p>
              <p className="text-xs text-gray-600 mt-1">Fetching daily price history and evaluating your rules.</p>
            </div>
          )}

          {params && backtest.isError && (
            <div className="space-y-4">
              {backtest.error.code === 'PROVIDER_DOWN' ? (
                <ErrorNotice onRetry={() => backtest.refetch()}>
                  Could not load price history right now. This is a data provider issue, not a problem with your account. Try again in a few minutes.
                </ErrorNotice>
              ) : (
                <ErrorNotice>{backtest.error.message}</ErrorNotice>
              )}
              <div className="flex justify-end">
                <button onClick={() => setParams(null)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg transition-colors">
                  Edit parameters
                </button>
              </div>
            </div>
          )}

          {params && backtest.data && (
            <div className="space-y-5">
              <BacktestResults data={backtest.data} />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setParams(null)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg transition-colors">
                  Edit parameters
                </button>
                <button onClick={onClose}
                  className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
