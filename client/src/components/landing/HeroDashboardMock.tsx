'use client';

import { useEffect, useRef, useState } from 'react';
import { StatCard } from '@/components/ui/StatCard';

const ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin',  color: '#f7931a', avgBuy: '$67,412', holdings: '0.2841', value: '$29,606.62', pnl: '+54.6%', up: true },
  { symbol: 'ETH', name: 'Ethereum', color: '#627eea', avgBuy: '$4,102',  holdings: '1.8520', value: '$7,206.13',  pnl: '-5.1%',  up: false },
  { symbol: 'XAU', name: 'Gold',     color: '#d4af37', avgBuy: '$2,310',  holdings: '1.4000', value: '$3,922.10',  pnl: '+21.3%', up: true },
];

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function HeroDashboardMock() {
  const [pnl, setPnl] = useState(7347.12);
  const [flash, setFlash] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced.current) return;
    const id = setInterval(() => {
      setPnl((v) => +(v + (Math.random() * 6 - 2.4)).toFixed(2));
      setFlash(true);
      setTimeout(() => setFlash(false), 400);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-4 sm:p-6 bg-gray-950" aria-hidden="true">
      <p className="text-sm font-semibold text-gray-100 mb-0.5">Portfolio Overview</p>
      <p className="text-xs text-gray-500 mb-4">3 active plans</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <StatCard label="Total Invested" value="$24,500.00" />
        <StatCard label="Current Value" value="$40,734.85" />
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total P&L</p>
          <p className={`text-2xl font-semibold mt-1.5 tracking-tight tabular transition-colors duration-300 ${flash ? 'text-green-300' : 'text-green-400'}`}>
            +{fmt.format(pnl)}
          </p>
          <p className="text-sm mt-1 font-medium text-green-400">+29.9%</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
                <th className="text-left font-medium px-4 py-2.5">Asset</th>
                <th className="text-right font-medium px-4 py-2.5">Avg buy</th>
                <th className="text-right font-medium px-4 py-2.5 hidden sm:table-cell">Holdings</th>
                <th className="text-right font-medium px-4 py-2.5">Value</th>
                <th className="text-right font-medium px-4 py-2.5">P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {ASSETS.map((a) => (
                <tr key={a.symbol} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="font-mono font-bold" style={{ color: a.color }}>{a.symbol}</span>
                    <span className="text-gray-500 ml-2 hidden sm:inline">{a.name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-300">{a.avgBuy}</td>
                  <td className="px-4 py-2.5 text-right text-gray-300 hidden sm:table-cell">{a.holdings}</td>
                  <td className="px-4 py-2.5 text-right text-gray-100">{a.value}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${a.up ? 'text-green-400' : 'text-red-400'}`}>{a.pnl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
