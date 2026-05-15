import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DashboardStats, ApiResponse } from '@/types';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
      return res.data.data;
    },
    refetchInterval: 1000 * 60 * 5, // auto-refresh every 5 min
  });
}
