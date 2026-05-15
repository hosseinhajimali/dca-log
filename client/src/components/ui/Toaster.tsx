import { useState, useEffect } from 'react';
import { subscribeToasts, ToastItem } from '@/lib/toast';

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border animate-fade-in pointer-events-auto ${
            t.type === 'success'
              ? 'bg-gray-900 border-gray-700 text-gray-100'
              : 'bg-red-950 border-red-800 text-red-200'
          }`}
        >
          <span className={t.type === 'success' ? 'text-brand-400' : 'text-red-400'}>
            {t.type === 'success' ? '✓' : '✕'}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
