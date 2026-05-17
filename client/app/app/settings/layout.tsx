'use client';
import SettingsLayout from '@/pages/settings/SettingsLayout';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SettingsLayout>{children}</SettingsLayout>;
}
