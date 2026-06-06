import { useState, useEffect } from 'react';
import { subscribeToasts, ToastItem } from '@/lib/toast';

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2.5 pointer-events-none items-center">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-semibold shadow-2xl border animate-fade-in pointer-events-auto min-w-[220px] ${
            t.type === 'success'
              ? 'bg-gray-900 border-gray-700 text-gray-100'
              : 'bg-red-950 border-red-800 text-red-200'
          }`}
        >
          <span className={`text-base ${t.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {t.type === 'success' ? '✓' : '✕'}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
