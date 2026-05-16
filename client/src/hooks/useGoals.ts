import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Goal, GoalType } from '@/types';

const QUERY_KEY = ['goals'];

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<{ data: Goal[] }>('/goals');
      return res.data.data;
    },
    staleTime: 60_000,
  });
}

export interface GoalPayload {
  type:                GoalType;
  name:                string;
  notes?:              string;
  assetId?:            string;
  targetQty?:          number;
  targetValue?:        number;
  targetMonthlyAmount?: number;
  startDate?:          string;
  deadline?:           string;
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GoalPayload) => api.post('/goals', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<GoalPayload> & { id: string; isCompleted?: boolean }) =>
      api.put(`/goals/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
