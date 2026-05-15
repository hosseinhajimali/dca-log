import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { queryClient } from '@/lib/queryClient';
import { ApiResponse, AuthResponse, User } from '@/types';

export function useLogin() {
  const { setAuth } = useStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
      return res.data.data;
    },
    onSuccess: ({ user, token }) => {
      queryClient.clear(); // wipe any stale cache before loading new user's data
      setAuth(user, token);
      navigate('/');
    },
  });
}

export function useRegister() {
  const { setAuth } = useStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: { email: string; password: string; name?: string }) => {
      const res = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
      return res.data.data;
    },
    onSuccess: ({ user, token }) => {
      queryClient.clear(); // wipe any stale cache before loading new user's data
      setAuth(user, token);
      navigate('/');
    },
  });
}

export function useUpdateProfile() {
  const { setUser } = useStore();
  return useMutation({
    mutationFn: async (data: { name?: string; avatar?: string | null }) => {
      const res = await api.patch<ApiResponse<User>>('/auth/me', data);
      return res.data.data;
    },
    onSuccess: (user) => setUser(user),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      await api.post('/auth/change-password', data);
    },
  });
}
