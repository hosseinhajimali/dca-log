import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Avatar } from '@/components/ui/Avatar';

const NAV = [
  { to: '/',             label: 'Dashboard',    icon: '▦' },
  { to: '/plans',        label: 'DCA Plans',    icon: '♻' },
  { to: '/transactions', label: 'Transactions', icon: '↕' },
  { to: '/simulator',   label: 'Simulator',    icon: '⏱' },
  { to: '/projection',  label: 'Projection',   icon: '🔮' },
  { to: '/goals',       label: 'Goals',        icon: '🎯' },
  { to: '/tax',         label: 'Tax Report',   icon: '🧾' },
  { to: '/settings',    label: 'Settings',     icon: '⚙' },
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
        <div className="px-6 py-5 border-b border-gray-800">
          <span className="text-xl font-bold text-brand-400 tracking-tight">DCAlog</span>
          <p className="text-xs text-gray-500 mt-0.5">Think in years, not months</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-400'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                }`
              }
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <NavLink
              to="/settings/profile"
              className="flex items-center gap-2.5 min-w-0 group flex-1 mr-2"
            >
              <Avatar id={user?.avatar} size={32} className="group-hover:ring-2 group-hover:ring-brand-500/50 group-hover:ring-offset-1 group-hover:ring-offset-gray-900 transition-all" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate group-hover:text-brand-400 transition-colors">{user?.name || 'You'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </NavLink>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="ml-2 flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Sign out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="w-4 h-4">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
