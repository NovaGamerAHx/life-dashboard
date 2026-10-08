import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { toFa } from '../lib/jalali';
import { compactFa } from '../lib/utils';

/*
 * نمودارها: عرض از طریق ResizeObserver اندازه‌گیری می‌شود و SVG
 * با همان عرض واقعی رسم می‌شود (بدون کشیده‌شدن viewBox و بدون
 * کوچک‌شدن متن‌ها). رنگ‌ها از توکن‌های تم می‌آیند تا در تیره هم خوانا باشند.
 */

export interface Slice {
  label: string;
  value: number;
  color: string;
}

/** عرض واقعی یک عنصر را دنبال می‌کند؛ قبل از اندازه‌گیری صفر است */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const width = Math.floor(entries[0]?.contentRect.width ?? 0);
      setW(width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
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
    <div
      role="img"
      aria-label={[centerTop, centerBottom].filter(Boolean).join(': ') || 'نمودار دایره‌ای'}
      className="relative mx-auto inline-grid max-w-full place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={thickness} className="stroke-sunken" />
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
                <title>{`${s.label}: ${toFa(s.value)}`}</title>
              </circle>
            ) : null,
          )
        ) : (
          <circle cx={c} cy={c} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={thickness} strokeDasharray={`${C * 0.75} ${C}`} strokeLinecap="round" opacity={0.35} />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center p-6">
        <div className="min-w-0 text-center">
          {centerTop && <div className="text-xs font-bold text-muted">{centerTop}</div>}
          {centerBottom && <div className="num text-lg font-black text-ink">{centerBottom}</div>}
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
  values, labels, height = 150, idSuffix = '',
}: {
  values: number[];
  labels: string[];
  height?: number;
  color?: string;
  idSuffix?: string;
}) {
  const gid = useId() + idSuffix;
  const [ref, W] = useWidth<HTMLDivElement>();
  const H = height;
  const PAD = 10;
  const BOTTOM = 26;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = useMemo(
    () =>
      values.map((v, i) => ({
        x: values.length === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (values.length - 1),
        y: PAD + (1 - (v - min) / span) * (H - PAD - BOTTOM),
      })),
    [values, min, span, W, H],
  );
  const line = smoothPath(pts);
  const base = H - BOTTOM;
  const area = `${line} L ${pts[pts.length - 1]?.x ?? 0} ${base} L ${pts[0]?.x ?? 0} ${base} Z`;
  const maxLabels = Math.max(2, Math.floor(W / 60));
  const step = Math.max(1, Math.ceil(labels.length / maxLabels));
  return (
    <div ref={ref} dir="ltr" className="w-full min-w-0" style={{ height: H }}>
      {W > 0 && (
        <svg width={W} height={H} role="img" aria-label="نمودار روند">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--c-chart)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--c-chart)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {[0.25, 0.55, 0.85].map((f) => (
            <line key={f} x1={PAD} x2={W - PAD} y1={base * f} y2={base * f} className="stroke-grid" strokeDasharray="3 5" strokeWidth={1} />
          ))}
          {values.length > 0 && <path d={area} fill={`url(#${gid})`} />}
          {values.length > 0 && <path d={line} fill="none" className="stroke-chart" strokeWidth={2.5} strokeLinecap="round" />}
          {pts.map((p, i) =>
            values[i] > 0 ? (
              <circle key={i} cx={p.x} cy={p.y} r={3.5} className="fill-chart stroke-surface" strokeWidth={2}>
                <title>{`${labels[i]}: ${toFa(values[i])}`}</title>
              </circle>
            ) : null,
          )}
          {labels.map((l, i) =>
            i % step === 0 || i === labels.length - 1 ? (
              <text key={i} x={pts[i]?.x ?? 0} y={H - 8} textAnchor="middle" fontSize={12} className="fill-muted" fontFamily="inherit">
                {l}
              </text>
            ) : null,
          )}
        </svg>
      )}
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
  const n = data.length;
  // در سری‌های طولانی، فقط برچسب‌های تکی نشان داده می‌شوند تا شلوغ نشود
  const labelStep = n > 16 ? Math.ceil(n / 10) : 1;
  const showValues = n <= 20;
  return (
    <div className="min-w-0">
      <div className="relative flex items-end gap-1.5 pb-1 sm:gap-2" style={{ height }} dir="ltr">
        {showAvg && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted/60"
            style={{ bottom: `${(avg! / max) * 100}%` }}
            aria-hidden="true"
          />
        )}
        {data.map((d, i) => (
          <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-stretch justify-end gap-1">
            {showValues && (
              <span className="num h-4 whitespace-nowrap text-center text-[11px] font-bold leading-4 text-muted">
                {d.value > 0 ? (formatTick ? formatTick(d.value) : toFa(compactFa(d.value))) : ''}
              </span>
            )}
            <div
              className="mx-auto w-full max-w-[44px] rounded-t-lg transition-[height] duration-500"
              title={d.hint ?? `${d.label}: ${toFa(d.value)}`}
              style={{
                height: `${Math.max(d.value > 0 ? 6 : 2, (d.value / max) * 100)}%`,
                background: d.color ?? 'var(--c-chart)',
                opacity: d.dim ? 0.3 : 1,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 border-t border-line pt-1.5 sm:gap-2" dir="ltr">
        {data.map((d, i) => (
          <div key={i} className="min-w-0 flex-1 text-center text-[11px] font-bold leading-4 text-muted">
            {i % labelStep === 0 ? <span className="block truncate">{d.label}</span> : null}
          </div>
        ))}
      </div>
      {showAvg && (
        <p className="t-caption mt-2 text-center font-bold text-muted">
          خط‌چین: {averageLabel} روزهای دارای مقدار ({toFa(compactFa(Math.round(avg! * 10) / 10))})
        </p>
      )}
    </div>
  );
}

/**
 * روند نمره‌ها با پشتیبانی از روزهای بدون داده (شکاف در خط)
 * عرض از کانتینر خوانده می‌شود، بنابراین متن‌ها روی موبایل کوچک نمی‌شوند.
 */
export function ScoreTrend({
  points, height = 200, max = 10,
}: {
  points: Array<{ label: string; value: number | null; hint: string }>;
  height?: number;
  max?: number;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const H = height;
  const PAD_L = 28;
  const PAD_R = 12;
  const TOP = 12;
  const BOTTOM = 28;
  const innerW = Math.max(W - PAD_L - PAD_R, 1);
  const innerH = H - TOP - BOTTOM;
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;
  const x = (i: number) => PAD_L + i * step;
  const y = (v: number) => TOP + (1 - v / max) * innerH;
  const gid = useId();

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

  // تعداد برچسب‌ها بر اساس عرض واقعی
  const maxLabels = Math.max(2, Math.floor(W / 58));
  const tick = Math.max(1, Math.ceil(points.length / maxLabels));

  return (
    <div ref={ref} dir="ltr" className="w-full min-w-0" style={{ height: H }}>
      {W > 0 && (
        <svg width={W} height={H} role="img" aria-label="روند نمره‌ها">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--c-chart)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--c-chart)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {[0, 5, 10].map((v) => (
            <g key={v}>
              <line
                x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)}
                className="stroke-grid"
                strokeDasharray={v === 5 ? '3 5' : '0'}
                strokeWidth={1}
              />
              <text x={PAD_L - 6} y={y(v) + 4} textAnchor="end" fontSize={11} className="fill-muted" fontFamily="inherit">
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
                <path d={line} fill="none" className="stroke-chart" strokeWidth={2.6} strokeLinecap="round" />
              </g>
            );
          })}
          {points.map((p, i) => (
            <g key={i}>
              {p.value != null ? (
                <circle cx={x(i)} cy={y(p.value)} r={3.6} strokeWidth={2} className="fill-chart stroke-surface">
                  <title>{p.hint}</title>
                </circle>
              ) : (
                <circle cx={x(i)} cy={TOP + innerH - 3} r={2} className="fill-line-strong">
                  <title>{p.hint}</title>
                </circle>
              )}
              {(i % tick === 0 || i === points.length - 1) && (
                <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} className="fill-muted" fontFamily="inherit">
                  {p.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

/** راهنمای رنگی */
export function Legend({ items, format }: { items: Slice[]; format?: (v: number) => string }) {
  const total = items.reduce((a, d) => a + d.value, 0) || 1;
  return (
    <ul className="space-y-2">
      {items.slice(0, 8).map((d, i) => (
        <li key={i} className="flex min-w-0 items-center gap-2 text-xs">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate font-bold text-ink-2">{d.label}</span>
          <span className="num shrink-0 font-black text-ink">
            {format ? format(d.value) : toFa(d.value)}
          </span>
          <span className="num w-10 shrink-0 text-start text-[11px] font-bold text-muted">{toFa(Math.round((d.value / total) * 100))}٪</span>
        </li>
      ))}
    </ul>
  );
}

/** اسپارک‌لاین کوچک برای کارت‌های آماری */
export function Sparkline({
  values, color = 'var(--c-chart)', height = 34,
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
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden="true">
      <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
