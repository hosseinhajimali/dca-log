import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useCreateSellRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { dcaPlanId: string; minProfit: number; maxProfit: number; sellAmount: number; sellAmountType?: 'USD' | 'PCT' }) =>
      api.post('/sell-rules', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dca-plans'] });
      qc.invalidateQueries({ queryKey: ['plan-stats'] });
    },
  });
}

export function useUpdateSellRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; minProfit?: number; maxProfit?: number; sellAmount?: number; sellAmountType?: 'USD' | 'PCT' }) =>
      api.patch(`/sell-rules/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dca-plans'] });
      qc.invalidateQueries({ queryKey: ['plan-stats'] });
    },
  });
}

export function useDeleteSellRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/sell-rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dca-plans'] });
      qc.invalidateQueries({ queryKey: ['plan-stats'] });
    },
  });
}
