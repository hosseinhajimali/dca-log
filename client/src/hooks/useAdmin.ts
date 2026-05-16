import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AdminUser {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  currency: string;
  isAdmin: boolean;
  createdAt: string;
  _count: { dcaPlans: number; transactions: number; assets: number };
}

export interface AdminStats {
  userCount: number;
  planCount: number;
  txCount: number;
  assetCount: number;
  unreadFeedback: number;
  totalInvestedUsd: number;
}

export interface AdminFeedback {
  id: string;
  category: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  user?: { id: string; email: string; name?: string | null } | null;
}

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get<{ data: AdminUser[] }>('/admin/users');
      return res.data.data;
    },
  });
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get<{ data: AdminStats }>('/admin/stats');
      return res.data.data;
    },
  });
}

export function useAdminFeedback(category?: string) {
  return useQuery<AdminFeedback[]>({
    queryKey: ['admin-feedback', category],
    queryFn: async () => {
      const params = category ? `?category=${category}` : '';
      const res = await api.get<{ data: AdminFeedback[] }>(`/admin/feedback${params}`);
      return res.data.data;
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useMarkFeedbackRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/admin/feedback/${id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-feedback'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}
