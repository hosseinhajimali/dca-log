import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

const CATEGORIES = [
  { value: 'FEEDBACK',        label: 'General feedback' },
  { value: 'APP_ISSUE',       label: 'App issue / bug' },
  { value: 'LOGIN_ISSUE',     label: 'Login issue' },
  { value: 'FEATURE_REQUEST', label: 'Feature request' },
  { value: 'COMPLAINT',       label: 'Complaint' },
  { value: 'OTHER',           label: 'Other' },
];

export default function Help() {
  const [category, setCategory] = useState('FEEDBACK');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const submit = useMutation({
    mutationFn: () => api.post('/feedback', { category, message }),
    onSuccess: () => {
      setSent(true);
      setMessage('');
      setCategory('FEEDBACK');
    },
    onError: () => toast('Failed to send — please try again.', 'error'),
  });

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Help & Feedback</h1>
        <p className="text-sm text-gray-500 mt-1">Got something on your mind? We'd love to hear it.</p>
      </div>

      {sent ? (
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-6 text-center space-y-2">
          <p className="text-2xl">✓</p>
          <p className="text-brand-400 font-medium">Message sent!</p>
          <p className="text-sm text-gray-500">Thanks for reaching out — we'll take a look.</p>
          <button
            onClick={() => setSent(false)}
            className="mt-2 text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
          >
            Send another
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          {/* category */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">Topic</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-brand-500 transition-colors"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* message */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              placeholder="Describe what's on your mind…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none transition-colors"
            />
            <p className="text-xs text-gray-600 text-right">{message.length} / 2000</p>
          </div>

          <button
            onClick={() => submit.mutate()}
            disabled={submit.isPending || message.trim().length < 10}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {submit.isPending ? 'Sending…' : 'Send message'}
          </button>
        </div>
      )}
    </div>
  );
}
