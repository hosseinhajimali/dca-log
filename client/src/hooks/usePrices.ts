import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PriceCache } from '@/types';

export function useAssetPrice(symbol: string | null) {
  return useQuery<number | null>({
    queryKey: ['price', symbol],
    queryFn: async () => {
      const res = await api.get<{ data: PriceCache[] }>(`/prices?symbols=${symbol}`);
      return res.data.data[0]?.priceUsd ?? null;
    },
    enabled: !!symbol,
    staleTime: 5 * 60_000,
  });
}

// Fetch prices for many symbols at once. Returns a { SYMBOL: priceUsd } map.
export function useAssetPrices(symbols: string[]) {
  const list = [...new Set(symbols.map((s) => s.toUpperCase()))].sort();
  return useQuery<Record<string, number>>({
    queryKey: ['prices', list],
    queryFn: async () => {
      const res = await api.get<{ data: PriceCache[] }>(`/prices?symbols=${list.join(',')}`);
      return Object.fromEntries(res.data.data.map((p) => [p.symbol.toUpperCase(), p.priceUsd]));
    },
    enabled: list.length > 0,
    staleTime: 5 * 60_000,
  });
}
