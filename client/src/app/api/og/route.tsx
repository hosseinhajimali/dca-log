import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Server-side API URL - set API_URL on Vercel (no NEXT_PUBLIC_ prefix needed here)
const API_BASE = process.env.API_URL
  ? `${process.env.API_URL}/api`
  : process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : 'http://localhost:5000/api';

const ASSET_COLORS: Record<string, string> = {
  BTC: '#f7931a', ETH: '#627eea', SOL: '#9945ff', BNB: '#f3ba2f',
  XRP: '#00aae4', ADA: '#0033ad', DOGE: '#c2a633', LINK: '#2a5ada',
  AVAX: '#e84142', LTC: '#bfbbbb', DOT: '#e6007a', NEAR: '#00c08b',
  ARB: '#28a0f0', TON: '#0088cc', TRX: '#ef0027', UNI: '#ff007a',
  ATOM: '#6f7390', INJ: '#00b2ff', SUI: '#4da2ff',
};

const FREQ_LABELS: Record<string, string> = {
  WEEKLY: 'weekly', BIWEEKLY: 'bi-weekly', MONTHLY: 'monthly', DAILY: 'daily',
};

const FEATURED = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'];

interface SimSummary {
  totalInvested: number; currentValue: number;
  totalReturn: number; totalReturnPct: number;
  buyCount: number; avgCost: number;
}
interface ChartPoint { date: string; totalInvested: number; portfolioValue: number }
interface SimResult {
  asset: { symbol: string; name: string };
  params: { startDate: string; amountUsd: number; frequency: string };
  summary: SimSummary;
  chartData: ChartPoint[];
}

