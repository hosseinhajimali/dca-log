import { Outlet, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { NotificationBell } from './NotificationBell';
import { Toaster } from '@/components/ui/Toaster';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';

export function AppLayout() {
  const setExchangeRates = useStore((s) => s.setExchangeRates);
  const setUser = useStore((s) => s.setUser);
  const user = useStore((s) => s.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useTheme(); // initialize theme from store on mount

  // Refresh user profile on mount so isAdmin and other fields are always current
  useEffect(() => {
    api.get<{ data: { id: string; email: string; name?: string; currency: string; avatar?: string | null; isAdmin: boolean; createdAt: string } }>('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => {});
  }, [setUser]);

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
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content — offset by sidebar width on md+ */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top bar */}
        <header className="h-[60px] border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm flex items-center px-4 md:px-6 gap-3 shrink-0 sticky top-0 z-20">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-400 hover:text-gray-200 transition-colors p-1.5 rounded-lg hover:bg-gray-800 mr-1"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
            <div className="flex items-center gap-2 ms-3">
              <span className="text-sm font-medium text-gray-300 hidden sm:block">{user?.name || 'You'}</span>
              <NavLink to="/app/settings/profile" className="flex items-center">
                <Avatar id={user?.avatar} size={28} className="hover:ring-2 hover:ring-brand-500/50 hover:ring-offset-1 hover:ring-offset-gray-900 transition-all" />
              </NavLink>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
