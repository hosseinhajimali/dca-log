import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DcaPlan, BuyingRule, ApiResponse } from '@/types';

export function useDcaPlans() {
  return useQuery({
    queryKey: ['dca-plans'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DcaPlan[]>>('/dca-plans');
      return res.data.data;
    },
  });
}

export function useCreateDcaPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<DcaPlan>) => {
      const res = await api.post<ApiResponse<DcaPlan>>('/dca-plans', data);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dca-plans'] }),
  });
}

export function useUpdateDcaPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DcaPlan> }) => {
      const res = await api.patch<ApiResponse<DcaPlan>>(`/dca-plans/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dca-plans'] }),
  });
}

export function useDeleteDcaPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/dca-plans/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dca-plans'] }),
  });
}

// ─── Buying Rules ─────────────────────────────────────────────────────────────
export function useCreateBuyingRule(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { minDrawdown: number; maxDrawdown: number; buyAmount: number }) => {
      const res = await api.post<ApiResponse<BuyingRule>>(`/dca-plans/${planId}/rules`, data);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dca-plans'] }),
  });
}

export function useDeleteBuyingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ruleId: string) => {
      await api.delete(`/buying-rules/${ruleId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dca-plans'] }),
  });
}
