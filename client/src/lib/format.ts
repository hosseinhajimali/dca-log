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
  // Parse only the date part as local time to avoid UTC-offset day shift
  const [datePart] = dateStr.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// scheduledTime is stored on the server as UTC "HH:MM".
// These helpers convert so the UI always shows/accepts the user's local time.
export function utcTimeToLocal(utcTime: string): string {
  const [h, m] = utcTime.split(':').map(Number);
  const d = new Date();
  d.setUTCHours(h, m, 0, 0);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export function localTimeToUtc(localTime: string): string {
  const [h, m] = localTime.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function formatQuantity(qty: number): string {
  if (qty < 0.01) return qty.toFixed(8);
  if (qty < 1) return qty.toFixed(4);
  return qty.toLocaleString('en-US', { maximumFractionDigits: 4 });
}
