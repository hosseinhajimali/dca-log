import { NavLink, Outlet } from 'react-router-dom';

function Tab({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
          isActive
            ? 'border-brand-400 text-brand-400'
            : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function SettingsLayout() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex border-b border-gray-800 overflow-x-auto">
        <Tab to="/app/settings" end label="General" />
        <Tab to="/app/settings/profile" label="Profile" />
      </div>

      <Outlet />
    </div>
  );
}