function fmt(n: number) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(1) + 'k';
  return '$' + n.toFixed(2);
}
function fmtPct(n: number) { return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'; }

// Build an SVG polyline path string from chart data
function buildSparkline(data: ChartPoint[], W: number, H: number) {
  if (data.length < 2) return { valuePath: '', investedPath: '' };
  const values   = data.map(p => p.portfolioValue);
  const invested = data.map(p => p.totalInvested);
  const allVals  = [...values, ...invested];
  const minV = Math.min(...allVals);
  const maxV = Math.max(...allVals);
  const range = maxV - minV || 1;

  const toX = (i: number) => (i / (data.length - 1)) * W;
  const toY = (v: number) => H - ((v - minV) / range) * H;

  const valuePath   = values.map((v, i)   => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const investedPath = invested.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

  return { valuePath, investedPath };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol = (searchParams.get('symbol') ?? '').toUpperCase();
  const amount = searchParams.get('amount');
  const freq   = searchParams.get('freq');
  const start  = searchParams.get('startDate');

  const accent    = ASSET_COLORS[symbol] ?? '#7c3aed';
  const hasParams = symbol && amount && freq && start;

  // ── Try to fetch real simulation result ──────────────────────────────────────
  let simResult: SimResult | null = null;

  if (hasParams) {
    try {
      const qs = new URLSearchParams({ symbol, startDate: start, amountUsd: amount, frequency: freq });
      const res = await fetch(`${API_BASE}/public/simulator?${qs}`, {
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json();
      if (json.success) simResult = json.data as SimResult;
    } catch {
      // fall through to params-only card
    }
  }

  // ── Thin chart data ──────────────────────────────────────────────────────────
  const chartData = simResult
    ? (simResult.chartData.length > 80
        ? simResult.chartData.filter((_, i) => i % Math.ceil(simResult!.chartData.length / 80) === 0)
        : simResult.chartData)
    : [];

  const CW = 1060, CH = 120;
  const { valuePath, investedPath } = buildSparkline(chartData, CW, CH);
  const profitable = simResult ? simResult.summary.totalReturn >= 0 : true;
  const returnColor = profitable ? '#4ade80' : '#f87171';
  const freqLabel = freq ? (FREQ_LABELS[freq] ?? freq.toLowerCase()) : '';
  const startYear = start ? start.slice(0, 4) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px', height: '630px',
          background: '#0a0a0f',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Left accent bar */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: '6px', height: '630px', background: accent }} />

        {simResult ? (
          /* ══ RESULTS CARD ══════════════════════════════════════════════════════ */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', padding: '44px 64px 28px', alignItems: 'flex-start', justifyContent: 'space-between' }}>

              {/* Left: branding + return */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px' }}>
                  <span style={{ color: '#fff', fontSize: '20px', fontWeight: 700 }}>DCAlog</span>
                  <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 8px', fontSize: '20px' }}>·</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '16px' }}>DCA Simulator</span>
                </div>
                {/* Hero return */}
                <div style={{ color: returnColor, fontSize: '86px', fontWeight: 800, lineHeight: 1, letterSpacing: '-2px' }}>
                  {fmtPct(simResult.summary.totalReturnPct)}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px', marginTop: '8px' }}>
                  total return
                </div>
              </div>

              {/* Right: asset + params */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ color: accent, fontSize: '52px', fontWeight: 800, lineHeight: 1 }}>
                  {simResult.asset.symbol}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '17px', marginTop: '6px' }}>
                  {simResult.asset.name}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '15px', marginTop: '10px' }}>
                  {fmt(simResult.params.amountUsd)} {freqLabel}{startYear ? ` since ${startYear}` : ''}
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '16px', padding: '0 64px', marginBottom: '24px' }}>
              {[
                { label: 'INVESTED',      value: fmt(simResult.summary.totalInvested) },
                { label: 'CURRENT VALUE', value: fmt(simResult.summary.currentValue) },
                { label: 'AVG COST',      value: fmt(simResult.summary.avgCost) },
                { label: 'PURCHASES',     value: String(simResult.summary.buyCount) },
              ].map(s => (
                <div
                  key={s.label}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>
                    {s.label}
                  </span>
                  <span style={{ color: '#ffffff', fontSize: '22px', fontWeight: 700, marginTop: '4px' }}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Sparkline */}
            {chartData.length > 1 && (
              <div style={{ padding: '0 64px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                {/* @ts-ignore */}
                <svg width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`} style={{ overflow: 'visible' }}>
                  {/* Invested line */}
                  {/* @ts-ignore */}
                  <path d={investedPath} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                  {/* Portfolio line */}
                  {/* @ts-ignore */}
                  <path d={valuePath} fill="none" stroke={returnColor} strokeWidth="2.5" />
                </svg>
              </div>
            )}

            {/* Bottom bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 64px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              marginTop: '12px',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '14px' }}>dcalog.com/tools/simulator</span>
              <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: '12px' }}>Past performance is not financial advice</span>
            </div>
          </div>

        ) : hasParams ? (
          /* ══ PARAMS-ONLY CARD (API failed) ════════════════════════════════════ */
          <div style={{ display: 'flex', flexDirection: 'column', padding: '56px 72px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '52px' }}>
              <span style={{ color: '#fff', fontSize: '22px', fontWeight: 700 }}>DCAlog</span>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '22px', margin: '0 10px' }}>·</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px' }}>DCA Simulator</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px', marginBottom: '20px' }}>
              <span style={{ color: accent, fontSize: '80px', fontWeight: 800, lineHeight: 1 }}>{symbol}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '28px' }}>DCA backtest</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '30px', fontWeight: 500 }}>
              {fmt(Number(amount))} {freqLabel}{startYear ? ` since ${startYear}` : ''}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: '20px', marginTop: 'auto' }}>
              Run your own simulation free at dcalog.com
            </div>
          </div>

        ) : (
          /* ══ GENERIC CARD ══════════════════════════════════════════════════════ */
          <div style={{ display: 'flex', flexDirection: 'column', padding: '56px 72px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '52px' }}>
              <span style={{ color: '#fff', fontSize: '22px', fontWeight: 700 }}>DCAlog</span>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '22px', margin: '0 10px' }}>·</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px' }}>DCA Simulator</span>
            </div>
            <div style={{ color: '#fff', fontSize: '68px', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-1.5px', marginBottom: '24px' }}>
              DCA Simulator
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '26px', maxWidth: '680px', lineHeight: 1.4, marginBottom: 'auto' }}>
              Backtest any DCA strategy on real historical crypto prices. Free, no account needed.
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '40px' }}>
              {FEATURED.map(s => (
                <div
                  key={s}
                  style={{
                    background: (ASSET_COLORS[s] ?? '#7c3aed') + '20',
                    border: `1px solid ${ASSET_COLORS[s] ?? '#7c3aed'}40`,
                    color: ASSET_COLORS[s] ?? '#7c3aed',
                    borderRadius: '10px', padding: '8px 18px',
                    fontSize: '18px', fontWeight: 700,
                  }}
                >
                  {s}
                </div>
              ))}
              <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '18px', padding: '8px 10px', display: 'flex', alignItems: 'center' }}>
                +14 more
              </div>
            </div>
            {/* Bottom bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: '40px', paddingTop: '20px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '15px' }}>dcalog.com/tools/simulator</span>
              <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: '13px' }}>Past performance is not financial advice</span>
            </div>
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
