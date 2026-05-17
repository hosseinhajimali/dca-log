'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, RefreshCw, ArrowLeftRight, FlaskConical,
  TrendingUp, Target, FileText, Settings, HelpCircle,
  ShieldCheck, X, type LucideIcon,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/hooks/useTheme';

const NAV: { to: string; label: string; Icon: LucideIcon; exact?: boolean }[] = [
  { to: '/app',              label: 'Dashboard',    Icon: LayoutDashboard, exact: true },
  { to: '/app/plans',        label: 'DCA Plans',    Icon: RefreshCw },
  { to: '/app/transactions', label: 'Transactions', Icon: ArrowLeftRight },
  { to: '/app/simulator',    label: 'Simulator',    Icon: FlaskConical },
  { to: '/app/projection',   label: 'Projection',   Icon: TrendingUp },
  { to: '/app/goals',        label: 'Goals',        Icon: Target },
  { to: '/app/tax',          label: 'Tax Report',   Icon: FileText },
  { to: '/app/settings',     label: 'Settings',     Icon: Settings },
  { to: '/app/help',         label: 'Help',         Icon: HelpCircle },
];

function NavItem({ to, label, Icon, exact, onClick }: { to: string; label: string; Icon: LucideIcon; exact?: boolean; onClick: () => void }) {
  const pathname = usePathname();
  const isActive = exact ? pathname === to : (pathname?.startsWith(to) ?? false);
  return (
    <Link
      href={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive ? 'bg-brand-500/10 text-brand-400' : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
      }`}
    >
      <Icon size={16} strokeWidth={1.75} className="shrink-0" />
      {label}
    </Link>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useStore();
  const { theme } = useTheme();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const resolvedTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  const logoSrc = resolvedTheme === 'light' ? '/logo-horizontal-light.svg' : '/logo-horizontal.svg';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 w-64 md:w-60 bg-gray-900 border-r border-gray-800 flex flex-col z-30
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <a href="/"><img src={logoSrc} alt="DCAlog" className="h-9 w-auto shrink-0" /></a>
          <button
            onClick={onClose}
            className="md:hidden text-gray-500 hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-800"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, label, Icon, exact }) => (
            <NavItem key={to} to={to} label={label} Icon={Icon} exact={exact} onClick={onClose} />
          ))}
          {user?.isAdmin && (
            <NavItem to="/app/admin" label="Admin" Icon={ShieldCheck} onClick={onClose} />
          )}
        </nav>

        <div className="px-4 py-4 border-t border-gray-800">
          <p className="text-xs text-gray-700 text-center">© {new Date().getFullYear()} DCAlog</p>
        </div>
      </aside>
    </>
  );
}
