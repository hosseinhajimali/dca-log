import { Link, Navigate } from 'react-router-dom';
import {
  RefreshCw, Zap, FlaskConical, TrendingUp,
  BarChart2, Bell, ShieldCheck, ArrowRight,
} from 'lucide-react';
import { useStore } from '@/store/useStore';

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
    desc: 'Get a clear summary of your realised gains and losses grouped by asset and tax year — ready to hand to your accountant.',
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

export default function Landing() {
  const token = useStore((s) => s.token);

  // Already logged in — send straight to the app
  if (token) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src="/logo-horizontal.svg" alt="DCAlog" className="h-8 w-auto" />
          <nav className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-gray-400 hover:text-gray-100 transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              to="/login"
              className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <ShieldCheck size={12} />
          Built for long-term crypto investors
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-gray-50 tracking-tight leading-tight mb-6">
          Invest consistently.<br />
          <span className="text-brand-400">Profit systematically.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          DCAlog tracks your dollar-cost averaging strategy, monitors buying opportunities based on market conditions,
          and tells you when it's time to take profit — all in one place.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Start tracking for free
            <ArrowRight size={15} />
          </Link>
          <Link
            to="/login"
            className="text-sm text-gray-400 hover:text-gray-100 border border-gray-700 hover:border-gray-500 px-6 py-3 rounded-xl transition-colors"
          >
            Sign in to your account
          </Link>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="border-t border-gray-800/60" />

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
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
      <div className="border-t border-gray-800/60" />

      {/* ── How it works ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
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
            to="/login"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Get started — it's free
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src="/logo-horizontal.svg" alt="DCAlog" className="h-7 w-auto opacity-60" />
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} DCAlog · Think in years, not months.</p>
        </div>
      </footer>

    </div>
  );
}
