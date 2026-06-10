'use client';

import { useState, useEffect } from 'react';
import { useStore, type Theme } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/lib/toast';
import { useUpdateProfile } from '@/hooks/useAuth';
import { useCurrencyFormatter } from '@/lib/format';

const CURRENCIES = ['USD', 'EUR', 'CZK', 'GBP', 'JPY', 'CHF'];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', CZK: 'Kč', GBP: '£', JPY: '¥', CHF: 'Fr',
};

export default function Preferences() {
  const { currency, setCurrency, user, exchangeRates } = useStore();
  const { theme, setTheme } = useTheme();
  const updateProfile = useUpdateProfile();
  const { convert } = useCurrencyFormatter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Monthly disposable income, stored in USD, displayed in user's currency
  const incomeInDisplayCurrency = user?.monthlyDisposableIncome != null ? convert(user.monthlyDisposableIncome) : null;
  const [incomeInput, setIncomeInput] = useState(incomeInDisplayCurrency != null ? String(Math.round(incomeInDisplayCurrency)) : '');
  // Re-sync when currency changes so the displayed value updates
  useEffect(() => {
    if (user?.monthlyDisposableIncome != null) {
      setIncomeInput(String(Math.round(convert(user.monthlyDisposableIncome))));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  const handleSaveIncome = async () => {
    const raw = parseFloat(incomeInput);
    if (incomeInput === '') {
      await updateProfile.mutateAsync({ monthlyDisposableIncome: null });
      toast('Income cleared');
      return;
    }
    if (isNaN(raw) || raw <= 0) { toast('Enter a valid amount', 'error'); return; }
    // Convert from user's display currency back to USD for storage
    const rate = currency === 'USD' ? 1 : (exchangeRates[currency] ?? 1);
    const usdValue = raw / rate;
    await updateProfile.mutateAsync({ monthlyDisposableIncome: usdValue });
    toast('Income saved');
  };

  return (
    <div className="space-y-8">
      {/* Appearance */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">Appearance</h2>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as Theme[]).map(t => (
            <button key={t}
              onClick={() => setTheme(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                mounted && theme === t
                  ? 'bg-brand-600 border-brand-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Currency */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300">Display Currency</h2>
        <p className="text-xs text-gray-500">All values are stored in USD and converted at current exchange rates</p>
        <div className="flex flex-wrap gap-2">
          {CURRENCIES.map(c => (
            <button key={c}
              onClick={() => { setCurrency(c); toast(`Currency set to ${c}`); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                currency === c
                  ? 'bg-brand-600 border-brand-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}>
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Monthly Budget */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-300">Monthly Budget</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Money available each month after fixed expenses. Used to show what percentage of your budget goes to DCA.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none select-none">
              {CURRENCY_SYMBOLS[currency] ?? currency}
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={incomeInput}
              onChange={e => setIncomeInput(e.target.value)}
              placeholder="e.g. 2000"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500"
            />
          </div>
          <button
            onClick={handleSaveIncome}
            disabled={updateProfile.isPending}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {updateProfile.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </section>
    </div>
  );
}
