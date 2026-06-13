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
    // Refetch when the user returns to the app rather than on a timer, so an
    // idle open tab does not keep the Neon database awake. staleTime keeps it
    // from refetching on every rapid focus change.
    refetchOnWindowFocus: true,
    staleTime: 5 * 60_000,
  });
}
