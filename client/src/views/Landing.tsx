'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import {
  RefreshCw, Zap, FlaskConical, TrendingUp,
  BarChart2, Bell, ArrowRight,
} from 'lucide-react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { HeroDashboardMock } from '@/components/landing/HeroDashboardMock';
import { PlansMock } from '@/components/landing/PlansMock';
import { SimulatorMini } from '@/components/landing/SimulatorMini';

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

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border overflow-hidden border-gray-700 bg-gray-900 light-browser-frame">
      {/* fake browser toolbar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b shrink-0 bg-gray-800/80 border-gray-700/50 light-browser-toolbar">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <div className="flex-1 mx-3 bg-gray-700 rounded h-5 flex items-center px-3 light-browser-urlbar">
          <span className="text-[11px] text-gray-300 light-browser-urlbar-text">dcalog.com</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-[0.2em] uppercase text-brand-400 mb-4">{children}</p>
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

      <main>

      {/* ── Hero ── */}
      <section id="hero" className="max-w-6xl mx-auto px-6 pt-14 sm:pt-24 pb-10 sm:pb-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-500 mb-6">
            DCA tracking for long-term crypto investors
          </p>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-gray-50 tracking-tight leading-tight mb-6">
            Invest consistently.<br />
            <span className="text-green-500">Profit systematically.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mb-10 leading-relaxed">
            DCAlog tracks your dollar-cost averaging strategy, monitors buying opportunities based on market conditions,
            and tells you when it's time to take profit, all in one place.
          </p>
          <div className="flex items-center gap-4 flex-wrap mb-6">
            {token ? (
              <>
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded transition-colors text-sm"
                >
                  Go to dashboard
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/app/plans"
                  className="text-sm text-gray-400 hover:text-gray-100 border border-gray-700 hover:border-gray-500 px-6 py-3 rounded transition-colors"
                >
                  View my plans
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded transition-colors text-sm"
              >
                Start tracking for free
                <ArrowRight size={15} />
              </Link>
            )}
          </div>
          <p className="font-mono text-xs text-gray-500 mb-14 sm:mb-20">
            ATH drawdown rules · WAC cost basis · backtesting · tax reports
          </p>
        </div>

        {/* ── Hero product mock, live DOM so it always matches the current design ── */}
        <BrowserFrame>
          <HeroDashboardMock />
        </BrowserFrame>
      </section>

      {/* ── Divider ── */}
      <div className="border-t border-gray-800" />

      {/* ── Features ── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-12">
          <SectionLabel>Features</SectionLabel>
          <h2 className="text-3xl font-bold text-gray-100 mb-3">Plan. Track. Take profit.</h2>
          <p className="text-gray-400 max-w-xl">Stop guessing. Start tracking with the tools that keep your strategy on course.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-700 border border-gray-700 rounded-lg overflow-hidden">
          {FEATURES.map(({ Icon, title, desc }) => (
            <div key={title} className="bg-gray-900 p-6 hover:bg-gray-800 transition-colors">
              <div className="flex items-center gap-2.5 mb-3">
                <Icon size={16} className="text-brand-400" strokeWidth={1.75} aria-hidden="true" />
                <h3 className="text-sm font-semibold text-gray-100">{title}</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
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
            <SectionLabel>DCA plans</SectionLabel>
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
          <BrowserFrame>
            <PlansMock />
          </BrowserFrame>
        </div>

        {/* Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1">
            <SimulatorMini />
          </div>
          <div className="order-1 lg:order-2">
            <SectionLabel>Strategy simulator</SectionLabel>
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
        <div className="mb-12">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="text-3xl font-bold text-gray-100 mb-3">Up and running in minutes</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {STEPS.map(({ n, title, desc }) => (
            <div key={n} className="border-t-2 border-gray-700 pt-5" style={{ borderRadius: 0 }}>
              <p className="font-mono text-xs text-gray-500 mb-3" aria-hidden="true">{n}</p>
              <h3 className="text-base font-semibold text-gray-100 mb-2">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-8 py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-100 mb-2">Ready to think in years?</h2>
            <p className="text-gray-400 text-sm">Join DCAlog and turn your investing discipline into a data-driven strategy.</p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded transition-colors text-sm shrink-0"
          >
            Get started, it's free
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      </main>

      {/* ── Footer ── */}
      <PublicFooter />

    </div>
  );
}
