import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BacktestUnavailableReason = 'NOT_CRYPTO' | 'NOT_LISTED' | 'PROVIDER_DOWN';

export interface BacktestAvailability {
  available: boolean;
  reason?: BacktestUnavailableReason;
  assetType?: string;
  pair?: string;
  dataStartDate?: string; // YYYY-MM-DD
}

export interface BacktestParams {
  assetId:      string;
  ruleSetId:    string;
  startDate:    string;   // YYYY-MM-DD
  amountUsd:    number;
  frequency:    string;
  endDate?:     string;
  intervalDays?: number;
}

export interface BacktestSideSummary {
  totalInvested: number;
  totalQuantity: number;
  averageBuyPrice: number;
  finalValue: number;
  roiPct: number;
  buyCount: number;
}

export interface BacktestChartPoint {
  date: string;
  strategyValue: number;
  controlValue: number;
  strategyInvested: number;
  controlInvested: number;
  price: number;
  multiplier: number;
}

export interface BacktestBuy {
  date: string;
  price: number;
  multiplier: number;
  amountUsd: number;
  quantity: number;
  drawdownPct: number;
}

export interface BacktestResult {
  asset:   { id: string; symbol: string; name: string; color?: string | null };
  ruleSet: { id: string; label: string; strategyType: string };
  params:  { startDate: string; endDate: string | null; amountUsd: number; frequency: string; intervalDays: number | null };
  strategy: BacktestSideSummary;
  control: BacktestSideSummary;
  comparison: {
    deltaFinalValueUsd: number;
    deltaFinalValuePct: number;
    deltaAverageBuyPrice: number;
    deltaTotalInvested: number;
  };
  buys: BacktestBuy[];
  totalBuyCount: number;
  chartData: BacktestChartPoint[];
  skippedDates: number;
  dataStartDate: string;
  requestedStartDate: string;
  clamped: boolean;
}

/** Error shape thrown by useBacktest, carries the server's error code. */
export interface BacktestError {
  code: string;     // NOT_LISTED | PROVIDER_DOWN | NOT_CRYPTO | EMPTY_RULE_SET | NO_DATA_IN_RANGE | UNKNOWN
  message: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useBacktestAvailability(assetId: string | null) {
  return useQuery<BacktestAvailability>({
    queryKey: ['backtest-availability', assetId],
    queryFn: async () => {
      const res = await api.get('/backtest/availability', { params: { assetId } });
      return res.data.data as BacktestAvailability;
    },
    enabled: !!assetId,
    staleTime: 60 * 60_000, // availability rarely changes
    retry: false,
  });
}

export function useBacktest(params: BacktestParams | null) {
  return useQuery<BacktestResult, BacktestError>({
    queryKey: ['backtest', params],
    queryFn: async () => {
      try {
        const res = await api.get('/backtest', { params });
        return res.data.data as BacktestResult;
      } catch (e) {
        if (isAxiosError(e) && e.response?.data) {
          const data = e.response.data as { code?: string; error?: string };
          throw { code: data.code ?? 'UNKNOWN', message: data.error ?? 'Something went wrong.' } as BacktestError;
        }
        throw { code: 'UNKNOWN', message: 'Something went wrong.' } as BacktestError;
      }
    },
    enabled: !!params,
    staleTime: 5 * 60_000, // historical data changes rarely
    retry: false,
  });
}
