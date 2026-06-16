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

// Turn a pasted/typed value like "$83,500.36" or "83.500,36" into a plain
// decimal string ("83500.36"). Strips currency symbols and spaces, then works
// out which separator is the decimal point.
export function normalizeNumeric(raw: string): string {
  let s = (raw ?? '').toString().trim().replace(/[^0-9.,-]/g, '');
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    // Whichever separator comes last is the decimal one.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(/,/g, '.'); // comma decimal (EU)
    } else {
      s = s.replace(/,/g, ''); // dot decimal (US): commas are thousands
    }
  } else if (hasComma) {
    const parts = s.split(',');
    // A single comma not grouping 3 digits is a decimal ("83,5"); otherwise
    // treat commas as thousands separators ("83,500").
    if (parts.length === 2 && parts[1].length !== 3) {
      s = parts[0] + '.' + parts[1];
    } else {
      s = s.replace(/,/g, '');
    }
  }
  return s;
}

// parseFloat that first normalizes formatted/pasted numeric strings.
export function parseNum(s: string): number {
  return parseFloat(normalizeNumeric(s));
}
