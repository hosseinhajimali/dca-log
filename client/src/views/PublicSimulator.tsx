'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { ArrowRight, Share2, Download, TrendingUp, TrendingDown, X, Link2, Check } from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssetInfo { symbol: string; name: string }
interface SimSummary {
  totalInvested: number; currentValue: number;
  totalReturn: number; totalReturnPct: number;
  totalQuantity: number; avgCost: number; currentPrice: number;
  buyCount: number; bestBuyPrice: number; worstBuyPrice: number;
  firstBuyDate: string; lastBuyDate: string;
}
interface ChartPoint { date: string; totalInvested: number; portfolioValue: number; price: number }
interface SimResult {
  asset: AssetInfo;
  params: { startDate: string; amountUsd: number; frequency: string };
  summary: SimSummary;
  chartData: ChartPoint[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ASSET_COLORS: Record<string, string> = {
  BTC: '#f7931a', ETH: '#627eea', SOL: '#9945ff', BNB: '#f3ba2f',
  XRP: '#00aae4', ADA: '#0033ad', DOGE: '#c2a633', LINK: '#2a5ada',
  AVAX: '#e84142', LTC: '#bfbbbb', DOT: '#e6007a', NEAR: '#00c08b',
  ARB: '#28a0f0', TON: '#0088cc', TRX: '#ef0027', UNI: '#ff007a',
  ATOM: '#6f7390', INJ: '#00b2ff', SUI: '#4da2ff',
};

const FREQ_LABELS: Record<string, string> = {
  WEEKLY: 'Weekly', BIWEEKLY: 'Bi-weekly', MONTHLY: 'Monthly', DAILY: 'Daily',
};

// Match the same URL construction as api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(n: number) { return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'; }
function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
function defaultStart() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d.toISOString().slice(0, 10);
}

// ─── Share card canvas drawing ────────────────────────────────────────────────

function drawShareCard(
  canvas: HTMLCanvasElement,
  result: SimResult,
): void {
  const W = 1200, H = 630;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  const { summary, asset, params, chartData } = result;
  const profitable = summary.totalReturn >= 0;
  const accentColor = ASSET_COLORS[asset.symbol] ?? '#7c3aed';
  const returnColor = profitable ? '#4ade80' : '#f87171';

  // Left accent bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, 5, H);

  // Top-left: branding
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('DCAlog', 48, 52);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '16px system-ui, -apple-system, sans-serif';
  ctx.fillText('dcalog.com', 48, 76);

  // Asset name + symbol (top-right area)
  ctx.fillStyle = accentColor;
  ctx.font = `bold 52px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(asset.symbol, W - 48, 65);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '20px system-ui, -apple-system, sans-serif';
  ctx.fillText(asset.name, W - 48, 95);
  ctx.textAlign = 'left';

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(48, 115); ctx.lineTo(W - 48, 115); ctx.stroke();

  // ── Stat block ───────────────────────────────────────────────────────────
  const statY = 175;

  // Return % — big hero number
  ctx.fillStyle = returnColor;
  ctx.font = `bold 88px system-ui, -apple-system, sans-serif`;
  ctx.fillText(fmtPct(summary.totalReturnPct), 48, statY);

  // Small label under hero
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '18px system-ui, -apple-system, sans-serif';
  ctx.fillText('total return', 48, statY + 28);

  // Three secondary stats
  const stats = [
    { label: 'Invested', value: fmt(summary.totalInvested) },
    { label: 'Current value', value: fmt(summary.currentValue) },
    { label: 'Avg cost', value: fmt(summary.avgCost) },
  ];
  stats.forEach((s, i) => {
    const x = 48 + i * 280;
    const y = statY + 100;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '15px system-ui, -apple-system, sans-serif';
    ctx.fillText(s.label.toUpperCase(), x, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillText(s.value, x, y + 32);
  });

  // ── Sparkline chart ───────────────────────────────────────────────────────
  const chartX = 48, chartY = 360, chartW = W - 96, chartH = 180;

  if (chartData.length > 1) {
    const values = chartData.map(p => p.portfolioValue);
    const invested = chartData.map(p => p.totalInvested);
    const minV = Math.min(...values, ...invested);
    const maxV = Math.max(...values, ...invested);
    const range = maxV - minV || 1;

    const toX = (i: number) => chartX + (i / (chartData.length - 1)) * chartW;
    const toY = (v: number) => chartY + chartH - ((v - minV) / range) * chartH;

    // Invested area (flat rising line)
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(invested[0]));
    invested.forEach((v, i) => i > 0 && ctx.lineTo(toX(i), toY(v)));
    ctx.lineTo(toX(chartData.length - 1), chartY + chartH);
    ctx.lineTo(chartX, chartY + chartH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(invested[0]));
    invested.forEach((v, i) => i > 0 && ctx.lineTo(toX(i), toY(v)));
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Portfolio value gradient area
    const grad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
    grad.addColorStop(0, profitable ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(values[0]));
    values.forEach((v, i) => i > 0 && ctx.lineTo(toX(i), toY(v)));
    ctx.lineTo(toX(chartData.length - 1), chartY + chartH);
    ctx.lineTo(chartX, chartY + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Portfolio value line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(values[0]));
    values.forEach((v, i) => i > 0 && ctx.lineTo(toX(i), toY(v)));
    ctx.strokeStyle = returnColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // ── Bottom bar ────────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(48, H - 54); ctx.lineTo(W - 48, H - 54); ctx.stroke();

  const freqLabel = FREQ_LABELS[params.frequency] ?? params.frequency;
  const todayLabel = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const caption = `${fmt(params.amountUsd)} ${freqLabel.toLowerCase()} · ${fmtDate(params.startDate)} to ${todayLabel} · ${summary.buyCount} purchases`;
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '16px system-ui, -apple-system, sans-serif';
  ctx.fillText(caption, 48, H - 22);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.fillText('Simulated past performance · not financial advice', W - 48, H - 22);
  ctx.textAlign = 'left';
}

// ─── Share modal ─────────────────────────────────────────────────────────────

function ShareModal({
  imageUrl,
  shareUrl,
  result,
  onClose,
}: {
  imageUrl: string;
  shareUrl: string;
  result: SimResult;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { summary, asset, params } = result;
  const profitable = summary.totalReturn >= 0;

  const shareText = encodeURIComponent(
    `I simulated $${params.amountUsd}/${FREQ_LABELS[params.frequency]?.toLowerCase()} into ${asset.symbol} since ${fmtDate(params.startDate)} — ${fmtPct(summary.totalReturnPct)} return. Backtest yours:`
  );
  const encodedUrl = encodeURIComponent(shareUrl);

  const socials = [
    {
      label: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`,
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      color: 'hover:bg-gray-700 hover:text-white',
    },
    {
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${shareText}`,
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      color: 'hover:bg-[#229ED9]/20 hover:text-[#229ED9]',
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      color: 'hover:bg-[#1877F2]/20 hover:text-[#1877F2]',
    },
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
      color: 'hover:bg-[#0A66C2]/20 hover:text-[#0A66C2]',
    },
  ];

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadImage() {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `dcalog-${asset.symbol.toLowerCase()}-simulation.png`;
    a.click();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-sm font-semibold text-gray-100">Share your simulation</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {asset.symbol} · {fmtPct(summary.totalReturnPct)} · {summary.buyCount} purchases
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Image preview */}
        <div className="px-5 pt-4 pb-3">
          <div className="rounded-xl overflow-hidden border border-gray-800 bg-gray-950">
            <img src={imageUrl} alt="Share card preview" className="w-full block" />
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center">
            Download this image and attach it when sharing on social media
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 space-y-3">

          {/* Save image */}
          <button
            onClick={downloadImage}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            <Download size={15} />
            Save image
          </button>

          {/* Social share */}
          <div className="flex items-center gap-2">
            {socials.map(s => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                title={s.label}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-700 text-gray-400 text-xs font-medium transition-colors ${s.color}`}
              >
                {s.icon}
                <span className="hidden sm:inline">{s.label.split(' ')[0]}</span>
              </a>
            ))}
          </div>

          {/* Copy link */}
          <button
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 font-medium py-2.5 rounded-xl transition-colors text-sm"
          >
            {copied ? <><Check size={14} className="text-green-400" /> Link copied!</> : <><Link2 size={14} /> Copy link</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PublicSimulator() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [symbol,    setSymbol]    = useState(searchParams.get('symbol')    ?? 'BTC');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') ?? defaultStart());
  const [amountUsd, setAmountUsd] = useState(searchParams.get('amount')   ?? '100');
  const [frequency, setFrequency] = useState(searchParams.get('freq')     ?? 'WEEKLY');

  const [result,       setResult]       = useState<SimResult | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [generating,   setGenerating]   = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load asset list
  useEffect(() => {
    fetch(`${API_BASE}/public/simulator/assets`)
      .then(r => r.json())
      .then(d => setAssets(d.data ?? []))
      .catch(() => {});
  }, []);

  // Auto-run if params are in URL
  useEffect(() => {
    if (searchParams.get('symbol')) {
      runSimulationWith(symbol, startDate, amountUsd, frequency);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSimulationWith = useCallback(async (
    sym: string, start: string, amount: string, freq: string,
  ) => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) { setError('Enter a valid amount.'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const params = new URLSearchParams({ symbol: sym, startDate: start, amountUsd: String(amountNum), frequency: freq });
      const res = await fetch(`${API_BASE}/public/simulator?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Simulation failed.');
      setResult(json.data);
      router.replace(`?symbol=${sym}&startDate=${start}&amount=${amountNum}&freq=${freq}`, { scroll: false });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Simulation failed.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const runSimulation = useCallback(() => {
    runSimulationWith(symbol, startDate, amountUsd, frequency);
  }, [runSimulationWith, symbol, startDate, amountUsd, frequency]);

  const handleShare = useCallback(() => {
    if (!result || !canvasRef.current) return;
    setGenerating(true);
    drawShareCard(canvasRef.current, result);
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setShareImageUrl(dataUrl);
    setShowShareModal(true);
    setGenerating(false);
  }, [result]);

  const profitable  = result ? result.summary.totalReturn >= 0 : true;
  const accentColor = ASSET_COLORS[symbol] ?? '#7c3aed';
  const shareUrl    = typeof window !== 'undefined' ? window.location.href : '';

  // Thin chart data for performance
  const chartData = result ? (result.chartData.length > 120
    ? result.chartData.filter((_, i) => i % Math.ceil(result.chartData.length / 120) === 0)
    : result.chartData) : [];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <PublicNavbar />

      {/* Hidden canvas for share image generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Share modal */}
      {showShareModal && shareImageUrl && result && (
        <ShareModal
          imageUrl={shareImageUrl}
          shareUrl={shareUrl}
          result={result}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          Free tool
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-gray-50 mb-4 leading-tight">
          DCA Simulator
        </h1>
        <p className="text-lg text-gray-400 max-w-xl mx-auto">
          See what would have happened if you invested a fixed amount regularly into any major crypto asset.
        </p>
      </section>

      {/* Form */}
      <section className="max-w-3xl mx-auto px-6 pb-10">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">

            {/* Asset */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-500 mb-1.5">Asset</label>
              <select
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
              >
                {assets.map(a => (
                  <option key={a.symbol} value={a.symbol}>{a.symbol} — {a.name}</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Amount (USD)</label>
              <input
                type="number" min="1" step="1" value={amountUsd}
                onChange={e => setAmountUsd(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
                placeholder="100"
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Frequency</label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Bi-weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="DAILY">Daily</option>
              </select>
            </div>

            {/* Start date */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Start date</label>
              <input
                type="date" value={startDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <button
            onClick={runSimulation}
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {loading ? 'Running simulation...' : 'Run simulation'}
          </button>

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
      </section>

      {/* Results */}
      {result && (
        <section className="max-w-3xl mx-auto px-6 pb-20 space-y-6">

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total return',   value: fmtPct(result.summary.totalReturnPct), highlight: true, positive: profitable },
              { label: 'Current value',  value: fmt(result.summary.currentValue) },
              { label: 'Total invested', value: fmt(result.summary.totalInvested) },
              { label: 'Avg cost',       value: fmt(result.summary.avgCost) },
              { label: 'Best buy',       value: fmt(result.summary.bestBuyPrice) },
              { label: 'Purchases',      value: String(result.summary.buyCount) },
            ].map(card => (
              <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                <p className={`text-xl font-bold font-mono ${
                  card.highlight
                    ? card.positive ? 'text-green-400' : 'text-red-400'
                    : 'text-gray-100'
                }`}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-100">Portfolio growth</h2>
                <p className="text-xs text-gray-500 mt-0.5">{fmtDate(result.summary.firstBuyDate)} to {fmtDate(result.summary.lastBuyDate)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {profitable
                  ? <TrendingUp size={16} className="text-green-400" />
                  : <TrendingDown size={16} className="text-red-400" />}
                <span className={`text-sm font-bold font-mono ${profitable ? 'text-green-400' : 'text-red-400'}`}>
                  {fmtPct(result.summary.totalReturnPct)}
                </span>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={profitable ? '#4ade80' : '#f87171'} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={profitable ? '#4ade80' : '#f87171'} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6b7280" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickFormatter={v => v.slice(0, 7)} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickFormatter={v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} width={60} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                    labelStyle={{ color: '#9ca3af', fontSize: 12 }}
                    formatter={(v: number, name: string) => [fmt(v), name === 'portfolioValue' ? 'Portfolio' : 'Invested']}
                  />
                  <Legend formatter={v => v === 'portfolioValue' ? 'Portfolio value' : 'Total invested'}
                    wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
                  <Area type="monotone" dataKey="totalInvested" stroke="#6b7280" strokeWidth={1.5}
                    fill="url(#gInv)" dot={false} />
                  <Area type="monotone" dataKey="portfolioValue"
                    stroke={profitable ? '#4ade80' : '#f87171'} strokeWidth={2}
                    fill="url(#gVal)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Share bar */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-100 mb-0.5">Share this result</p>
                <p className="text-xs text-gray-500">Generate a share card, post on social media, or copy the link.</p>
              </div>
              <button
                onClick={handleShare}
                disabled={generating}
                className="shrink-0 flex items-center gap-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-60 px-4 py-2.5 rounded-xl transition-colors"
              >
                {generating
                  ? <span className="animate-pulse">Generating...</span>
                  : <><Share2 size={13} /> Share</>}
              </button>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl px-6 py-8 text-center">
            <h3 className="text-base font-semibold text-gray-100 mb-2">Track your real DCA purchases</h3>
            <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
              Log actual buys, track your cost basis, set drawdown rules, and see your real P&L — free to use.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
            >
              Get started free <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

      {!result && !loading && (
        <section className="max-w-3xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { symbol: 'BTC', preset: { amount: '100', freq: 'WEEKLY',  start: '2020-01-01' }, label: '$100/week since 2020' },
              { symbol: 'ETH', preset: { amount: '50',  freq: 'WEEKLY',  start: '2021-01-01' }, label: '$50/week since 2021' },
              { symbol: 'SOL', preset: { amount: '100', freq: 'MONTHLY', start: '2022-01-01' }, label: '$100/month since 2022' },
            ].map(p => (
              <button
                key={p.symbol}
                onClick={() => {
                  setSymbol(p.symbol);
                  setAmountUsd(p.preset.amount);
                  setFrequency(p.preset.freq);
                  setStartDate(p.preset.start);
                  runSimulationWith(p.symbol, p.preset.start, p.preset.amount, p.preset.freq);
                }}
                className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors text-left"
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: (ASSET_COLORS[p.symbol] ?? '#7c3aed') + '22', color: ASSET_COLORS[p.symbol] ?? '#7c3aed' }}>
                  {p.symbol.slice(0, 2)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-200">{p.symbol}</p>
                  <p className="text-xs text-gray-500">{p.label}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <PublicFooter />
    </div>
  );
}
