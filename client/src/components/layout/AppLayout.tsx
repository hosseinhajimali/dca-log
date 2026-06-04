'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, UserCircle, LogOut, TriangleAlert } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { NotificationBell } from './NotificationBell';
import { Toaster } from '@/components/ui/Toaster';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { User } from '@/types';
import { useTheme } from '@/hooks/useTheme';

const BETA_BANNER_KEY = 'beta_banner_dismissed_v1';

function BetaBanner() {
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem(BETA_BANNER_KEY) === '1'
  );

  const dismiss = () => {
    localStorage.setItem(BETA_BANNER_KEY, '1');
    setDismissed(true);
  };

  if (dismissed) return null;
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-start gap-3">
      <TriangleAlert size={15} className="text-amber-400 shrink-0" />
      <p className="text-xs text-amber-600 flex-1">
        <span className="font-semibold">Beta notice:</span> We are actively testing new features. Data may change unexpectedly. Please export a backup of your transactions regularly.
      </p>
      <button onClick={dismiss} className="text-xs text-amber-500 hover:text-amber-400 transition-colors shrink-0 underline underline-offset-2">
        Don't show this again
      </button>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const setExchangeRates = useStore((s) => s.setExchangeRates);
  const setUser = useStore((s) => s.setUser);
  const user   = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useTheme();

  useEffect(() => {
    if (!menuOpen) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  useEffect(() => {
    api.get<{ data: User }>('/auth/me')
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
      .catch(() => {});
  }, [setExchangeRates]);

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen overflow-x-hidden">
        <header className="h-[60px] border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm flex items-center px-4 md:px-6 gap-3 shrink-0 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-400 hover:text-gray-200 transition-colors p-1.5 rounded-lg hover:bg-gray-800 mr-1"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <NotificationBell />
            <div ref={menuRef} className="relative flex items-center ms-1">
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
                aria-label="Account menu"
              >
                <Avatar id={user?.avatar} size={28} />
                <span className="text-sm font-medium text-gray-300 hidden sm:block">{user?.name || 'You'}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-800">
                    <p className="text-xs font-medium text-gray-300 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { router.push('/app/settings/profile'); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
                  >
                    <UserCircle size={14} />
                    Profile settings
                  </button>
                  <button
                    onClick={() => { logout(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors border-t border-gray-800"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <BetaBanner />

        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
