import { useId, useMemo } from 'react';
import { toFa } from '../lib/jalali';
import { compactFa } from '../lib/utils';

export interface Slice {
  label: string;
  value: number;
  color: string;
}

/** دونات — SVG خالص، بدون کتابخانه */
export function Donut({
  data, size = 190, thickness = 26, centerTop, centerBottom,
}: {
  data: Slice[];
  size?: number;
  thickness?: number;
  centerTop?: string;
  centerBottom?: string;
}) {
  const gid = useId();
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = (size - thickness) / 2;
  const c = size / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  const segs = data.map((d) => {
    const frac = total > 0 ? d.value / total : 0;
    const s = { ...d, dash: frac * C, off: acc * C };
    acc += frac;
    return s;
  });
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={thickness} className="stroke-slate-100 dark:stroke-white/10" />
        {total > 0 ? (
          segs.map((s, i) =>
            s.dash > 0.5 ? (
              <circle
                key={i}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeLinecap="butt"
                strokeDasharray={`${Math.max(s.dash - 1.5, 0.5)} ${C - Math.max(s.dash - 1.5, 0.5)}`}
                strokeDashoffset={-s.off}
              >
                <title>{`${s.label}: ${s.value.toLocaleString('fa-IR')}`}</title>
              </circle>
            ) : null,
          )
        ) : (
          <circle cx={c} cy={c} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={thickness} strokeDasharray={`${C * 0.75} ${C}`} strokeLinecap="round" opacity={0.35} />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          {centerTop && <div className="text-[11px] font-bold text-slate-400">{centerTop}</div>}
          {centerBottom && <div className="tabular text-lg font-black text-slate-800 dark:text-white">{centerBottom}</div>}
        </div>
      </div>
    </div>
  );
}

function smoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** نمودار سطحی روند */
export function AreaChart({
  values, labels, height = 150, color = '#10b981', idSuffix = '',
}: {
  values: number[];
  labels: string[];
  height?: number;
  color?: string;
  idSuffix?: string;
}) {
  const gid = useId() + idSuffix;
  const W = 600;
  const H = 200;
  const PAD = 8;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = useMemo(
    () =>
      values.map((v, i) => ({
        x: values.length === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (values.length - 1),
        y: PAD + (1 - (v - min) / span) * (H - PAD * 2 - 26),
      })),
    [values, min, span],
  );
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1]?.x ?? 0} ${H - 24} L ${pts[0]?.x ?? 0} ${H - 24} Z`;
  const step = Math.max(1, Math.floor(labels.length / 7));
  return (
    <div dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {[0.25, 0.55, 0.85].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} className="stroke-slate-200 dark:stroke-white/10" strokeDasharray="3 5" strokeWidth={1} />
        ))}
        {values.length > 0 && <path d={area} fill={`url(#${gid})`} />}
        {values.length > 0 && <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />}
        {pts.map((p, i) =>
          values[i] > 0 ? (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} strokeWidth={2} className="stroke-white dark:stroke-slate-900">
              <title>{`${labels[i]}: ${values[i].toLocaleString('fa-IR')}`}</title>
            </circle>
          ) : null,
        )}
        {labels.map((l, i) =>
          i % step === 0 || i === labels.length - 1 ? (
            <text key={i} x={pts[i]?.x ?? 0} y={H - 8} textAnchor="middle" fontSize={13} className="fill-slate-400" fontFamily="Vazirmatn">
              {l}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

/** نمودار میله‌ای عمودی — هر میله می‌تواند راهنمای اختصاصی و حالت «خالی» داشته باشد */
export function Bars({
  data, height = 170, formatTick, averageLabel = 'میانگین',
}: {
  data: Array<{ label: string; value: number; color?: string; dim?: boolean; hint?: string }>;
  height?: number;
  formatTick?: (v: number) => string;
  /** اگر عدد بدهید، خط میانگین رسم می‌شود */
  averageLabel?: string | null;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const defined = data.filter((d) => !d.dim && d.value > 0);
  const avg = defined.length ? defined.reduce((a, d) => a + d.value, 0) / defined.length : null;
  const showAvg = averageLabel != null && avg != null && data.length > 2;
  return (
    <div className="relative">
      <div className="relative flex items-end gap-2 pb-1" style={{ height }} dir="ltr">
        {showAvg && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-400/60 dark:border-white/25"
            style={{ bottom: `${(avg! / max) * 100}%` }}
          />
        )}
        {data.map((d, i) => (
          <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="tabular text-[10px] font-bold text-slate-400">
              {formatTick ? formatTick(d.value) : d.value > 0 ? toFa(compactFa(d.value)) : ''}
            </span>
            <div
              className="w-full max-w-[46px] rounded-t-lg transition-all"
              title={d.hint ?? `${d.label}: ${d.value.toLocaleString('fa-IR')}`}
              style={{
                height: `${Math.max(d.value > 0 ? 6 : 2, (d.value / max) * 100)}%`,
                background: d.color ?? '#10b981',
                opacity: d.dim ? 0.32 : 1,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto" dir="ltr">
        {data.map((d, i) => (
          <div key={i} className="min-w-0 flex-1 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
            <span className="block truncate">{d.label}</span>
          </div>
        ))}
      </div>
      {showAvg && (
        <p className="mt-1.5 text-center text-[10px] font-bold text-slate-400">
          خط‌چین: {averageLabel} روزهای دارای مقدار ({toFa(compactFa(Math.round(avg! * 10) / 10))})
        </p>
      )}
    </div>
  );
}

/**
 * روند نمره‌ها با پشتیبانی از روزهای بدون داده (شکاف در خط)
 * برای صفحه «تحلیل روزها» ساخته شده است.
 */
export function ScoreTrend({
  points, height = 200, max = 10,
}: {
  points: Array<{ label: string; value: number | null; hint: string }>;
  height?: number;
  max?: number;
}) {
  const gid = useId();
  const W = 720;
  const H = 220;
  const PAD_L = 26;
  const PAD_R = 10;
  const TOP = 12;
  const BOTTOM = 30;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - TOP - BOTTOM;
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;
  const x = (i: number) => PAD_L + i * step;
  const y = (v: number) => TOP + (1 - v / max) * innerH;

  // بخش‌های پیوسته (بدون شکاف) برای خط و سطح
  const segments = useMemo(() => {
    const out: Array<Array<{ i: number; v: number }>> = [];
    let cur: Array<{ i: number; v: number }> = [];
    points.forEach((p, i) => {
      if (p.value == null) {
        if (cur.length) out.push(cur);
        cur = [];
      } else {
        cur.push({ i, v: p.value });
      }
    });
    if (cur.length) out.push(cur);
    return out;
  }, [points]);

  const tick = Math.max(1, Math.ceil(points.length / 12));

  return (
    <div dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {/* خطوط راهنما */}
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <line
              x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)}
              className="stroke-slate-200 dark:stroke-white/10"
              strokeDasharray={v === 5 ? '3 5' : '0'}
              strokeWidth={1}
            />
            <text x={PAD_L - 6} y={y(v) + 4} textAnchor="end" fontSize={11} className="fill-slate-400" fontFamily="Vazirmatn">
              {toFa(v)}
            </text>
          </g>
        ))}
        {segments.map((seg, si) => {
          const pts = seg.map((p) => ({ x: x(p.i), y: y(p.v) }));
          const line = smoothPath(pts);
          const area = pts.length > 1
            ? `${line} L ${pts[pts.length - 1].x} ${TOP + innerH} L ${pts[0].x} ${TOP + innerH} Z`
            : '';
          return (
            <g key={si}>
              {area && <path d={area} fill={`url(#${gid})`} />}
              <path d={line} fill="none" stroke="#10b981" strokeWidth={2.6} strokeLinecap="round" />
            </g>
          );
        })}
        {points.map((p, i) => (
          <g key={i}>
            {p.value != null ? (
              <circle cx={x(i)} cy={y(p.value)} r={3.4} fill="#10b981" strokeWidth={2} className="stroke-white dark:stroke-slate-900">
                <title>{p.hint}</title>
              </circle>
            ) : (
              <circle cx={x(i)} cy={TOP + innerH - 3} r={2} className="fill-slate-300 dark:fill-white/20">
                <title>{p.hint}</title>
              </circle>
            )}
            {(i % tick === 0 || i === points.length - 1) && (
              <text x={x(i)} y={H - 10} textAnchor="middle" fontSize={11} className="fill-slate-400" fontFamily="Vazirmatn">
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/** راهنمای رنگی */
export function Legend({ items, format }: { items: Slice[]; format?: (v: number) => string }) {
  const total = items.reduce((a, d) => a + d.value, 0) || 1;
  return (
    <ul className="space-y-2">
      {items.slice(0, 8).map((d, i) => (
        <li key={i} className="flex items-center gap-2 text-xs">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
          <span className="flex-1 truncate font-bold text-slate-600 dark:text-slate-300">{d.label}</span>
          <span className="tabular font-black text-slate-700 dark:text-slate-100">
            {format ? format(d.value) : d.value.toLocaleString('fa-IR')}
          </span>
          <span className="tabular w-10 text-left text-[11px] text-slate-400">{toFa(Math.round((d.value / total) * 100))}٪</span>
        </li>
      ))}
    </ul>
  );
}

/** اسپارک‌لاین کوچک برای کارت‌های آماری */
export function Sparkline({
  values, color = '#10b981', height = 34,
}: {
  values: Array<number | null>;
  color?: string;
  height?: number;
}) {
  const W = 120;
  const H = 40;
  const nums = values.filter((v): v is number => v != null);
  if (nums.length < 2) return <div style={{ height }} />;
  const max = Math.max(...nums, 10);
  const min = Math.min(...nums, 0);
  const span = max - min || 1;
  const x = (i: number) => (values.length <= 1 ? W / 2 : (i * W) / (values.length - 1));
  const y = (v: number) => H - 4 - ((v - min) / span) * (H - 8);
  const pts = values
    .map((v, i) => (v == null ? null : { x: x(i), y: y(v) }))
    .filter((p): p is { x: number; y: number } => !!p);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none">
      <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  );
}
