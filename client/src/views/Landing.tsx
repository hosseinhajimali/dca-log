'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import {
  RefreshCw, Zap, FlaskConical, TrendingUp,
  BarChart2, Bell, ShieldCheck, ArrowRight,
} from 'lucide-react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

const FEATURES = [
  {
    Icon: RefreshCw,
    title: 'DCA Plans',
    desc: 'Set up recurring buy plans for any crypto asset. Track your average cost basis and see real-time P&L across your entire portfolio.',
  },
  {
    Icon: Zap,
    title: 'Smart Rules',
    desc: 'Define buying rules triggered by ATH drawdowns and sell rules tied to P&L targets. The app alerts you when conditions are met.',
  },
  {
    Icon: FlaskConical,
    title: 'Strategy Simulator',
    desc: 'Backtest any DCA strategy on historical price data. See exactly what your portfolio would look like if you had started earlier.',
  },
  {
    Icon: TrendingUp,
    title: 'Projection & Goals',
    desc: 'Project your future portfolio value based on growth assumptions. Set targets and track how close you are to reaching them.',
  },
  {
    Icon: BarChart2,
    title: 'Tax Report',
    desc: 'Get a clear summary of your realised gains and losses grouped by asset and tax year, ready to hand to your accountant.',
  },
  {
    Icon: Bell,
    title: 'Notifications',
    desc: 'In-app alerts for DCA reminders, buying opportunities, and sell signals. Stay informed without obsessing over charts.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Create a plan',
    desc: 'Pick an asset, set your buy frequency and amount. DCAlog creates a structured plan to follow.',
  },
  {
    n: '02',
    title: 'Log your transactions',
    desc: 'Record each purchase as you go. The app calculates your cost basis and P&L automatically.',
  },
  {
    n: '03',
    title: 'Track & optimise',
    desc: 'Use smart rules, simulations, and projections to refine your strategy over time.',
  },
];

function BrowserFrame({ src, srcLight, alt }: { src: string; srcLight?: string; alt: string }) {
  return (
    <div className="rounded-xl border overflow-hidden shadow-2xl border-gray-700/60 bg-gray-900 light-browser-frame">
      {/* fake browser toolbar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b shrink-0 bg-gray-800/80 border-gray-700/50 light-browser-toolbar">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <div className="flex-1 mx-3 bg-gray-700/50 rounded h-5 flex items-center px-3 light-browser-urlbar">
          <span className="text-[11px] text-gray-500">dcalog.com</span>
        </div>
      </div>
      {/* dark screenshot, hidden in light mode */}
      <img src={src} alt={alt} className="w-full block screenshot-dark" />
      {/* light screenshot, hidden in dark mode */}
      {srcLight && <img src={srcLight} alt={alt} className="w-full block screenshot-light" />}
    </div>
  );
}

export default function Landing() {
  const pathname = usePathname();
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const token = useStore((s) => s.token);

  // When navigated here with a hash (e.g. /#features from blog), scroll to that section
  useEffect(() => {
    if (!hash) return;
    const id = hash.replace('#', '');
    // Small delay to let the page render before scrolling
    const timer = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => clearTimeout(timer);
  }, [hash]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      <PublicNavbar />

      {/* ── Hero ── */}
      <section id="hero" className="max-w-6xl mx-auto px-6 pt-14 sm:pt-24 pb-10 sm:pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <ShieldCheck size={12} />
          Built for long-term crypto investors
        </div>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-gray-50 tracking-tight leading-tight mb-6">
          Invest consistently.<br />
          <span className="text-brand-400">Profit systematically.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          DCAlog tracks your dollar-cost averaging strategy, monitors buying opportunities based on market conditions,
          and tells you when it's time to take profit, all in one place.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap mb-14 sm:mb-20">
          {token ? (
            <>
              <Link
                href="/app"
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
              >
                Go to dashboard
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/app/plans"
                className="text-sm text-gray-400 hover:text-gray-100 border border-gray-700 hover:border-gray-500 px-6 py-3 rounded-xl transition-colors"
              >
                View my plans
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Start tracking for free
              <ArrowRight size={15} />
            </Link>
          )}
        </div>

        {/* ── Hero screenshot ── */}
        <div className="relative">
          {/* glow behind the frame */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-40 bg-brand-500/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <BrowserFrame src="/screenshots/dashboard.png" srcLight="/screenshots/dashboard-light.png" alt="DCAlog dashboard showing portfolio overview, active plans and fear & greed index" />
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="border-t border-gray-800" />

      {/* ── Features ── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-100 mb-3">Everything you need to DCA smarter</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Stop guessing. Start tracking with the tools that keep your strategy on course.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-700 transition-colors"
            >
              <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center mb-4">
                <Icon size={18} className="text-brand-400" strokeWidth={1.75} />
              </div>
              <h3 className="text-sm font-semibold text-gray-100 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="border-t border-gray-800" />

      {/* ── Feature showcase ── */}
      <section className="max-w-6xl mx-auto px-6 py-20 space-y-24">

        {/* Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium px-3 py-1 rounded-full mb-5">
              DCA Plans
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-4 leading-snug">
              Smart rules that tell you exactly how much to buy
            </h2>
            <p className="text-gray-400 leading-relaxed mb-6">
              Set up recurring plans for any asset and define buying rules tied to ATH drawdowns. When the market dips 30%, you buy more. When it dips 50%, you buy even more. The app does the math and alerts you when it's time to act.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              Set up your first plan <ArrowRight size={14} />
            </Link>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-brand-500/5 blur-2xl rounded-full pointer-events-none" />
            <div className="relative">
              <BrowserFrame src="/screenshots/plans.png" srcLight="/screenshots/plans-light.png" alt="DCA Plans page showing ETH and BTC plans with smart buying rules" />
            </div>
          </div>
        </div>

        {/* Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1 relative">
            <div className="absolute -inset-4 bg-brand-500/5 blur-2xl rounded-full pointer-events-none" />
            <div className="relative">
              <BrowserFrame src="/screenshots/simulator.png" srcLight="/screenshots/simulator-light.png" alt="DCA Simulator showing portfolio value vs total invested over time" />
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium px-3 py-1 rounded-full mb-5">
              Strategy Simulator
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-4 leading-snug">
              See what would have happened if you started earlier
            </h2>
            <p className="text-gray-400 leading-relaxed mb-6">
              Backtest any DCA strategy against real historical price data. Pick an asset, set a weekly or monthly amount, choose a start date, and see the full picture, total invested, current value, return, and a chart of your portfolio growth over time.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              Run a simulation <ArrowRight size={14} />
            </Link>
          </div>
        </div>

      </section>

      {/* ── Divider ── */}
      <div className="border-t border-gray-800" />

      {/* ── How it works ── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-100 mb-3">How it works</h2>
          <p className="text-gray-500">Get up and running in minutes.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {STEPS.map(({ n, title, desc }) => (
            <div key={n} className="text-center">
              <div className="text-4xl font-black text-brand-500/20 mb-4 font-mono">{n}</div>
              <h3 className="text-base font-semibold text-gray-100 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl px-8 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Ready to think in years?</h2>
          <p className="text-gray-500 mb-8 text-sm">Join DCAlog and turn your investing discipline into a data-driven strategy.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Get started, it's free
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <PublicFooter />

    </div>
  );
}
