import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Navigate, useSearchParams } from 'react-router-dom';
import {
  useAdminUsers, useAdminStats, useAdminFeedback,
  useDeleteUser, useMarkFeedbackRead, useMarkAllFeedbackRead, useDeleteFeedback,
} from '@/hooks/useAdmin';
import { useCurrencyFormatter } from '@/lib/format';
import { Avatar } from '@/components/ui/Avatar';
import { toast } from '@/lib/toast';
import { Trash2 } from 'lucide-react';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'COMPLAINT', label: 'Complaint' },
  { value: 'FEEDBACK', label: 'Feedback' },
  { value: 'LOGIN_ISSUE', label: 'Login issue' },
  { value: 'APP_ISSUE', label: 'App issue' },
  { value: 'FEATURE_REQUEST', label: 'Feature request' },
  { value: 'OTHER', label: 'Other' },
];

const CATEGORY_COLORS: Record<string, string> = {
  COMPLAINT: 'text-red-400 bg-red-500/10 border-red-500/20',
  FEEDBACK: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
  LOGIN_ISSUE: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  APP_ISSUE: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  FEATURE_REQUEST: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  OTHER: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
};

type Tab = 'stats' | 'users' | 'feedback';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

function StatsTab() {
  const { data: stats, isLoading } = useAdminStats();
  const { format } = useCurrencyFormatter();

  if (isLoading) return <div className="text-gray-500 text-sm animate-pulse">Loading stats…</div>;
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <StatCard label="Total users"       value={stats.userCount} />
      <StatCard label="Total plans"       value={stats.planCount} />
      <StatCard label="Transactions"      value={stats.txCount} />
      <StatCard label="Assets tracked"    value={stats.assetCount} />
      <StatCard label="Total invested"    value={format(stats.totalInvestedUsd)} sub="across all users" />
      <StatCard label="Unread feedback"   value={stats.unreadFeedback} />
    </div>
  );
}

function UsersTab() {
  const { data: users = [], isLoading } = useAdminUsers();
  const deleteUser = useDeleteUser();
  const { user: me } = useStore();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (isLoading) return <div className="text-gray-500 text-sm animate-pulse">Loading users…</div>;

  return (
    <div className="space-y-2">
      {users.map(u => (
        <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-4">
          <Avatar id={u.avatar} size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-200">{u.name || u.email}</span>
              {u.name && <span className="text-xs text-gray-500">{u.email}</span>}
              {u.isAdmin && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">admin</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-600">
              <span>{u._count.dcaPlans} plans</span>
              <span>{u._count.transactions} txs</span>
              <span>{u._count.assets} assets</span>
              <span>Joined {new Date(u.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          {u.id !== me?.id && (
            confirmId === u.id ? (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">Delete?</span>
                <button
                  onClick={async () => {
                    await deleteUser.mutateAsync(u.id);
                    setConfirmId(null);
                    toast('User deleted');
                  }}
                  className="text-xs text-red-400 border border-red-500/30 px-2 py-0.5 rounded-md hover:text-red-300"
                >Yes</button>
                <button
                  onClick={() => setConfirmId(null)}
                  className="text-xs text-gray-500 border border-gray-700 px-2 py-0.5 rounded-md hover:text-gray-300"
                >No</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmId(u.id)}
                className="shrink-0 text-xs text-gray-600 hover:text-red-400 border border-gray-800 hover:border-red-500/30 px-2.5 py-1 rounded-lg transition-colors"
              >
                Delete
              </button>
            )
          )}
        </div>
      ))}
      {users.length === 0 && <p className="text-gray-600 text-sm">No users found.</p>}
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel, loading }: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <p className="text-sm text-gray-300 leading-relaxed">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="text-xs px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="text-xs px-4 py-2 rounded-lg bg-red-600/20 border border-red-600/40 text-red-400 hover:bg-red-600/30 hover:border-red-500/60 transition-colors disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FeedbackTab() {
  const [category, setCategory] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data: feedbacks = [], isLoading } = useAdminFeedback(category || undefined);
  const markRead = useMarkFeedbackRead();
  const markAllRead = useMarkAllFeedbackRead();
  const deleteFeedback = useDeleteFeedback();

  const hasUnread = feedbacks.some(fb => !fb.isRead);

  if (isLoading) return <div className="text-gray-500 text-sm animate-pulse">Loading feedback…</div>;

  return (
    <div className="space-y-4">
      {deleteId && (
        <ConfirmModal
          message="Delete this feedback? This cannot be undone."
          loading={deleteFeedback.isPending}
          onConfirm={() => deleteFeedback.mutate(deleteId, { onSuccess: () => setDeleteId(null) })}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* category filter + mark all read */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                category === c.value
                  ? 'border-brand-500/50 text-brand-400 bg-brand-500/10'
                  : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {hasUnread && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-600 px-3 py-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-50"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {feedbacks.map(fb => (
          <div key={fb.id} className={`bg-gray-900 border rounded-xl p-4 transition-colors ${fb.isRead ? 'border-gray-800 opacity-60' : 'border-gray-700'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${CATEGORY_COLORS[fb.category] ?? CATEGORY_COLORS.OTHER}`}>
                    {CATEGORIES.find(c => c.value === fb.category)?.label ?? fb.category}
                  </span>
                  {fb.user && (
                    <span className="text-xs text-gray-500">{fb.user.email}</span>
                  )}
                  <span className="text-xs text-gray-600">{new Date(fb.createdAt).toLocaleString()}</span>
                  {!fb.isRead && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />}
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{fb.message}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!fb.isRead && (
                  <button
                    onClick={() => markRead.mutate(fb.id)}
                    className="text-xs text-gray-600 hover:text-gray-300 border border-gray-800 hover:border-gray-600 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={() => setDeleteId(fb.id)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {feedbacks.length === 0 && <p className="text-gray-600 text-sm">No feedback yet.</p>}
      </div>
    </div>
  );
}

export default function Admin() {
  const { user } = useStore();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) ?? 'stats';
  const [tab, setTab] = useState<Tab>(initialTab);

  if (!user?.isAdmin) return <Navigate to="/" replace />;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'stats',    label: 'Stats' },
    { id: 'users',    label: 'Users' },
    { id: 'feedback', label: 'Feedback' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-100">Admin</h1>
        <p className="text-sm text-gray-500 mt-1">App-wide control panel</p>
      </div>

      {/* tabs */}
      <div className="flex items-center gap-1 border-b border-gray-800 pb-0 overflow-x-auto overflow-y-hidden">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-brand-400 text-brand-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'stats'    && <StatsTab />}
        {tab === 'users'    && <UsersTab />}
        {tab === 'feedback' && <FeedbackTab />}
      </div>
    </div>
  );
}
