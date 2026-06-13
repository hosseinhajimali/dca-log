import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AppNotification {
  id: string;
  type: 'DCA_REMINDER' | 'SELL_RULE_MET' | 'BUYING_RULE_MET' | 'NEW_FEEDBACK' | 'ANNOUNCEMENT';
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, string> | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

export function useNotifications() {
  return useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<{ data: NotificationsResponse }>('/notifications');
      return res.data.data;
    },
    // No timed polling: an open tab no longer pings the database on a timer,
    // so the Neon compute can stay suspended while idle. Instead we refetch
    // when the user returns to the app. staleTime avoids refetching on every
    // rapid focus change.
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useClearAllNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/notifications/clear-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
