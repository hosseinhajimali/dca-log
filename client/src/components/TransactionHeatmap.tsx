'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { format as formatDate, getDay, startOfYear, addDays } from 'date-fns';
import { useTransactionHeatmap, HeatmapDay } from '@/hooks/useTransactions';
import { useCurrencyFormatter } from '@/lib/format';

// ─── color scale ─────────────────────────────────────────────────────────────
const LEVEL_COLORS = [
  '#d1d5db', // 0 — no transaction (gray-300)
  '#60a5fa', // 1 — brand-400 (low)
  '#3b82f6', // 2 — brand-500
  '#1d4ed8', // 3 — brand-700
  '#1e3a8a', // 4 — brand-900 (high)
];

function getLevel(amount: number, maxAmount: number): number {
  if (amount === 0 || maxAmount === 0) return 0;
  const pct = amount / maxAmount;
  if (pct <= 0.25) return 1;
  if (pct <= 0.5)  return 2;
  if (pct <= 0.75) return 3;
  return 4;
}

// ─── grid builder ─────────────────────────────────────────────────────────────
function buildGrid(year: number, dayMap: Map<string, HeatmapDay>) {
  const jan1 = startOfYear(new Date(year, 0, 1));
  const gridStart = addDays(jan1, -getDay(jan1));
  const columns: (HeatmapDay | null)[][] = [];
  let cursor = gridStart;

  for (let w = 0; w < 53; w++) {
    const col: (HeatmapDay | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = formatDate(cursor, 'yyyy-MM-dd');
      const inYear = cursor.getFullYear() === year;
      col.push(inYear ? (dayMap.get(dateStr) ?? { date: dateStr, totalAmount: 0, assets: [] }) : null);
      cursor = addDays(cursor, 1);
    }
    columns.push(col);
    if (cursor.getFullYear() > year && w >= 51) break;
  }
  return columns;
}

function buildMonthLabels(year: number, columns: (HeatmapDay | null)[][]) {
  const labels: { month: string; col: number }[] = [];
  let lastMonth = -1;
  columns.forEach((col, ci) => {
    const firstCell = col.find(c => c !== null);
    if (!firstCell) return;
    const d = new Date(firstCell.date + 'T00:00:00');
    const m = d.getMonth();
    if (m !== lastMonth) {
      labels.push({ month: formatDate(d, 'MMM'), col: ci });
      lastMonth = m;
    }
  });
  return labels;
}

// ─── tooltip ─────────────────────────────────────────────────────────────────
interface TooltipData {
  day: HeatmapDay;
  currentPrices: Record<string, number>;
  x: number;
  y: number;
}

