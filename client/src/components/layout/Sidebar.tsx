import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, RefreshCw, ArrowLeftRight, FlaskConical,
  TrendingUp, Target, FileText, Settings, HelpCircle,
  ShieldCheck, type LucideIcon,
} from 'lucide-react';
import { useStore } from '@/store/useStore';

const NAV: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: '/',             label: 'Dashboard',    Icon: LayoutDashboard },
  { to: '/plans',        label: 'DCA Plans',    Icon: RefreshCw },
  { to: '/transactions', label: 'Transactions', Icon: ArrowLeftRight },
  { to: '/simulator',   label: 'Simulator',    Icon: FlaskConical },
  { to: '/projection',  label: 'Projection',   Icon: TrendingUp },
  { to: '/goals',       label: 'Goals',        Icon: Target },
  { to: '/tax',         label: 'Tax Report',   Icon: FileText },
  { to: '/settings',    label: 'Settings',     Icon: Settings },
  { to: '/help',        label: 'Help',         Icon: HelpCircle },
];

function LogoutConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-xs bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="text-3xl">⏻</span>
          <h2 className="text-base font-semibold text-gray-100">Sign out?</h2>
          <p className="text-sm text-gray-500">You'll need to sign in again to access your account.</p>
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Sign out
          </button>
          <button
            onClick={onCancel}
            className="flex-1 text-gray-400 hover:text-gray-200 text-sm border border-gray-700 py-2.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { user, logout } = useStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      {showLogoutConfirm && (
        <LogoutConfirmModal
          onConfirm={logout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}

      <aside className="fixed inset-y-0 left-0 w-60 bg-gray-900 border-r border-gray-800 flex flex-col z-30">
        {/* Logo */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-center">
          <img src="/logo.svg" alt="DCAlog" className="w-10 h-10 rounded-lg shrink-0" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-400'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                }`
              }
            >
              <Icon size={16} strokeWidth={1.75} className="shrink-0" />
              {label}
            </NavLink>
          ))}
          {user?.isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-400'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                }`
              }
            >
              <ShieldCheck size={16} strokeWidth={1.75} className="shrink-0" />
              Admin
            </NavLink>
          )}
        </nav>

        {/* Logout */}
        <div className="px-4 py-4 border-t border-gray-800">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="w-4 h-4 shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
