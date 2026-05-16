import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/Toaster';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';

export function AppLayout() {
  const setExchangeRates = useStore((s) => s.setExchangeRates);

  useEffect(() => {
    api.get<{ data: { toCurrency: string; rate: number }[] }>('/prices/exchange-rates')
      .then((res) => {
        const map: Record<string, number> = {};
        for (const { toCurrency, rate } of res.data.data) {
          map[toCurrency] = rate;
        }
        setExchangeRates(map);
      })
      .catch(() => {}); // silently ignore — USD fallback is fine
  }, [setExchangeRates]);

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />
      <main className="flex-1 ml-60 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  );
}
