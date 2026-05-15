import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { queryClient } from '@/lib/queryClient';
import { api } from '@/lib/api';
import { ApiResponse, User } from '@/types';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setAuth } = useStore();
  const ran = useRef(false);

  useEffect(() => {
    // Strict-mode guard — only run once
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (error || !token) {
      navigate('/login?error=' + (error || 'auth_failed'), { replace: true });
      return;
    }

    // Temporarily store so the axios interceptor can attach it
    localStorage.setItem('dca_token', token);

    api
      .get<ApiResponse<User>>('/auth/me')
      .then(res => {
        queryClient.clear();
        setAuth(res.data.data, token);
        navigate('/', { replace: true });
      })
      .catch(() => {
        localStorage.removeItem('dca_token');
        navigate('/login?error=auth_failed', { replace: true });
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3">
      <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Signing you in…</p>
    </div>
  );
}
