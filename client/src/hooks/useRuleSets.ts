import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BuyingRuleSet, SellRuleSet, ApiResponse } from '@/types';

// ─── Buying Rule Sets ─────────────────────────────────────────────────────────

export function useBuyingRuleSets() {
  return useQuery({
    queryKey: ['buying-rule-sets'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<BuyingRuleSet[]>>('/rule-sets/buying');
      return res.data.data;
    },
  });
}

export function useCreateBuyingRuleSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<BuyingRuleSet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      const res = await api.post<ApiResponse<BuyingRuleSet>>('/rule-sets/buying', data);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buying-rule-sets'] }),
  });
}

export function useUpdateBuyingRuleSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<BuyingRuleSet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> }) => {
      const res = await api.patch<ApiResponse<BuyingRuleSet>>(`/rule-sets/buying/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buying-rule-sets'] });
      qc.invalidateQueries({ queryKey: ['dca-plans'] });
    },
  });
}

export function useDeleteBuyingRuleSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/rule-sets/buying/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buying-rule-sets'] });
      qc.invalidateQueries({ queryKey: ['dca-plans'] });
    },
  });
}

// ─── Sell Rule Sets ───────────────────────────────────────────────────────────

export function useSellRuleSets() {
  return useQuery({
    queryKey: ['sell-rule-sets'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SellRuleSet[]>>('/rule-sets/selling');
      return res.data.data;
    },
  });
}

export function useCreateSellRuleSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<SellRuleSet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      const res = await api.post<ApiResponse<SellRuleSet>>('/rule-sets/selling', data);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sell-rule-sets'] }),
  });
}

export function useUpdateSellRuleSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<SellRuleSet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> }) => {
      const res = await api.patch<ApiResponse<SellRuleSet>>(`/rule-sets/selling/${id}`, data);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sell-rule-sets'] });
      qc.invalidateQueries({ queryKey: ['dca-plans'] });
    },
  });
}

export function useDeleteSellRuleSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/rule-sets/selling/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sell-rule-sets'] });
      qc.invalidateQueries({ queryKey: ['dca-plans'] });
    },
  });
}

// ─── Plan assignments ─────────────────────────────────────────────────────────

export function useAssignBuyingRuleSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, ruleSetId, isActive }: { planId: string; ruleSetId: string; isActive: boolean }) => {
      await api.post(`/rule-sets/buying/assign/${planId}`, { ruleSetId, isActive });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dca-plans'] }),
  });
}

export function useUnassignBuyingRuleSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, ruleSetId }: { planId: string; ruleSetId: string }) => {
      await api.delete(`/rule-sets/buying/assign/${planId}/${ruleSetId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dca-plans'] }),
  });
}

export function useAssignSellRuleSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, ruleSetId, isActive }: { planId: string; ruleSetId: string; isActive: boolean }) => {
      await api.post(`/rule-sets/selling/assign/${planId}`, { ruleSetId, isActive });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dca-plans'] }),
  });
}

export function useUnassignSellRuleSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, ruleSetId }: { planId: string; ruleSetId: string }) => {
      await api.delete(`/rule-sets/selling/assign/${planId}/${ruleSetId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dca-plans'] }),
  });
}
