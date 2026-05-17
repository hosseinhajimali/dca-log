'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
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

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is DCA and how does DCAlog help?',
    a: 'Dollar-Cost Averaging (DCA) is an investment strategy where you buy a fixed amount of an asset at regular intervals regardless of price. DCAlog lets you track those recurring purchases, monitor your average cost basis, and see your real-time P&L across all your positions in one place.',
  },
  {
    q: 'How do I create a DCA plan?',
    a: 'Go to DCA Plans and click "New plan". Enter the asset (e.g. BTC), your buy frequency, and the amount per purchase. Once saved, you can log individual transactions against that plan and the app will automatically track your cost basis and performance.',
  },
  {
    q: 'What are Buying Rules?',
    a: 'Buying Rules let you define conditions under which you want to buy more. You set a drawdown range (e.g. −10% to −20% from ATH) and the amount to buy. The app checks these rules when you view your plans and notifies you when a rule\'s conditions are met so you never miss a dip.',
  },
  {
    q: 'What are Sell Rules?',
    a: 'Sell Rules work the opposite way: you define a P&L range (e.g. +50% to +100%) and an amount to sell. They help you take profit systematically instead of emotionally. The current P&L percentage is shown next to the Sell Rules panel title so you can see how close you are at a glance.',
  },
  {
    q: 'How is my P&L calculated?',
    a: 'P&L is calculated as ((current price − average cost) / average cost) × 100. Your average cost is the weighted average of all your logged transactions for that asset. Live prices are fetched automatically so the percentage updates in real time.',
  },
  {
    q: 'What is the Simulator?',
    a: 'The Simulator lets you backtest a DCA strategy on historical price data without committing real money. You can adjust the start date, frequency, and amount to see what your portfolio would look like today if you had followed that plan.',
  },
  {
    q: 'What does the Projection page show?',
    a: 'Projection estimates the future value of your DCA plan based on a target price or an assumed annual growth rate. It\'s useful for setting realistic expectations and understanding how consistent contributions compound over time.',
  },
  {
    q: 'How do Goals work?',
    a: 'Goals let you set a target value or price for an asset (e.g. "reach $10,000 in BTC"). The app shows your progress toward each goal based on your current holdings and live prices.',
  },
  {
    q: 'What does the Tax Report include?',
    a: 'The Tax Report summarises your realised gains and losses from completed sell transactions. It groups them by asset and tax year, giving you a ready-made overview to hand to your accountant or import into a tax tool.',
  },
  {
    q: 'How do I back up and restore my data?',
    a: 'Go to Settings → Data. You can download a full backup of your plans, transactions, assets, buying rules, and sell rules as a JSON file. To restore, upload that file on the same page. Old backups from before sell rules were added are still compatible.',
  },
  {
    q: 'What notifications does DCAlog send?',
    a: 'DCAlog sends in-app notifications for three events: a DCA reminder when a plan\'s next purchase date is tomorrow, a Buying Rule alert when an asset\'s drawdown falls inside a rule\'s range, and a Sell Rule alert when P&L enters a sell rule\'s range. No emails, everything stays inside the app.',
  },
  {
    q: 'How does the Fear & Greed Index work?',
    a: 'The Fear & Greed Index on the Dashboard is fetched from the Alternative.me API. It scores overall crypto market sentiment from 0 (Extreme Fear) to 100 (Extreme Greed). Many DCA investors use it as a signal to increase buys during fear periods.',
  },
  {
    q: 'Can I change my display currency?',
    a: 'Yes. Go to Settings → Preferences and pick your preferred currency. All portfolio values, P&L figures, and transaction amounts will be converted using live exchange rates.',
  },
  {
    q: 'How do I change my avatar?',
    a: 'Click your avatar in the top-right corner to go to Profile Settings. You can choose from a set of built-in avatar styles. Changes are reflected everywhere in the app immediately.',
  },
  {
    q: 'Is there an admin panel?',
    a: 'Yes, if your account has admin access you\'ll see an Admin link in the sidebar. It shows platform-wide stats (users, plans, transactions), lets you manage user accounts, and gives you a view of all feedback submissions.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-800 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left text-sm font-medium text-gray-200 hover:text-gray-100 transition-colors"
      >
        <span>{q}</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`shrink-0 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm text-gray-400 leading-relaxed">
          {a}
        </p>
      )}
    </div>
  );
}

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
    onError: () => toast('Failed to send, please try again.', 'error'),
  });

  return (
    <div className="space-y-10 max-w-2xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-100">Help & Feedback</h1>
        <p className="text-sm text-gray-500 mt-1">Answers to common questions, and a way to reach us.</p>
      </div>

      {/* FAQ */}
      <section className="space-y-1">
        <h2 className="text-base font-semibold text-gray-200 mb-3">Frequently asked questions</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-5">
          {FAQ.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* Feedback form */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-gray-200">Still need help?</h2>
          <p className="text-sm text-gray-500 mt-0.5">Got something on your mind? We'd love to hear it.</p>
        </div>

        {sent ? (
          <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-6 text-center space-y-2">
            <p className="text-2xl">✓</p>
            <p className="text-brand-400 font-medium">Message sent!</p>
            <p className="text-sm text-gray-500">Thanks for reaching out, we'll take a look.</p>
            <button
              onClick={() => setSent(false)}
              className="mt-2 text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
            >
              Send another
            </button>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
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
      </section>
    </div>
  );
}
