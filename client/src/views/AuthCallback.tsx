'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { queryClient } from '@/lib/queryClient';
import { api } from '@/lib/api';
import { ApiResponse, User } from '@/types';

export default function AuthCallback() {
  const router = useRouter();
  const { setAuth } = useStore();
  const ran = useRef(false);

  useEffect(() => {
    // Strict-mode guard, only run once
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (error || !token) {
      router.replace('/login?error=' + (error || 'auth_failed'));
      return;
    }

    // Temporarily store so the axios interceptor can attach it
    localStorage.setItem('dcalog_token', token);

    api
      .get<ApiResponse<User>>('/auth/me')
      .then(res => {
        queryClient.clear();
        setAuth(res.data.data, token);
        router.replace('/app');
      })
      .catch(() => {
        localStorage.removeItem('dcalog_token');
        router.replace('/login?error=auth_failed');
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3">
      <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Signing you in…</p>
    </div>
  );
}
