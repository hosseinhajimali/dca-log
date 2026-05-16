import { useRef, useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import type { Theme } from '@/store/useStore';

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light',  label: 'Light',  Icon: Sun },
  { value: 'dark',   label: 'Dark',   Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
];

function CurrentIcon({ theme }: { theme: Theme }) {
  const map = { light: Sun, dark: Moon, system: Monitor };
  const Icon = map[theme];
  return <Icon size={16} strokeWidth={1.75} />;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
        title="Toggle theme"
      >
        <CurrentIcon theme={theme} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-36 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 py-1 animate-fade-in">
          {OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => { setTheme(value); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                theme === value
                  ? 'text-brand-400 bg-brand-500/10'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
              }`}
            >
              <Icon size={14} strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
