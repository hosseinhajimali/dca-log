import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { queryClient } from '@/lib/queryClient';

export type Theme = 'light' | 'dark' | 'system';

interface AppState {
  user: User | null;
  token: string | null;
  currency: string;
  exchangeRates: Record<string, number>;
  theme: Theme;

  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  setCurrency: (currency: string) => void;
  setExchangeRates: (rates: Record<string, number>) => void;
  setTheme: (theme: Theme) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      currency: 'USD',
      exchangeRates: {},
      theme: 'dark' as Theme,

      setAuth: (user, token) => {
        localStorage.setItem('dcalog_token', token);
        set({ user, token, currency: user.currency || 'USD' });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        localStorage.removeItem('dcalog_token');
        localStorage.removeItem('dcalog_user');
        queryClient.clear(); // clear cached data so next user starts fresh
        set({ user: null, token: null });
      },

      setCurrency: (currency) => set({ currency }),

      setExchangeRates: (rates) => set({ exchangeRates: rates }),

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'dcalog-store',
      partialize: (state) => ({ user: state.user, token: state.token, currency: state.currency, theme: state.theme }),
    }
  )
);
