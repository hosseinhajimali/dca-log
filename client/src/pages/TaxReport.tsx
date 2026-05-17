import { useState, useMemo } from 'react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Transaction, ApiResponse } from '@/types';
import { useCurrencyFormatter, formatDate, formatQuantity } from '@/lib/format';
import { toCSVString, downloadFile } from '@/lib/exportUtils';

// ─── Data fetching ────────────────────────────────────────────────────────────

function useAllTransactions() {
  return useQuery({
    queryKey: ['transactions-all-tax'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Transaction[]>>('/transactions', {
        params: { limit: 10000, sortBy: 'purchasedAt', sortOrder: 'asc' },
      });
      return res.data.data as Transaction[];
    },
    staleTime: 2 * 60_000,
  });
}

// ─── Cost basis computation ───────────────────────────────────────────────────

interface CostBasisEntry {
  tx:          Transaction;
  runningQty:  number;
  runningCost: number;
  avgCost:     number;
  inYear:      boolean;
}

interface AssetSummary {
  symbol:       string;
  name:         string;
  color:        string | null;
  // within selected year
  qtyBought:    number;
  amountSpent:  number;
  txCount:      number;
  // all-time up to end of year
  totalQty:     number;
  totalCost:    number;
  avgCost:      number;
}

function computeCostBasis(
  transactions: Transaction[],
  year: number,
  assetIds: Set<string> | null,
): { entries: CostBasisEntry[]; summaries: AssetSummary[] } {
  const yearStart = new Date(`${year}-01-01T00:00:00Z`).getTime();
  const yearEnd   = new Date(`${year}-12-31T23:59:59Z`).getTime();

  // Only include txs up to the end of the selected year
  const relevant = transactions.filter(
    (t) => new Date(t.purchasedAt).getTime() <= yearEnd &&
           (!assetIds || assetIds.has(t.assetId)),
  );

  // Running state per asset
  const state: Record<string, { qty: number; cost: number }> = {};
  const entries: CostBasisEntry[] = [];

  for (const tx of relevant) {
    const { assetId } = tx;
    if (!state[assetId]) state[assetId] = { qty: 0, cost: 0 };

    state[assetId].qty  += tx.quantity;
    state[assetId].cost += tx.amountUsd;

    const { qty, cost } = state[assetId];
    const ts = new Date(tx.purchasedAt).getTime();

    entries.push({
      tx,
      runningQty:  qty,
      runningCost: cost,
      avgCost:     qty > 0 ? cost / qty : 0,
      inYear:      ts >= yearStart && ts <= yearEnd,
    });
  }

  // Build per-asset summaries
  const assetMap = new Map<string, AssetSummary>();

  for (const tx of relevant) {
    const sym = tx.asset.symbol;
    if (!assetMap.has(sym)) {
      assetMap.set(sym, {
        symbol: sym, name: tx.asset.name, color: tx.asset.color ?? null,
        qtyBought: 0, amountSpent: 0, txCount: 0,
        totalQty: 0, totalCost: 0, avgCost: 0,
      });
    }
    const s = assetMap.get(sym)!;
    const ts = new Date(tx.purchasedAt).getTime();
    if (ts >= yearStart && ts <= yearEnd) {
      s.qtyBought   += tx.quantity;
      s.amountSpent += tx.amountUsd;
      s.txCount++;
    }
    s.totalQty  += tx.quantity;
    s.totalCost += tx.amountUsd;
    s.avgCost = s.totalQty > 0 ? s.totalCost / s.totalQty : 0;
  }

  return { entries, summaries: Array.from(assetMap.values()) };
}

// ─── CSV builders ─────────────────────────────────────────────────────────────

function buildSummaryCSV(summaries: AssetSummary[], year: number): string {
  const rows = summaries.map((s) => ({
    year,
    asset:             s.symbol,
    asset_name:        s.name,
    qty_bought_in_year:      +s.qtyBought.toFixed(8),
    amount_spent_in_year_usd: +s.amountSpent.toFixed(2),
    transactions_in_year:     s.txCount,
    total_qty_held:      +s.totalQty.toFixed(8),
    total_cost_basis_usd: +s.totalCost.toFixed(2),
    avg_cost_usd:         +s.avgCost.toFixed(2),
    cost_basis_method:   'Average Cost (WAC)',
  }));
  return toCSVString(rows);
}

function buildTransactionsCSV(entries: CostBasisEntry[], _year?: number): string {
  const inYear = entries.filter((e) => e.inYear);
  const rows = inYear.map((e) => ({
    date:                  new Date(e.tx.purchasedAt).toISOString().slice(0, 10),
    asset:                 e.tx.asset.symbol,
    asset_name:            e.tx.asset.name,
    quantity:              +e.tx.quantity.toFixed(8),
    price_per_unit_usd:    +e.tx.pricePerUnit.toFixed(2),
    amount_usd:            +e.tx.amountUsd.toFixed(2),
    running_qty:           +e.runningQty.toFixed(8),
    running_avg_cost_usd:  +e.avgCost.toFixed(2),
    exchange:              e.tx.exchange ?? '',
    notes:                 e.tx.notes ?? '',
  }));
  return toCSVString(rows);
}

