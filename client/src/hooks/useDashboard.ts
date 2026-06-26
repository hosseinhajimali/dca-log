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
    // Auto-refresh on a timer and when the user returns to the app. The local
    // database is always on, so there's no cost to keeping the dashboard live.
    refetchInterval: 1000 * 60 * 5, // every 5 min
    refetchOnWindowFocus: true,
    staleTime: 5 * 60_000,
  });
}
