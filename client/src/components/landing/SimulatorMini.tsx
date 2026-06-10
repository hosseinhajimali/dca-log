'use client';

import { useMemo, useState } from 'react';

// Approximate yearly average prices in USD, for illustration only.
const PRICES: Record<string, Record<number, number>> = {
  BTC: {
    2015: 272, 2016: 568, 2017: 3952, 2018: 7532, 2019: 7346,
    2020: 11116, 2021: 47437, 2022: 28204, 2023: 28862, 2024: 60000, 2025: 95000,
  },
  ETH: {
    2016: 11, 2017: 223, 2018: 477, 2019: 180,
    2020: 308, 2021: 3000, 2022: 1777, 2023: 1861, 2024: 3100, 2025: 3300,
  },
};

const CURRENT_PRICE: Record<string, number> = { BTC: 104212, ETH: 3891 };
const CURRENT_YEAR = 2026;
const MONTHS_THIS_YEAR = 6;

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500';

export function SimulatorMini() {
  const [asset, setAsset] = useState<'BTC' | 'ETH'>('BTC');
  const [amount, setAmount] = useState(100);
  const [startYear, setStartYear] = useState(2020);

  const years = Object.keys(PRICES[asset]).map(Number);

  const result = useMemo(() => {
    const safeAmount = Math.min(Math.max(amount || 0, 1), 100000);
    let units = 0;
    let months = 0;
    for (let y = startYear; y < CURRENT_YEAR; y++) {
      const price = PRICES[asset][y];
      if (!price) continue;
      units += (safeAmount * 12) / price;
      months += 12;
    }
    units += (safeAmount * MONTHS_THIS_YEAR) / CURRENT_PRICE[asset];
    months += MONTHS_THIS_YEAR;
    const invested = months * safeAmount;
    const value = units * CURRENT_PRICE[asset];
    const returnPct = invested > 0 ? ((value - invested) / invested) * 100 : 0;
    return { invested, value, returnPct };
  }, [asset, amount, startYear]);

  const up = result.returnPct >= 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sm:p-6">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Try it · no signup needed</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div>
          <label htmlFor="sim-asset" className="block text-xs text-gray-500 mb-1.5">Asset</label>
          <select
            id="sim-asset"
            className={inputCls}
            value={asset}
            onChange={(e) => {
              const next = e.target.value as 'BTC' | 'ETH';
              setAsset(next);
              if (!PRICES[next][startYear]) setStartYear(Math.min(...Object.keys(PRICES[next]).map(Number)));
            }}
          >
            <option value="BTC">BTC · Bitcoin</option>
            <option value="ETH">ETH · Ethereum</option>
          </select>
        </div>
        <div>
          <label htmlFor="sim-amount" className="block text-xs text-gray-500 mb-1.5">Monthly amount (USD)</label>
          <input
            id="sim-amount"
            type="number"
            min={1}
            max={100000}
            className={inputCls}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="sim-year" className="block text-xs text-gray-500 mb-1.5">Starting in</label>
          <select id="sim-year" className={inputCls} value={startYear} onChange={(e) => setStartYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Invested</p>
          <p className="text-xl font-semibold text-gray-100 tracking-tight tabular">{fmt.format(result.invested)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Value today</p>
          <p className="text-xl font-semibold text-gray-100 tracking-tight tabular">{fmt.format(result.value)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Return</p>
          <p className={`text-xl font-semibold tracking-tight tabular ${up ? 'text-green-400' : 'text-red-400'}`}>
            {up ? '+' : ''}{result.returnPct.toFixed(1)}%
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-600">Based on yearly average prices, for illustration only. The full simulator uses daily historical data.</p>
    </div>
  );
}
