import { useStore } from '@/store/useStore';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', CZK: 'Kč', GBP: '£', JPY: '¥', CHF: 'Fr',
};

export function useCurrencyFormatter() {
  const { currency, exchangeRates } = useStore();

  const convert = (usdAmount: number): number => {
    if (currency === 'USD') return usdAmount;
    const rate = exchangeRates[currency];
    return rate ? usdAmount * rate : usdAmount;
  };

  const format = (usdAmount: number, opts?: { decimals?: number }): string => {
    const converted = convert(usdAmount);
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
    const decimals = opts?.decimals ?? 2;
    return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  const formatPct = (pct: number): string => `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;

  return { format, formatPct, convert };
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatQuantity(qty: number): string {
  if (qty < 0.01) return qty.toFixed(8);
  if (qty < 1) return qty.toFixed(4);
  return qty.toLocaleString('en-US', { maximumFractionDigits: 4 });
}
