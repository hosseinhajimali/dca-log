import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SimulationParams {
  assetId:      string;
  startDate:    string;   // YYYY-MM-DD
  amountUsd:    number;
  frequency:    string;
  endDate?:     string;
  intervalDays?: number;
}

export interface SimulationSummary {
  totalInvested:   number;
  currentValue:    number;
  totalReturn:     number;
  totalReturnPct:  number;
  totalQuantity:   number;
  avgCost:         number;
  currentPrice:    number;
  buyCount:        number;
  bestBuyPrice:    number;
  worstBuyPrice:   number;
  firstBuyDate:    string;
  lastBuyDate:     string;
}

export interface SimulationResult {
  asset: { id: string; symbol: string; name: string; color?: string | null };
  params: { startDate: string; amountUsd: number; frequency: string; intervalDays?: number };
  summary: SimulationSummary;
  chartData: { date: string; totalInvested: number; portfolioValue: number; price: number }[];
  recentBuys: { date: string; price: number; quantity: number; amountUsd: number; portfolioValue: number }[];
}

export function useSimulator(params: SimulationParams | null) {
  return useQuery<SimulationResult>({
    queryKey: ['simulator', params],
    queryFn: async () => {
      const res = await api.get('/simulator', { params });
      return res.data.data as SimulationResult;
    },
    enabled: !!params,
    staleTime: 5 * 60_000, // 5 min — historical data changes rarely
    retry: false,
  });
}
