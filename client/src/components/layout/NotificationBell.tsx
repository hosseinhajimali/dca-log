'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import {
  useNotifications, useMarkAsRead, useMarkAllAsRead,
  useDeleteNotification, useClearAllNotifications,
  type AppNotification,
} from '@/hooks/useNotifications';

const TYPE_LABEL: Record<AppNotification['type'], string> = {
  DCA_REMINDER:    'DCA',
  SELL_RULE_MET:   'Sell',
  BUYING_RULE_MET: 'Buy',
  NEW_FEEDBACK:    'Msg',
};

const TYPE_COLOR: Record<AppNotification['type'], string> = {
  DCA_REMINDER:    'text-brand-400 bg-brand-500/10 border-brand-500/20',
  SELL_RULE_MET:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  BUYING_RULE_MET: 'text-green-400 bg-green-500/10 border-green-500/20',
  NEW_FEEDBACK:    'text-gray-400 bg-gray-500/10 border-gray-500/20',
};

export function NotificationBell() {
  const { data } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAll = useMarkAllAsRead();
  const deleteOne = useDeleteNotification();
  const clearAll = useClearAllNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = data?.unreadCount ?? 0;
  const items = data?.notifications ?? [];

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
        title="Notifications"
      >
        <Bell size={16} strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <span className="text-sm font-semibold text-gray-200">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={() => markAll.mutate()} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                  Mark all read
                </button>
              )}
              {items.length > 0 && (
                <button onClick={() => clearAll.mutate()} className="text-xs text-red-500/70 hover:text-red-400 transition-colors">
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-800">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-600">No notifications yet</div>
            ) : (
              items.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors cursor-pointer ${!n.isRead ? 'bg-gray-800/30' : ''}`}
                  onClick={() => {
                    if (!n.isRead) markAsRead.mutate(n.id);
                    if (n.metadata?.planId) {
                      router.push(`/app/plans/${n.metadata.planId}`);
                      setOpen(false);
                    } else if (n.type === 'NEW_FEEDBACK') {
                      router.push('/app/admin?tab=feedback');
                      setOpen(false);
                    }
                  }}
                >
                  <span className={`text-[10px] font-bold shrink-0 mt-0.5 px-1.5 py-0.5 rounded border ${TYPE_COLOR[n.type]}`}>
                    {TYPE_LABEL[n.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-medium ${n.isRead ? 'text-gray-400' : 'text-gray-200'}`}>{n.title}</p>
                      {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-xs text-gray-700 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteOne.mutate(n.id); }}
                    className="shrink-0 text-gray-700 hover:text-gray-400 transition-colors mt-0.5"
                    title="Dismiss"
                  >×</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
