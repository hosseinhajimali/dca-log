import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Transaction, ApiResponse } from '@/types';

export type TxSortBy = 'purchasedAt' | 'amountUsd' | 'quantity' | 'pricePerUnit';
export type TxSortOrder = 'asc' | 'desc';

interface TxFilters {
  assetId?: string;
  from?: string;
  to?: string;
  type?: 'BUY' | 'SELL';
  page?: number;
  limit?: number;
  sortBy?: TxSortBy;
  sortOrder?: TxSortOrder;
}

export function useTransactions(filters: TxFilters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Transaction[]>>('/transactions', { params: filters });
      return { data: res.data.data, meta: res.data.meta };
    },
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Transaction>) => {
      const res = await api.post<ApiResponse<Transaction>>('/transactions', data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Transaction> }) => {
      const res = await api.patch<ApiResponse<Transaction>>(`/transactions/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/transactions/${id}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export interface HeatmapAsset {
  assetId: string;
  symbol: string;
  name: string;
  color: string | null;
  quantity: number;
  amountUsd: number;
  avgPrice: number;
  txCount: number;
  hasPlanned: boolean;
  hasManual: boolean;
}

export interface HeatmapDay {
  date: string; // "YYYY-MM-DD"
  totalAmount: number;
  assets: HeatmapAsset[];
}

export interface HeatmapData {
  days: HeatmapDay[];
  currentPrices: Record<string, number>;
  availableAssets: { id: string; symbol: string; name: string; color: string | null }[];
  availableYears: number[];
  year: number;
}

export function useTransactionHeatmap(year?: number, assetIds?: string[]) {
  return useQuery<HeatmapData>({
    queryKey: ['transactions', 'heatmap', year, assetIds],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (year) params.year = String(year);
      if (assetIds && assetIds.length > 0) params.assetIds = assetIds.join(',');
      const res = await api.get<{ data: HeatmapData }>('/transactions/heatmap', { params });
      return res.data.data;
    },
    staleTime: 2 * 60_000,
  });
}
