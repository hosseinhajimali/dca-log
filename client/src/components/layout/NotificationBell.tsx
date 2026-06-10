'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  ANNOUNCEMENT:    'News',
};

const TYPE_COLOR: Record<AppNotification['type'], string> = {
  DCA_REMINDER:    'text-brand-400 bg-brand-500/10 border-brand-500/20',
  SELL_RULE_MET:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  BUYING_RULE_MET: 'text-green-400 bg-green-500/10 border-green-500/20',
  NEW_FEEDBACK:    'text-gray-400 bg-gray-500/10 border-gray-500/20',
  ANNOUNCEMENT:    'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export function NotificationBell() {
  const { data } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAll = useMarkAllAsRead();
  const deleteOne = useDeleteNotification();
  const clearAll = useClearAllNotifications();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [announcementModal, setAnnouncementModal] = useState<AppNotification | null>(null);
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
      {/* Announcement full-message modal, portalled to body to escape relative parent */}
      {announcementModal && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAnnouncementModal(null)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-gray-100">{announcementModal.title}</h3>
              <span className={`text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded border ${TYPE_COLOR['ANNOUNCEMENT']}`}>
                News
              </span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{announcementModal.message}</p>
            <div className="flex items-center justify-between pt-3 border-t border-gray-800">
              <span className="text-xs text-gray-600">{new Date(announcementModal.createdAt).toLocaleString()}</span>
              <button
                onClick={() => setAnnouncementModal(null)}
                className="text-xs px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
                <button onClick={() => clearAll.mutate()} className="text-xs text-red-500 hover:text-red-400 transition-colors">
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-700">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-600">No notifications yet</div>
            ) : (
              items.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors cursor-pointer ${!n.isRead ? 'bg-gray-800/30' : ''}`}
                  onClick={() => {
                    if (!n.isRead) markAsRead.mutate(n.id);
                    if (n.type === 'ANNOUNCEMENT') {
                      setAnnouncementModal(n);
                      setOpen(false);
                    } else if (n.metadata?.planId) {
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
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
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

          <div className="px-4 py-2.5 border-t border-gray-800">
            <a
              href="https://t.me/dcalog_updates"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-gray-600 hover:text-[#229ED9] transition-colors"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Join DCAlog on Telegram
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
