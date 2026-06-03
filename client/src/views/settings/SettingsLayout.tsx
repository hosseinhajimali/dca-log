'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function Tab({ to, label, exact }: { to: string; label: string; exact?: boolean }) {
  const pathname = usePathname();
  const isActive = exact ? pathname === to : (pathname?.startsWith(to) ?? false);
  return (
    <Link
      href={to}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        isActive
          ? 'border-brand-400 text-brand-400'
          : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'
      }`}
    >
      {label}
    </Link>
  );
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex border-b border-gray-800 overflow-x-hidden">
        <Tab to="/app/settings" exact label="General" />
        <Tab to="/app/settings/profile" label="Profile" />
      </div>

      {children}
    </div>
  );
}
