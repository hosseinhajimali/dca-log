import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useFearGreed } from '@/hooks/useFearGreed';

// ── Zone definitions ─────────────────────────────────────────────────────────
const ZONES = [
  { from: 0,  to: 25,  color: '#ef4444', label: 'Extreme Fear' },
  { from: 25, to: 46,  color: '#f97316', label: 'Fear' },
  { from: 46, to: 54,  color: '#eab308', label: 'Neutral' },
  { from: 54, to: 75,  color: '#84cc16', label: 'Greed' },
  { from: 75, to: 100, color: '#22c55e', label: 'Extreme Greed' },
];

function zoneColor(value: number) {
  return ZONES.find(z => value <= z.to)?.color ?? '#22c55e';
}
function zoneLabel(value: number) {
  return ZONES.find(z => value <= z.to)?.label ?? 'Extreme Greed';
}

// ── Gauge SVG helpers ─────────────────────────────────────────────────────────
// The gauge is a top-semicircle: 0 = far left, 100 = far right.
// angle(v) goes from π (left) to 0 (right) as v goes 0→100.
function gaugePoint(cx: number, cy: number, r: number, value: number) {
  const a = (1 - value / 100) * Math.PI;
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
}

function arcPath(cx: number, cy: number, r: number, v1: number, v2: number) {
  const p1 = gaugePoint(cx, cy, r, v1);
  const p2 = gaugePoint(cx, cy, r, v2);
  // arc spans at most 180° → largeArc always 0; sweep=1 (clockwise through top)
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function FngTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value as number;
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="font-bold" style={{ color: zoneColor(v) }}>
        {v}: {zoneLabel(v)}
      </p>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function FearGreedWidget() {
  const { data, isLoading } = useFearGreed();

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
        <div className="h-4 w-40 bg-gray-800 rounded mb-4" />
        <div className="h-44 bg-gray-800 rounded" />
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const current = parseInt(data[0].value);
  const color   = zoneColor(current);
  const label   = zoneLabel(current);

  // History: API returns newest-first → reverse for the chart
  const history = [...data].reverse().map(d => ({
    date:  new Date(parseInt(d.timestamp) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: parseInt(d.value),
  }));

  // Gauge geometry
  const cx = 100, cy = 100, r = 76;
  const needle    = gaugePoint(cx, cy, r - 16, current);
  const needleTip = gaugePoint(cx, cy, r - 4,  current);

  const updatedDate = new Date(parseInt(data[0].timestamp) * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-300 mb-4">Fear &amp; Greed Index</h2>

      <div className="flex flex-col lg:flex-row items-center gap-6">

        {/* ── Gauge ── */}
        <div className="flex flex-col items-center shrink-0">
          <svg viewBox="0 0 200 110" className="w-52">
            {/* Background zone arcs */}
            {ZONES.map((z, i) => (
              <path
                key={i}
                d={arcPath(cx, cy, r, z.from, z.to)}
                fill="none"
                stroke={z.color}
                strokeWidth="14"
                strokeLinecap="butt"
                strokeOpacity="0.22"
              />
            ))}

            {/* Needle shadow */}
            <line
              x1={cx} y1={cy} x2={needleTip.x} y2={needleTip.y}
              stroke="#000" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.35"
            />
            {/* Needle */}
            <line
              x1={needle.x} y1={needle.y} x2={needleTip.x} y2={needleTip.y}
              stroke={color} strokeWidth="2.5" strokeLinecap="round"
            />
            <line
              x1={cx} y1={cy} x2={needle.x} y2={needle.y}
              stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.5"
            />

            {/* Center hub */}
            <circle cx={cx} cy={cy} r="7" fill={color} />
            <circle cx={cx} cy={cy} r="3.5" fill="#111827" />
          </svg>

          {/* Score + label */}
          <div className="text-center -mt-1">
            <span className="text-5xl font-bold font-mono" style={{ color }}>{current}</span>
            <p className="text-sm font-semibold mt-1" style={{ color }}>{label}</p>
            <p className="text-xs text-gray-600 mt-0.5">{updatedDate}</p>
          </div>
        </div>

        {/* ── 30-day line chart ── */}
        <div className="flex-1 w-full min-w-0">
          <p className="text-xs text-gray-500 mb-2">30-day history</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fill: '#4b5563', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 46, 54, 75, 100]}
                tick={{ fill: '#4b5563', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              {/* Zone boundaries */}
              {[25, 46, 54, 75].map(v => (
                <ReferenceLine
                  key={v} y={v}
                  stroke={zoneColor(v - 1)}
                  strokeDasharray="3 3"
                  strokeOpacity={0.25}
                />
              ))}
              <Tooltip content={<FngTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Zone legend */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {ZONES.map(z => (
              <div key={z.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: z.color, opacity: 0.7 }} />
                {z.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
