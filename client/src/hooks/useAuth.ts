import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { ApiResponse, AuthResponse } from '@/types';

export function useLogin() {
  const { setAuth } = useStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
      return res.data.data;
    },
    onSuccess: ({ user, token }) => {
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
      setAuth(user, token);
      navigate('/');
    },
  });
}
