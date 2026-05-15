import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface FearGreedEntry {
  value: string;
  value_classification: string;
  timestamp: string;
}

export function useFearGreed() {
  return useQuery<FearGreedEntry[]>({
    queryKey: ['fear-greed'],
    queryFn: async () => {
      const res = await api.get('/prices/fear-greed');
      return res.data.data as FearGreedEntry[];
    },
    staleTime: 60 * 60 * 1000,   // treat fresh for 1 hour
    refetchOnWindowFocus: false,
  });
}
