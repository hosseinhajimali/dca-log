import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DcaPlan, BuyingRuleSet, ApiResponse, AssetStats } from '@/types';

export interface PlanStats {
  plan: DcaPlan;
  portfolio: { totalInvested: number; totalCurrentValue: number; totalPnl: number; totalPnlPercent: number };
  assetStats: (AssetStats & { allocationPct: number })[];
  monthlyData: { month: string; invested: number }[];
  recentTransactions: import('@/types').Transaction[];
  lastUpdated: string;
}

export function usePlanStats(id: string) {
  return useQuery<PlanStats>({
    queryKey: ['plan-stats', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PlanStats>>(`/dca-plans/${id}/stats`);
      return res.data.data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dca-plans'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateDcaPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DcaPlan> }) => {
      const res = await api.patch<ApiResponse<DcaPlan>>(`/dca-plans/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dca-plans'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['plan-stats'] });
    },
  });
}

export function useDeleteDcaPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/dca-plans/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dca-plans'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// ─── Buying Rules ─────────────────────────────────────────────────────────────
export function useCreateBuyingRule(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { minDrawdown: number; maxDrawdown: number; buyAmount: number }) => {
      const res = await api.post<ApiResponse<BuyingRuleSet>>(`/dca-plans/${planId}/rules`, data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dca-plans'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteBuyingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ruleId: string) => {
      await api.delete(`/buying-rules/${ruleId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dca-plans'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
