import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Transaction, ApiResponse } from '@/types';

export type TxSortBy = 'purchasedAt' | 'amountUsd' | 'quantity' | 'pricePerUnit';
export type TxSortOrder = 'asc' | 'desc';

interface TxFilters {
  assetId?: string;
  from?: string;
  to?: string;
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
