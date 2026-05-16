import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { useAssets } from '@/hooks/useAssets';
import { useAssetPrice } from '@/hooks/usePrices';
import { useCurrencyFormatter } from '@/lib/format';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_MONTHS = 360; // 30 years cap

const SCENARIOS = [
  { key: 'bear',     label: 'Bear',     color: '#ef4444', defaultRate: -25 },
  { key: 'flat',     label: 'Flat',     color: '#9ca3af', defaultRate:   0 },
  { key: 'moderate', label: 'Moderate', color: '#60a5fa', defaultRate:  30 },
  { key: 'bull',     label: 'Bull',     color: '#22c55e', defaultRate: 100 },
] as const;

type ScenarioKey = typeof SCENARIOS[number]['key'];

const FREQ_PERIODS_PER_MONTH: Record<string, number> = {
  DAILY:    365 / 12,
  WEEKLY:   52  / 12,
  BIWEEKLY: 26  / 12,
  MONTHLY:  1,
};

// ─── Projection math ──────────────────────────────────────────────────────────

interface MonthPoint {
  monthIndex:    number;
  label:         string;
  totalInvested: number;
  bear:          number;
  flat:          number;
  moderate:      number;
  bull:          number;
}

interface ProjectionResult {
  chartData: MonthPoint[];
  monthlyInvested: number;
  goalMonth: Partial<Record<ScenarioKey, number>>; // month index where goal is first reached
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function runProjection(
  currentPrice: number,
  amountPerPeriod: number,
  frequency: string,
  rates: Record<ScenarioKey, number>,
  horizonMonths: number,
  existingQty: number,
): ProjectionResult {
  const periodsPerMonth = FREQ_PERIODS_PER_MONTH[frequency] ?? 1;
  const monthlyInvested = amountPerPeriod * periodsPerMonth;
  const now = new Date();
  now.setDate(1); // normalise to 1st of month

  const chartData: MonthPoint[] = [];
  const goalMonth: Partial<Record<ScenarioKey, number>> = {};

  // Running state per scenario
  const qty: Record<string, number> = {};
  for (const s of SCENARIOS) qty[s.key] = existingQty;

  for (let m = 0; m <= horizonMonths; m++) {
    const point: MonthPoint = {
      monthIndex:    m,
      label:         formatMonthLabel(addMonths(now, m)),
      totalInvested: Math.round(monthlyInvested * m * 100) / 100,
      bear:          0,
      flat:          0,
      moderate:      0,
      bull:          0,
    };

    for (const s of SCENARIOS) {
      const annualRate = rates[s.key] / 100;
      const price = currentPrice * Math.pow(1 + annualRate, m / 12);

      if (m > 0) {
        // Buy this month's allocation
        const investment = monthlyInvested;
        qty[s.key] += price > 0 ? investment / price : 0;
      }

      point[s.key] = Math.round(qty[s.key] * price * 100) / 100;
    }

    chartData.push(point);
  }

  return { chartData, monthlyInvested, goalMonth };
}

function findGoalMonth(
  chartData: MonthPoint[],
  goalValue: number,
  mode: 'quantity' | 'value',
  currentPrice: number,
): Partial<Record<ScenarioKey, number>> {
  const goalUsd = mode === 'value' ? goalValue : goalValue * currentPrice;
  const result: Partial<Record<ScenarioKey, number>> = {};

  for (const s of SCENARIOS) {
    const found = chartData.find(p => p[s.key] >= goalUsd);
    if (found) result[s.key] = found.monthIndex;
  }

  return result;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScenarioInput({
  scenario,
  rate,
  onChange,
}: {
  scenario: typeof SCENARIOS[number];
  rate: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800/50 border border-gray-800 rounded-xl">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: scenario.color }} />
      <span className="text-sm font-medium text-gray-300 w-20">{scenario.label}</span>
      <input
        type="number"
        step="5"
        value={rate}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-gray-100 text-right font-mono focus:outline-none focus:border-brand-500"
      />
      <span className="text-sm text-gray-500">% / year</span>
    </div>
  );
}

function GoalBadge({ months, label, color }: { months: number | undefined; label: string; color: string }) {
  const now = new Date();
  now.setDate(1);

  return (
    <div className="flex flex-col gap-1 p-4 bg-gray-800/50 border border-gray-800 rounded-xl">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-xs font-medium text-gray-400">{label}</span>
      </div>
      {months === undefined ? (
        <p className="text-sm text-gray-600 font-mono">30+ years</p>
      ) : months === 0 ? (
        <p className="text-sm font-mono" style={{ color }}>Already there!</p>
      ) : (
        <>
          <p className="text-base font-bold font-mono" style={{ color }}>
            {months < 12 ? `${months}mo` : `${(months / 12).toFixed(1)}yr`}
          </p>
          <p className="text-xs text-gray-500">{formatMonthLabel(addMonths(now, months))}</p>
        </>
      )}
    </div>
  );
}

function HorizonRow({
  scenario,
  finalValue,
  totalInvested,
}: {
  scenario: typeof SCENARIOS[number];
  finalValue: number;
  totalInvested: number;
}) {
  const { format } = useCurrencyFormatter();
  const ret = totalInvested > 0 ? ((finalValue - totalInvested) / totalInvested) * 100 : 0;
  const positive = finalValue >= totalInvested;

  return (
    <tr className="border-b border-gray-800 last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: scenario.color }} />
          <span className="text-sm font-medium text-gray-300">{scenario.label}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-sm" style={{ color: scenario.color }}>{format(finalValue)}</td>
      <td className="px-4 py-3 font-mono text-sm text-gray-400">{format(totalInvested)}</td>
      <td className="px-4 py-3">
        <span className={`font-mono text-sm font-medium ${positive ? 'text-green-400' : 'text-red-400'}`}>
          {positive ? '+' : ''}{ret.toFixed(1)}%
        </span>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProjectionCalculator() {
  const { data: assets = [] } = useAssets();
  const { format } = useCurrencyFormatter();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [assetId,      setAssetId]      = useState('');
  const [amountUsd,    setAmountUsd]    = useState('200');
  const [frequency,    setFrequency]    = useState('MONTHLY');
  const [mode,         setMode]         = useState<'goal' | 'horizon'>('horizon');
  const [goalType,     setGoalType]     = useState<'quantity' | 'value'>('value');
  const [goalAmount,   setGoalAmount]   = useState('');
  const [horizonInput, setHorizonInput] = useState('36');
  const [horizonUnit,  setHorizonUnit]  = useState<'months' | 'years'>('months');
  const [existingQty,  setExistingQty]  = useState('0');
  const [manualPrice,  setManualPrice]  = useState('');
  const [rates, setRates] = useState<Record<ScenarioKey, number>>({
    bear: -25, flat: 0, moderate: 30, bull: 100,
  });

  // ── Data ───────────────────────────────────────────────────────────────────
  const selectedAsset = assets.find(a => a.id === assetId) ?? null;
  const { data: fetchedPrice } = useAssetPrice(selectedAsset?.symbol ?? null);

  const currentPrice = manualPrice
    ? parseFloat(manualPrice)
    : fetchedPrice ?? null;

  // ── Computed projection ────────────────────────────────────────────────────
  const horizonMonths = useMemo(() => {
    const n = parseFloat(horizonInput) || 36;
    return horizonUnit === 'years' ? Math.round(n * 12) : Math.round(n);
  }, [horizonInput, horizonUnit]);

  const simulationMonths = mode === 'goal' ? MAX_MONTHS : horizonMonths;

  const projection = useMemo(() => {
    if (!currentPrice || !amountUsd || !assetId) return null;
    const amount = parseFloat(amountUsd);
    const qty    = parseFloat(existingQty) || 0;
    if (!amount || amount <= 0) return null;
    return runProjection(currentPrice, amount, frequency, rates, simulationMonths, qty);
  }, [currentPrice, amountUsd, frequency, rates, simulationMonths, assetId, existingQty]);

  const goalMonths = useMemo(() => {
    if (!projection || mode !== 'goal' || !goalAmount || !currentPrice) return {};
    const goal = parseFloat(goalAmount);
    if (!goal || goal <= 0) return {};
    return findGoalMonth(projection.chartData, goal, goalType, currentPrice);
  }, [projection, mode, goalAmount, goalType, currentPrice, rates, existingQty]);

  // Trim chart data for horizon mode
  const chartData = useMemo(() => {
    if (!projection) return [];
    if (mode === 'goal') {
      // Show up to the latest goal month + 6 months buffer, or 5 years minimum
      const maxGoal = Math.max(0, ...Object.values(goalMonths).filter(Boolean) as number[]);
      const cutoff  = Math.max(60, Math.min(maxGoal + 6, MAX_MONTHS));
      return projection.chartData.slice(0, cutoff + 1);
    }
    return projection.chartData;
  }, [projection, mode, goalMonths]);

  const goalValueUsd = useMemo(() => {
    if (mode !== 'goal' || !goalAmount || !currentPrice) return null;
    const g = parseFloat(goalAmount);
    if (!g) return null;
    return goalType === 'value' ? g : g * currentPrice;
  }, [mode, goalAmount, goalType, currentPrice]);

  const totalInvestedAtHorizon = projection
    ? Math.round(projection.monthlyInvested * horizonMonths * 100) / 100
    : 0;

  const inputCls = 'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500 w-full';
  const modeBtn  = (active: boolean) =>
    `flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${active
      ? 'bg-brand-600 text-white'
      : 'text-gray-400 hover:text-gray-200 bg-gray-800 border border-gray-700'}`;

  const canCompute = !!currentPrice && !!assetId && parseFloat(amountUsd) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Projection Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">
          See where your DCA strategy takes you — across four growth scenarios.
        </p>
      </div>

      {/* Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
        {/* Asset + amount + frequency */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Asset</label>
            <select value={assetId} onChange={e => setAssetId(e.target.value)} className={inputCls}>
              <option value="">Select asset…</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.symbol} — {a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Buy amount (USD)</label>
            <input
              type="number" min="1" step="any"
              value={amountUsd}
              onChange={e => setAmountUsd(e.target.value)}
              placeholder="200"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Frequency</label>
            <select value={frequency} onChange={e => setFrequency(e.target.value)} className={inputCls}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Bi-weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
        </div>

        {/* Current price + existing holdings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Current price (USD)
              {fetchedPrice && !manualPrice && (
                <span className="ml-2 text-gray-600">auto: {format(fetchedPrice)}</span>
              )}
            </label>
            <input
              type="number" min="0" step="any"
              value={manualPrice}
              onChange={e => setManualPrice(e.target.value)}
              placeholder={fetchedPrice ? String(fetchedPrice) : 'e.g. 65000'}
              className={inputCls}
            />
            {!fetchedPrice && !manualPrice && assetId && (
              <p className="text-xs text-amber-500/80 mt-1">Price not cached — enter manually or refresh prices.</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              I already hold
              <span className="text-gray-600 ml-1">(optional)</span>
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number" min="0" step="any"
                value={existingQty}
                onChange={e => setExistingQty(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
              {selectedAsset && (
                <span className="text-sm text-gray-500 shrink-0 font-mono">{selectedAsset.symbol}</span>
              )}
            </div>
          </div>
        </div>

        {/* Mode toggle */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Mode</label>
          <div className="flex gap-2">
            <button className={modeBtn(mode === 'horizon')} onClick={() => setMode('horizon')}>
              Project over time
            </button>
            <button className={modeBtn(mode === 'goal')} onClick={() => setMode('goal')}>
              Reach a goal
            </button>
          </div>
        </div>

        {/* Mode-specific inputs */}
        {mode === 'horizon' && (
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Time horizon</label>
            <div className="flex gap-2">
              <input
                type="number" min="1" step="1"
                value={horizonInput}
                onChange={e => setHorizonInput(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500 w-32"
              />
              <select
                value={horizonUnit}
                onChange={e => setHorizonUnit(e.target.value as 'months' | 'years')}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
              >
                <option value="months">months</option>
                <option value="years">years</option>
              </select>
            </div>
          </div>
        )}

        {mode === 'goal' && (
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">My goal</label>
            <div className="flex gap-2">
              <select
                value={goalType}
                onChange={e => setGoalType(e.target.value as 'quantity' | 'value')}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500 shrink-0"
              >
                <option value="value">$ value</option>
                <option value="quantity">{selectedAsset?.symbol || 'qty'}</option>
              </select>
              <input
                type="number" min="0" step="any"
                value={goalAmount}
                onChange={e => setGoalAmount(e.target.value)}
                placeholder={goalType === 'value' ? 'e.g. 100000' : 'e.g. 1'}
                className={inputCls}
              />
            </div>
          </div>
        )}
      </div>

      {/* Growth scenario rates */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          Growth scenarios
          <span className="text-gray-600 font-normal ml-2">— adjust to match your outlook</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {SCENARIOS.map(s => (
            <ScenarioInput
              key={s.key}
              scenario={s}
              rate={rates[s.key]}
              onChange={v => setRates(r => ({ ...r, [s.key]: v }))}
            />
          ))}
        </div>
      </div>

      {/* Results */}
      {canCompute && projection && (
        <>
          {/* Goal mode: timeline to goal */}
          {mode === 'goal' && goalAmount && parseFloat(goalAmount) > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 mb-3">
                Time to reach{' '}
                <span className="text-gray-200">
                  {goalType === 'value'
                    ? format(parseFloat(goalAmount))
                    : `${goalAmount} ${selectedAsset?.symbol}`}
                </span>
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {SCENARIOS.map(s => (
                  <GoalBadge
                    key={s.key}
                    months={goalMonths[s.key]}
                    label={s.label}
                    color={s.color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Horizon mode: final value table */}
          {mode === 'horizon' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-300">
                  Projected outcome after{' '}
                  <span className="text-gray-100">
                    {horizonUnit === 'years' ? `${horizonInput} years` : `${horizonInput} months`}
                  </span>
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Total invested: <span className="text-gray-400 font-mono">{format(totalInvestedAtHorizon)}</span>
                  {' · '}
                  <span className="text-gray-500">{format(projection.monthlyInvested)}/month</span>
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                    {['Scenario', 'Portfolio value', 'Total invested', 'Return'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SCENARIOS.map(s => {
                    const last = chartData[chartData.length - 1];
                    return (
                      <HorizonRow
                        key={s.key}
                        scenario={s}
                        finalValue={last?.[s.key] ?? 0}
                        totalInvested={totalInvestedAtHorizon}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">
              {mode === 'goal' ? 'Portfolio value over time' : `${horizonUnit === 'years' ? horizonInput + '-year' : horizonInput + '-month'} projection`}
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  interval={Math.max(1, Math.floor(chartData.length / 8))}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickFormatter={v =>
                    v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
                    : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}k`
                    : `$${v}`
                  }
                  width={60}
                />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(value: number, name: string) => {
                    const s = SCENARIOS.find(sc => sc.key === name);
                    return [
                      `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                      s?.label ?? name,
                    ];
                  }}
                />
                <Legend
                  formatter={v => SCENARIOS.find(s => s.key === v)?.label ?? v}
                  wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
                />

                {/* Invested line */}
                <Line
                  type="monotone"
                  dataKey="totalInvested"
                  stroke="#6b7280"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  dot={false}
                  name="totalInvested"
                />

                {/* Scenario lines */}
                {SCENARIOS.map(s => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    name={s.key}
                  />
                ))}

                {/* Goal reference line */}
                {goalValueUsd && mode === 'goal' && (
                  <ReferenceLine
                    y={goalValueUsd}
                    stroke="#f59e0b"
                    strokeDasharray="6 3"
                    label={{ value: 'Goal', fill: '#f59e0b', fontSize: 11, position: 'right' }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Empty state */}
      {!canCompute && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-5xl mb-4">🔮</p>
          <p className="text-gray-400 font-medium">Configure your inputs above</p>
          <p className="text-gray-600 text-sm mt-1">
            Pick an asset, set a buy amount, then choose a goal or time horizon.
          </p>
        </div>
      )}
    </div>
  );
}