function HeatmapTooltip({ data, formatAmount }: { data: TooltipData; formatAmount: (n: number) => string }) {
  const { day, currentPrices, x, y } = data;
  const d = new Date(day.date + 'T00:00:00');
  const dateLabel = formatDate(d, 'EEEE, MMMM d yyyy');
  const totalTx = day.assets.reduce((s, a) => s + a.txCount, 0);

  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-none w-64 rounded-xl bg-gray-900 border border-gray-700 shadow-2xl text-xs overflow-hidden"
      style={{ left: x, top: y - 8, transform: 'translate(-50%, -100%)' }}
    >
      <div className="px-3 py-2.5 border-b border-gray-800">
        <p className="text-gray-400">{dateLabel}</p>
        <p className="text-gray-100 font-semibold text-sm mt-0.5">{formatAmount(day.totalAmount)}</p>
        {day.assets.length > 1 && (
          <p className="text-gray-500 mt-0.5">{day.assets.length} assets. {totalTx} transaction{totalTx !== 1 ? 's' : ''}</p>
        )}
      </div>

      <div className="divide-y divide-gray-800">
        {day.assets.map((a) => {
          const currentPrice = currentPrices[a.symbol] ?? null;
          const priceDiff = currentPrice && a.avgPrice > 0
            ? ((currentPrice - a.avgPrice) / a.avgPrice) * 100
            : null;
          const isUp = priceDiff !== null && priceDiff >= 0;

          return (
            <div key={a.assetId} className="px-3 py-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold" style={a.color ? { color: a.color } : { color: '#f3f4f6' }}>
                  {a.symbol}
                </span>
                <div className="flex items-center gap-1">
                  {a.hasPlanned && <span className="px-1.5 py-0.5 rounded text-[10px] bg-brand-500/15 text-brand-300">planned</span>}
                  {a.hasManual  && <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-700 text-gray-400">manual</span>}
                </div>
              </div>
              <div className="flex items-center justify-between text-gray-400">
                <span>{a.quantity < 1 ? a.quantity.toPrecision(4) : a.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })} {a.symbol}</span>
                <span>@ {formatAmount(a.avgPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{a.txCount > 1 ? `${a.txCount} buys` : '1 buy'}</span>
                <span className="text-gray-200 font-medium">{formatAmount(a.amountUsd)}</span>
              </div>
              {priceDiff !== null && (
                <div className="flex items-center justify-between pt-0.5 border-t border-gray-800/60">
                  <span className="text-gray-500">Now {formatAmount(currentPrice!)}</span>
                  <span className={`font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {isUp ? '+' : ''}{priceDiff.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
    </div>,
    document.body
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function TransactionHeatmap({ hideFilters = false }: { hideFilters?: boolean }) {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const { format: formatAmount } = useCurrencyFormatter();

  const { data, isLoading } = useTransactionHeatmap(year, selectedAssets.length > 0 ? selectedAssets : undefined);

  const toggleAsset = useCallback((id: string) => {
    setSelectedAssets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="h-28 flex items-center justify-center text-gray-600 text-sm animate-pulse">Loading activity...</div>
      </div>
    );
  }

  if (!data) return null;

  const dayMap = new Map(data.days.map(d => [d.date, d]));
  const maxAmount = Math.max(...data.days.map(d => d.totalAmount), 0);
  const columns = buildGrid(year, dayMap);
  const monthLabels = buildMonthLabels(year, columns);
  const totalInYear = data.days.reduce((s, d) => s + d.totalAmount, 0);
  const activeDays = data.days.filter(d => d.totalAmount > 0).length;

  const CELL = 11;
  const GAP  = 2;
  const STEP = CELL + GAP;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">

      {/* header: title on left, year selector + legend on right */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-300">Transaction Activity</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {activeDays} active day{activeDays !== 1 ? 's' : ''}. {formatAmount(totalInYear)} invested in {year}
          </p>
        </div>

        <div>
          {/* legend */}
          <div className="flex items-center justify-end gap-2 mb-2">
            <div className="flex items-center gap-1">
              <span className="w-[11px] h-[11px] rounded-sm inline-block" style={{ backgroundColor: LEVEL_COLORS[0] }} />
              <span className="text-[10px] text-gray-500">No purchase</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500">Low</span>
              {LEVEL_COLORS.slice(1).map((color, i) => (
                <span key={i} className="w-[11px] h-[11px] rounded-sm inline-block" style={{ backgroundColor: color }} />
              ))}
              <span className="text-[10px] text-gray-500">High</span>
            </div>
          </div>

          {hideFilters ? (
            <div className="flex justify-end">
              <a
                href="/app/transactions"
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
              >
                View transactions →
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-4 flex-wrap">
              {/* asset filter chips */}
              {data.availableAssets.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    onClick={() => setSelectedAssets([])}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      selectedAssets.length === 0
                        ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                        : 'border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    All
                  </button>
                  {data.availableAssets.map(a => {
                    const active = selectedAssets.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleAsset(a.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors font-mono font-semibold ${
                          active
                            ? 'border-brand-500/50 bg-brand-500/10'
                            : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                        }`}
                        style={active && a.color ? { color: a.color } : undefined}
                      >
                        {a.symbol}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* year selector */}
              {data.availableYears.length > 1 && (
                <div className="flex items-center gap-1">
                  {data.availableYears.map(y => (
                    <button
                      key={y}
                      onClick={() => setYear(y)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                        y === year
                          ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                          : 'border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: columns.length * STEP + 24 }}>
          <div className="relative h-4 pl-6 mb-1">
            {monthLabels.map(({ month, col }, i) => (
              <span
                key={i}
                className="text-[10px] text-gray-500 absolute"
                style={{ left: col * STEP + 24 }}
              >
                {month}
              </span>
            ))}
          </div>

          <div className="flex gap-[2px]">
            <div className="flex flex-col gap-[2px] mr-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={i} className="text-[9px] text-gray-600 h-[11px] flex items-center">
                  {i % 2 === 1 ? d : ''}
                </span>
              ))}
            </div>

            {columns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[2px]">
                {col.map((cell, di) => {
                  if (cell === null) return <span key={di} style={{ width: CELL, height: CELL }} />;
                  const level = getLevel(cell.totalAmount, maxAmount);
                  const hasData = cell.totalAmount > 0;
                  return (
                    <span
                      key={di}
                      style={{ width: CELL, height: CELL, backgroundColor: LEVEL_COLORS[level] }}
                      className={`rounded-sm inline-block ${hasData ? 'cursor-pointer hover:ring-1 hover:ring-brand-400 hover:ring-offset-1 hover:ring-offset-gray-900' : ''}`}
                      onMouseEnter={(e) => {
                        if (!hasData) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ day: cell, currentPrices: data.currentPrices, x: rect.left + rect.width / 2, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {tooltip && <HeatmapTooltip data={tooltip} formatAmount={formatAmount} />}
    </div>
  );
}
