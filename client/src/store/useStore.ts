import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { queryClient } from '@/lib/queryClient';

interface AppState {
  user: User | null;
  token: string | null;
  currency: string;
  exchangeRates: Record<string, number>;

  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setCurrency: (currency: string) => void;
  setExchangeRates: (rates: Record<string, number>) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      currency: 'USD',
      exchangeRates: {},

      setAuth: (user, token) => {
        localStorage.setItem('dca_token', token);
        set({ user, token, currency: user.currency || 'USD' });
      },

      logout: () => {
        localStorage.removeItem('dca_token');
        localStorage.removeItem('dca_user');
        queryClient.clear(); // clear cached data so next user starts fresh
        set({ user: null, token: null });
      },

      setCurrency: (currency) => set({ currency }),

      setExchangeRates: (rates) => set({ exchangeRates: rates }),
    }),
    {
      name: 'mydca-store',
      partialize: (state) => ({ user: state.user, token: state.token, currency: state.currency }),
    }
  )
);
