import { NavLink } from 'react-router-dom';
import { useStore } from '@/store/useStore';

const NAV = [
  { to: '/',             label: 'Dashboard',    icon: '▦' },
  { to: '/plans',        label: 'DCA Plans',    icon: '♻' },
  { to: '/transactions', label: 'Transactions', icon: '↕' },
  { to: '/analytics',   label: 'Analytics',    icon: '∿' },
  { to: '/settings',    label: 'Settings',     icon: '⚙' },
];

export function Sidebar() {
  const { user, logout } = useStore();

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-gray-900 border-r border-gray-800 flex flex-col z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <span className="text-xl font-bold text-brand-400 tracking-tight">myDCA</span>
        <p className="text-xs text-gray-500 mt-0.5">Dollar Cost Averaging</p>
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
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{user?.name || 'You'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="ml-2 text-xs text-gray-500 hover:text-gray-200 transition-colors"
            title="Sign out"
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  );
}
