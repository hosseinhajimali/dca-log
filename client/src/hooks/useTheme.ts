import { useEffect } from 'react';
import { useStore, type Theme } from '@/store/useStore';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  const html = document.documentElement;
  html.classList.remove('light', 'dark');
  html.classList.add(resolved);
}

export function useTheme() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const token = useStore((s) => s.token);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Re-apply when system preference changes (only relevant in 'system' mode)
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  async function setThemeAndSave(newTheme: Theme) {
    setTheme(newTheme);
    toast(`Theme set to ${newTheme}`);
    if (token) {
      try {
        await api.patch('/auth/me', { theme: newTheme });
      } catch {
        // non-critical - theme is already applied locally
      }
    }
  }

  return { theme, setTheme: setThemeAndSave };
}
