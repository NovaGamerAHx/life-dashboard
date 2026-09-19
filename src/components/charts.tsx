import { toFa } from '../lib/jalali';

/** عدد فشرده فارسی برای برچسب محورها (۱٫۲هـ / ۳٫۴م) */
function compact(v: number): string {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `${toFa(Number.isInteger(m) ? m : m.toFixed(1))} م`;
  }
  if (v >= 1_000) {
    const k = v / 1_000;
    return `${toFa(Number.isInteger(k) ? k : k.toFixed(1))} هـ`;
  }
  return toFa(v);
}

/** نمودار میله‌ای عمودی — SVG/HTML خالص، بدون کتابخانه */
export function Bars({
  data, height = 170, formatTick,
}: {
  data: Array<{ label: string; value: number; color?: string; dim?: boolean }>;
  height?: number;
  formatTick?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <div className="flex items-end gap-2 overflow-x-auto pb-1" style={{ height }} dir="ltr">
        {data.map((d, i) => (
          <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="tabular text-[10px] font-bold text-slate-400">
              {formatTick ? formatTick(d.value) : d.value > 0 ? toFa(compact(d.value)) : ''}
            </span>
            <div
              className="w-full max-w-[46px] rounded-t-lg transition-all"
              title={`${d.label}: ${d.value.toLocaleString('fa-IR')}`}
              style={{
                height: `${Math.max(d.value > 0 ? 6 : 2, (d.value / max) * 100)}%`,
                background: d.color ?? '#10b981',
                opacity: d.dim ? 0.35 : 1,
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
    </div>
  );
}
