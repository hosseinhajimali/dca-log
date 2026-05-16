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