function buildKoinlyCSV(entries: CostBasisEntry[]): string {
  // Koinly generic import format
  const inYear = entries.filter((e) => e.inYear);
  const rows = inYear.map((e) => ({
    'Date':                  new Date(e.tx.purchasedAt).toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
    'Sent Amount':           e.tx.amountUsd.toFixed(2),
    'Sent Currency':         'USD',
    'Received Amount':       e.tx.quantity.toFixed(8),
    'Received Currency':     e.tx.asset.symbol,
    'Fee Amount':            '',
    'Fee Currency':          '',
    'Net Worth Amount':      e.tx.amountUsd.toFixed(2),
    'Net Worth Currency':    'USD',
    'Label':                 'buy',
    'Description':           e.tx.notes ?? `DCA buy ${e.tx.asset.symbol}`,
    'TxHash':                '',
  }));
  return toCSVString(rows);
}

// ─── Main page ────────────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear();

export default function TaxReport() {
  const { data: allTx = [], isLoading } = useAllTransactions();
  const { format } = useCurrencyFormatter();

  // Available years derived from data
  const availableYears = useMemo(() => {
    if (!allTx.length) return [currentYear];
    const min = new Date(allTx[0].purchasedAt).getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= min; y--) years.push(y);
    return years;
  }, [allTx]);

  const [selectedYear,   setSelectedYear]   = useState(currentYear);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]); // empty = all

  // Unique assets in data
  const allAssets = useMemo(() => {
    const map = new Map<string, { id: string; symbol: string; name: string; color: string | null }>();
    for (const tx of allTx) {
      if (!map.has(tx.assetId)) {
        map.set(tx.assetId, { id: tx.assetId, symbol: tx.asset.symbol, name: tx.asset.name, color: tx.asset.color ?? null });
      }
    }
    return Array.from(map.values());
  }, [allTx]);

  const assetFilter = selectedAssets.length > 0 ? new Set(selectedAssets) : null;

  const { entries, summaries } = useMemo(
    () => computeCostBasis(allTx, selectedYear, assetFilter),
    [allTx, selectedYear, assetFilter],
  );

  const yearEntries    = entries.filter((e) => e.inYear);
  const totalSpentYear = summaries.reduce((s, a) => s + a.amountSpent, 0);
  const totalTxYear    = summaries.reduce((s, a) => s + a.txCount, 0);

  const toggleAsset = (id: string) =>
    setSelectedAssets((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleExport = (type: 'summary' | 'transactions' | 'koinly') => {
    const base = `tax_${selectedYear}`;
    if (type === 'summary') {
      downloadFile(buildSummaryCSV(summaries, selectedYear), `${base}_summary.csv`, 'text/csv');
    } else if (type === 'transactions') {
      downloadFile(buildTransactionsCSV(entries, selectedYear), `${base}_transactions.csv`, 'text/csv');
    } else {
      downloadFile(buildKoinlyCSV(entries), `${base}_koinly.csv`, 'text/csv');
    }
  };

  const inputCls = 'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-gray-100">Tax Report</h1>
          <InfoTooltip content="Shows a yearly breakdown of your buy activity per asset. Uses the weighted average cost (WAC) method to calculate your cost basis. You get a cost basis summary and a full transaction list for the selected year, both exportable as CSV to hand to your accountant. Note: only purchases are tracked here, no disposal events." />
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Average cost (WAC) method · purchases only · no disposal events tracked
        </p>
      </div>

      {/* Config bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Year */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Tax year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className={inputCls}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Asset filter */}
          <div className="flex-1 min-w-0">
            <label className="block text-xs text-gray-400 mb-1.5">
              Assets
              {selectedAssets.length > 0 && (
                <button
                  onClick={() => setSelectedAssets([])}
                  className="ml-2 text-gray-600 hover:text-gray-400 underline text-xs"
                >
                  clear
                </button>
              )}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allAssets.map((a) => {
                const active = selectedAssets.includes(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggleAsset(a.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-bold transition-colors ${
                      active
                        ? 'border-brand-500 bg-brand-500/10 text-brand-300'
                        : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                    }`}
                    style={active && a.color ? { color: a.color, borderColor: a.color + '66' } : undefined}
                  >
                    {a.symbol}
                  </button>
                );
              })}
              {allAssets.length === 0 && (
                <span className="text-xs text-gray-600">No transactions yet</span>
              )}
            </div>
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-800">
          <span className="text-xs text-gray-500 self-center mr-1">Export:</span>
          <button
            onClick={() => handleExport('summary')}
            disabled={summaries.length === 0}
            className="text-xs font-medium px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Summary CSV
          </button>
          <button
            onClick={() => handleExport('transactions')}
            disabled={yearEntries.length === 0}
            className="text-xs font-medium px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Transactions CSV
          </button>
          <button
            onClick={() => handleExport('koinly')}
            disabled={yearEntries.length === 0}
            className="text-xs font-medium px-4 py-2 rounded-lg border border-brand-500/40 text-brand-400 hover:text-brand-300 hover:border-brand-500/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Koinly CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-500 text-sm animate-pulse">Loading transactions…</div>
      ) : allTx.length === 0 ? (
        <div className="py-16 text-center text-gray-600 text-sm">No transactions found.</div>
      ) : (
        <>
          {/* Year summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: `Transactions in ${selectedYear}`, value: String(totalTxYear) },
              { label: `Total spent in ${selectedYear}`, value: format(totalSpentYear) },
              { label: 'Assets',                         value: String(summaries.length) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-xl font-bold font-mono text-gray-100">{value}</p>
              </div>
            ))}
          </div>

          {/* Per-asset summary table */}
          {summaries.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-300">Cost Basis Summary {selectedYear}</h2>
                <p className="text-xs text-gray-600 mt-0.5">Average cost method · totals are cumulative from all time up to Dec 31, {selectedYear}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                      {[
                        'Asset',
                        `Bought in ${selectedYear}`,
                        `Spent in ${selectedYear}`,
                        'Total qty held',
                        'Total cost basis',
                        'Avg cost / unit',
                        `Txs in ${selectedYear}`,
                      ].map((h) => (
                        <th key={h} className="px-5 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {summaries.map((s) => (
                      <tr key={s.symbol} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-5 py-4">
                          <span
                            className="font-bold font-mono"
                            style={s.color ? { color: s.color } : { color: '#f3f4f6' }}
                          >
                            {s.symbol}
                          </span>
                          <p className="text-xs text-gray-500 mt-0.5">{s.name}</p>
                        </td>
                        <td className="px-5 py-4 font-mono text-gray-300">
                          {s.qtyBought > 0 ? formatQuantity(s.qtyBought) : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-5 py-4 font-mono text-gray-300">
                          {s.amountSpent > 0 ? format(s.amountSpent) : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-5 py-4 font-mono text-gray-400">{formatQuantity(s.totalQty)}</td>
                        <td className="px-5 py-4 font-mono text-gray-400">{format(s.totalCost)}</td>
                        <td className="px-5 py-4 font-mono text-gray-200 font-medium">{format(s.avgCost)}</td>
                        <td className="px-5 py-4 text-gray-500">{s.txCount}</td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals row */}
                  {summaries.length > 1 && (
                    <tfoot>
                      <tr className="border-t border-gray-700 bg-gray-800/30">
                        <td className="px-5 py-3 text-xs text-gray-400 font-medium">Total</td>
                        <td className="px-5 py-3" />
                        <td className="px-5 py-3 font-mono text-sm font-semibold text-gray-200">
                          {format(totalSpentYear)}
                        </td>
                        <td className="px-5 py-3" />
                        <td className="px-5 py-3 font-mono text-sm font-semibold text-gray-200">
                          {format(summaries.reduce((s, a) => s + a.totalCost, 0))}
                        </td>
                        <td className="px-5 py-3" />
                        <td className="px-5 py-3 text-sm font-semibold text-gray-300">{totalTxYear}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* Transaction detail preview */}
          {yearEntries.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-300">Transaction Detail {selectedYear}</h2>
                  <p className="text-xs text-gray-600 mt-0.5">Running average cost computed from all-time purchases</p>
                </div>
                <span className="text-xs text-gray-600">
                  {yearEntries.length} transaction{yearEntries.length !== 1 ? 's' : ''}
                  {yearEntries.length > 20 && ' · showing first 20'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                      {['Date', 'Asset', 'Quantity', 'Price / unit', 'Amount', 'Running avg cost', 'Exchange'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {yearEntries.slice(0, 20).map((e, i) => (
                      <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{formatDate(e.tx.purchasedAt)}</td>
                        <td className="px-5 py-3">
                          <span
                            className="font-mono font-bold"
                            style={e.tx.asset.color ? { color: e.tx.asset.color } : { color: '#f3f4f6' }}
                          >
                            {e.tx.asset.symbol}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-gray-300">{formatQuantity(e.tx.quantity)}</td>
                        <td className="px-5 py-3 font-mono text-gray-400">{format(e.tx.pricePerUnit)}</td>
                        <td className="px-5 py-3 font-mono text-gray-300">{format(e.tx.amountUsd)}</td>
                        <td className="px-5 py-3 font-mono text-brand-400 font-medium">{format(e.avgCost)}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{e.tx.exchange ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {yearEntries.length > 20 && (
                <div className="px-5 py-3 border-t border-gray-800 text-xs text-gray-600 text-center">
                  {yearEntries.length - 20} more rows · export CSV to see all
                </div>
              )}
            </div>
          )}

          {totalTxYear === 0 && !isLoading && (
            <div className="py-10 text-center text-gray-600 text-sm">
              No transactions in {selectedYear}.
            </div>
          )}
        </>
      )}
    </div>
  );
}
