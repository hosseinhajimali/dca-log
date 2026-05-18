'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DcaPlan } from '@/types';
import { toast } from '@/lib/toast';

interface AssetRow {
  assetId: string;
  symbol: string;
  color?: string | null;
  amountUsd: string;  // editable string for input
  price: string;
  checked: boolean;
}

interface QuickAddModalProps {
  plan: DcaPlan;
  onClose: () => void;
}

export function QuickAddModal({ plan, onClose }: QuickAddModalProps) {
  const qc = useQueryClient();

  const nextDate = plan.nextPurchaseDate
    ? new Date(plan.nextPurchaseDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const scheduledTime = plan.scheduledTime ?? '08:00';

  const [date, setDate] = useState(nextDate);
  const [time, setTime] = useState(scheduledTime);
  const [exchange, setExchange] = useState('');
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Init rows — use suggestedAllocations if rules fired, else base allocation
  useEffect(() => {
    const hasSuggestion = plan.suggestedAllocations?.length > 0 &&
      plan.suggestedAmount !== plan.amountUsd;

    const initial: AssetRow[] = hasSuggestion
      ? plan.suggestedAllocations.map(sa => ({
          assetId: sa.assetId,
          symbol: sa.symbol,
          color: sa.color,
          amountUsd: String(sa.amount),
          price: '',
          checked: true,
        }))
      : plan.allocations.map(a => ({
          assetId: a.assetId,
          symbol: a.asset.symbol,
          color: a.asset.color,
          amountUsd: String(+(plan.amountUsd * (a.allocationPct / 100)).toFixed(2)),
          price: '',
          checked: true,
        }));

    setRows(initial);

    // Pre-fill prices from cache
    const symbols = initial.map(r => r.symbol).join(',');
    api.get(`/prices?symbols=${symbols}`)
      .then(res => {
        const prices: { symbol: string; priceUsd: number }[] = res.data.data;
        const priceMap = new Map(prices.map(p => [p.symbol, p.priceUsd]));
        setRows(prev => prev.map(r => ({
          ...r,
          price: priceMap.has(r.symbol) ? String(priceMap.get(r.symbol)) : '',
        })));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id]);

  // Escape to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const updateRow = (assetId: string, field: 'price' | 'amountUsd' | 'checked', value: string | boolean) =>
    setRows(prev => prev.map(r => r.assetId === assetId ? { ...r, [field]: value } : r));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const checked = rows.filter(r => r.checked);
    if (checked.length === 0) { setSubmitError('Select at least one asset.'); return; }

    for (const row of checked) {
      const amt = parseFloat(row.amountUsd);
      if (!row.amountUsd || isNaN(amt) || amt <= 0) {
        setSubmitError(`Enter a valid amount for ${row.symbol}.`);
        return;
      }
      const p = parseFloat(row.price);
      if (!row.price || isNaN(p) || p <= 0) {
        setSubmitError(`Enter a valid price for ${row.symbol}.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const purchasedAt = new Date(`${date}T${time}:00`).toISOString();

      for (const row of checked) {
        const price = parseFloat(row.price);
        const amount = parseFloat(row.amountUsd);
        const quantity = +(amount / price);
        await api.post('/transactions', {
          assetId: row.assetId,
          dcaPlanId: plan.id,
          type: 'BUY',
          amountUsd: amount,
          quantity,
          pricePerUnit: price,
          purchasedAt,
          exchange: exchange || undefined,
        });
      }

      await Promise.all([
        qc.invalidateQueries({ queryKey: ['transactions'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
        qc.invalidateQueries({ queryKey: ['dca-plans'] }),
      ]);

      toast(`${checked.length} transaction${checked.length > 1 ? 's' : ''} added`);
      onClose();
    } catch {
      setSubmitError('Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkedCount = rows.filter(r => r.checked).length;
  const isMulti = rows.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-100">Quick Purchase</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {plan.name || plan.allocations.map(a => a.asset.symbol).join(' · ')}
            </p>
          </div>
          <button onClick={onClose}
            className="text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors">×</button>
        </div>

        {/* body */}
        <form id="quick-add-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* asset rows */}
          <div className="space-y-1">
            {/* header */}
            <div className={`grid gap-x-3 items-center text-xs text-gray-600 pb-2 ${isMulti ? 'grid-cols-[16px_auto_1fr_1fr_56px]' : 'grid-cols-[auto_1fr_1fr_56px]'}`}>
              {isMulti && <span />}
              <span>Asset</span>
              <span>Amount (USD)</span>
              <span>Price (USD)</span>
              <span>Qty</span>
            </div>

            {rows.map(row => {
              const price = parseFloat(row.price);
              const amount = parseFloat(row.amountUsd);
              const qty = !isNaN(price) && price > 0 && !isNaN(amount) && amount > 0
                ? (amount / price).toFixed(6).replace(/\.?0+$/, '')
                : '—';

              return (
                <div key={row.assetId}
                  className={`grid gap-x-3 items-center py-2.5 px-2.5 rounded-xl transition-colors ${isMulti ? 'grid-cols-[16px_auto_1fr_1fr_56px]' : 'grid-cols-[auto_1fr_1fr_56px]'} ${
                    row.checked ? 'bg-gray-800/40' : 'opacity-40'
                  }`}
                >
                  {isMulti && (
                    <input
                      type="checkbox"
                      checked={row.checked}
                      onChange={e => updateRow(row.assetId, 'checked', e.target.checked)}
                      className="accent-brand-500 cursor-pointer"
                    />
                  )}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {row.color && (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                    )}
                    <span className="font-mono font-bold text-sm" style={row.color ? { color: row.color } : { color: '#f3f4f6' }}>
                      {row.symbol}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={row.amountUsd}
                    onChange={e => updateRow(row.assetId, 'amountUsd', e.target.value)}
                    disabled={!row.checked}
                    placeholder="0.00"
                    className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500 placeholder-gray-600 disabled:opacity-40 w-full"
                  />
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    value={row.price}
                    onChange={e => updateRow(row.assetId, 'price', e.target.value)}
                    disabled={!row.checked}
                    placeholder="0.00"
                    className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500 placeholder-gray-600 disabled:opacity-40 w-full"
                  />
                  <span className="font-mono text-xs text-gray-400">{qty}</span>
                </div>
              );
            })}
          </div>

          {/* date + time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Date</label>
              <input type="date" value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Time</label>
              <input type="time" value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
                style={{ colorScheme: 'dark' }} />
            </div>
          </div>

          {/* exchange */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Exchange <span className="text-gray-600">(optional)</span>
            </label>
            <input type="text" list="quick-add-exchange-suggestions" value={exchange}
              placeholder="Binance, Coinbase..."
              onChange={e => setExchange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500" />
            <datalist id="quick-add-exchange-suggestions">
              {['Binance', 'Coinbase', 'Kraken', 'KuCoin', 'OKX', 'Bybit', 'Bitfinex', 'Gate.io', 'MEXC', 'Huobi'].map(ex => (
                <option key={ex} value={ex} />
              ))}
            </datalist>
          </div>
        </form>

        {/* footer */}
        <div className="px-6 py-4 border-t border-gray-800 shrink-0 space-y-3">
          {submitError && <p className="text-xs text-red-400">{submitError}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              form="quick-add-form"
              disabled={isSubmitting || checkedCount === 0}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {isSubmitting
                ? 'Saving...'
                : checkedCount > 1
                ? `Add ${checkedCount} transactions`
                : 'Add transaction'}
            </button>
            <button type="button" onClick={onClose}
              className="text-gray-400 hover:text-gray-200 text-sm px-4 py-2.5 border border-gray-700 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
