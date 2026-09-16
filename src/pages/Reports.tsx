import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Wallet, Award, CalendarRange,
  ChevronRight, ChevronLeft, Download, Lightbulb, Target,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { useMoney } from '../lib/money';
import { toJalaali, J_MONTHS, toFa, startOfDay, toGregorian, addDays, todayStart } from '../lib/jalali';
import { sumTx, groupByCategory, dailySeries, exportRowsCsv, downloadText } from '../lib/stats';
import { CAT_COLORS } from '../lib/types';
import { Card, CardHead, Btn, Progress, Badge, Segmented } from '../components/ui';
import { Donut, Legend, AreaChart, Bars, compacFa } from '../components/charts';
import { cx } from '../lib/utils';

export default function Reports() {
  const { state } = useApp();
  const { withUnit, fmt } = useMoney();
  const cur = toJalaali(new Date());
  const [jy, setJy] = useState(cur.jy);
  const [jm, setJm] = useState(cur.jm);
  const [kind, setKind] = useState<'expense' | 'income'>('expense');

  const range = useMemo(() => {
    const s = startOfDay(toGregorian(jy, jm, 1).getTime());
    const nm = jm === 12 ? 1 : jm + 1;
    const ny = jm === 12 ? jy + 1 : jy;
    const e = startOfDay(toGregorian(ny, nm, 1).getTime()) - 1;
    return { start: s, end: e };
  }, [jy, jm]);

  const monthTx = useMemo(
    () => state.transactions.filter((t) => t.date >= range.start && t.date <= range.end),
    [state.transactions, range],
  );
  const inc = sumTx(monthTx, 'income');
  const exp = sumTx(monthTx, 'expense');
  const saveRate = inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0;

  // مقایسه با ماه قبل
  const prev = useMemo(() => {
    const pjm = jm === 1 ? 12 : jm - 1;
    const pjy = jm === 1 ? jy - 1 : jy;
    const s = startOfDay(toGregorian(pjy, pjm, 1).getTime());
    const e = startOfDay(toGregorian(jy, jm, 1).getTime()) - 1;
    const tx = state.transactions.filter((t) => t.date >= s && t.date <= e);
    return { inc: sumTx(tx, 'income'), exp: sumTx(tx, 'expense') };
  }, [state.transactions, jy, jm]);

  const groups = useMemo(() => groupByCategory(monthTx.filter((t) => t.type === kind)), [monthTx, kind]);
  const donut = groups.slice(0, 7).map((g) => ({ label: g.category, value: g.value, color: CAT_COLORS[g.category] ?? '#64748b' }));

  // روند ۶ ماه اخیر
  const sixMonths = useMemo(() => {
    const arr: Array<{ label: string; exp: number; inc: number }> = [];
    for (let i = 5; i >= 0; i--) {
      let yy = jy, mm = jm - i;
      while (mm < 1) { mm += 12; yy--; }
      const s = startOfDay(toGregorian(yy, mm, 1).getTime());
      const nm2 = mm === 12 ? 1 : mm + 1;
      const ny2 = mm === 12 ? yy + 1 : yy;
      const e = startOfDay(toGregorian(ny2, nm2, 1).getTime()) - 1;
      const tx = state.transactions.filter((t) => t.date >= s && t.date <= e);
      arr.push({ label: J_MONTHS[mm - 1].slice(0, 5), exp: sumTx(tx, 'expense'), inc: sumTx(tx, 'income') });
    }
    return arr;
  }, [state.transactions, jy, jm]);

  // میانگین روزانه + بیشترین روز
  const daily = useMemo(() => dailySeries(30, state.transactions, 'expense'), [state.transactions]);
  const avgDaily = daily.length ? Math.round(daily.reduce((a, d) => a + d.value, 0) / daily.length) : 0;
  const peak = daily.reduce((a, d) => (d.value > a.value ? d : a), { day: 0, value: 0 });

  const insights = useMemo(() => buildInsights(exp, prev.exp, inc, groups, avgDaily, saveRate), [exp, prev.exp, inc, groups, avgDaily, saveRate]);

  const shift = (d: number) => {
    let ny = jy, nm = jm + d;
    if (nm < 1) { nm = 12; ny--; }
    if (nm > 12) { nm = 1; ny++; }
    setJy(ny); setJm(nm);
  };

  const exportAll = () => {
    const rows = monthTx.map((t) => ({
      تاریخ: new Date(t.date).toLocaleDateString('fa-IR'),
      نوع: t.type === 'income' ? 'درآمد' : 'هزینه',
      عنوان: t.title,
      دسته: t.category,
      مبلغ_تومان: t.amount,
    }));
    downloadText(`report-${jy}-${jm}.csv`, exportRowsCsv(rows));
  };

  const expDelta = prev.exp > 0 ? Math.round(((exp - prev.exp) / prev.exp) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* انتخاب ماه */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => shift(-1)} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
            <ChevronRight size={18} />
          </button>
          <div className="min-w-0 flex-1 text-center sm:text-right">
            <h2 className="text-lg font-black text-slate-800 dark:text-white">گزارش {J_MONTHS[jm - 1]} {toFa(jy)}</h2>
            <p className="text-[11px] text-slate-400">{toFa(monthTx.length)} تراکنش در این ماه</p>
          </div>
          <Btn variant="outline" onClick={exportAll}><Download size={15} /> خروجی CSV</Btn>
          <button onClick={() => shift(1)} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
            <ChevronLeft size={18} />
          </button>
        </div>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi icon={<TrendingDown size={19} />} label="جمع هزینه" value={withUnit(exp)} delta={expDelta} invert c="from-rose-500 to-pink-600" />
        <Kpi icon={<TrendingUp size={19} />} label="جمع درآمد" value={withUnit(inc)} delta={prev.inc > 0 ? Math.round(((inc - prev.inc) / prev.inc) * 100) : 0} c="from-emerald-500 to-teal-600" />
        <Kpi icon={<Wallet size={19} />} label="خالص پس‌انداز" value={withUnit(inc - exp)} sub={`${toFa(saveRate)}٪ از درآمد`} c="from-sky-500 to-blue-600" />
        <Kpi icon={<CalendarRange size={19} />} label="میانگین هزینه روزانه" value={withUnit(avgDaily * 1)} sub="۳۰ روز اخیر" c="from-violet-500 to-purple-600" />
      </div>

      {/* عملکرد روزانه (بهره‌وری) */}
      <DailyPerfSection jy={jy} jm={jm} />

      {/* بینش‌ها */}
      {insights.length > 0 && (
        <Card>
          <CardHead title="بینش‌های هوشمند" sub="تحلیل خودکار رفتار مالی شما" />
          <ul className="space-y-2 px-5 pb-5">
            {insights.map((s, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-start gap-2.5 rounded-2xl bg-amber-500/[0.06] px-3.5 py-3 text-[12px] leading-6 text-slate-600 ring-1 ring-amber-500/15 dark:text-slate-300"
              >
                <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-500" />
                {s}
              </motion.li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHead
            title="ترکیب هزینه/درآمد"
            action={
              <Segmented
                value={kind}
                onChange={setKind}
                options={[{ v: 'expense', label: 'هزینه' }, { v: 'income', label: 'درآمد' }]}
              />
            }
          />
          <div className="flex flex-col items-center gap-4 px-5 pb-5">
            <Donut data={donut} size={180} centerTop={kind === 'expense' ? 'جمع هزینه' : 'جمع درآمد'} centerBottom={withUnit(kind === 'expense' ? exp : inc)} />
            {donut.length > 0 ? <div className="w-full"><Legend items={donut} money={(v) => fmt(v)} /></div> : <p className="text-xs text-slate-400">داده‌ای برای این ماه نیست</p>}
          </div>
        </Card>

        <Card>
          <CardHead title="روند ۶ ماه اخیر" sub="مقایسه درآمد و هزینه (میلیون تومان)" />
          <div className="space-y-4 px-5 pb-5">
            <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> هزینه</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> درآمد</span>
            </div>
            <Bars
              data={sixMonths.map((m, i) => ({ label: m.label, value: m.exp, color: i === sixMonths.length - 1 ? '#f43f5e' : '#fda4af' }))}
              formatTick={(v) => (v > 0 ? compacFa(v) : '')}
            />
            <p className="text-center text-[11px] text-slate-400">هزینه ماهانه (میله‌ها) — درآمد ماه جاری: <b className="tabular text-emerald-600">{withUnit(sixMonths[sixMonths.length - 1]?.inc ?? 0)}</b></p>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* بودجه‌ها */}
        <Card>
          <CardHead title="وضعیت بودجه‌ها" sub="پیشرفت مصرف سقف‌های این ماه" />
          <div className="space-y-3 px-5 pb-5">
            {state.budgets.length === 0 && <p className="rounded-2xl bg-slate-50 py-4 text-center text-xs text-slate-400 dark:bg-white/5">بودجه‌ای تعریف نشده است</p>}
            {state.budgets.map((b) => {
              const spent = monthTx.filter((t) => t.type === 'expense' && t.category === b.category).reduce((a, t) => a + t.amount, 0);
              const pct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;
              return (
                <div key={b.category}>
                  <div className="mb-1 flex justify-between text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-300">{b.category}</span>
                    <span className="tabular text-slate-400">{fmt(spent)} / {fmt(b.limit)}</span>
                  </div>
                  <Progress value={pct} color={pct > 100 ? '#f43f5e' : pct > 80 ? '#f59e0b' : '#10b981'} />
                </div>
              );
            })}
          </div>
        </Card>

        {/* رکوردها */}
        <Card>
          <CardHead title="رکوردهای ماه" sub="نکات برجسته این دوره" />
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            <Record icon={<Award size={18} />} label="پرهزینه‌ترین دسته" value={groups[0]?.category ?? '—'} sub={groups[0] ? withUnit(groups[0].value) : ''} c="bg-amber-500/10 text-amber-600" />
            <Record icon={<Target size={18} />} label="بیشترین تراکنش" value={topDayLabel(monthTx)} sub="" c="bg-sky-500/10 text-sky-600" />
            <Record icon={<TrendingUp size={18} />} label="بزرگ‌ترین درآمد" value={biggest(monthTx, 'income') ?? '—'} sub="" c="bg-emerald-500/10 text-emerald-600" />
            <Record icon={<TrendingDown size={18} />} label="بزرگ‌ترین هزینه" value={biggest(monthTx, 'expense') ?? '—'} sub="" c="bg-rose-500/10 text-rose-600" />
          </div>
          <div className="px-5 pb-5">
            <p className="mb-2 text-xs font-black text-slate-500">روند ۳۰ روز اخیر هزینه</p>
            <AreaChart values={daily.map((d) => d.value)} labels={daily.map((d) => toFa(toJalaali(new Date(d.day)).jd))} color="#f43f5e" height={120} />
            {peak.value > 0 && (
              <p className="mt-2 text-[11px] text-slate-400">
                پرهزینه‌ترین روز ۳۰ روز اخیر: <b>{new Date(peak.day).toLocaleDateString('fa-IR')}</b> با <b className="tabular">{withUnit(peak.value)}</b>
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* جدول دسته‌ها */}
      <Card>
        <CardHead title="جدول تفصیلی دسته‌ها" sub="هزینه و درآمد هر دسته در ماه انتخابی" />
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[520px] text-right text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 dark:border-white/10">
                <th className="py-2.5 font-bold">دسته</th>
                <th className="py-2.5 font-bold">نوع</th>
                <th className="py-2.5 font-bold">تعداد</th>
                <th className="py-2.5 font-bold">جمع مبلغ</th>
                <th className="py-2.5 font-bold">سهم</th>
                <th className="py-2.5 font-bold">نسبت</th>
              </tr>
            </thead>
            <tbody>
              {catTable(monthTx).map((r, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 dark:border-white/5">
                  <td className="py-2.5 font-black text-slate-700 dark:text-slate-200">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: CAT_COLORS[r.category] ?? '#64748b' }} />
                      {r.category}
                    </span>
                  </td>
                  <td className="py-2.5"><Badge tone={r.type === 'income' ? 'green' : 'red'}>{r.type === 'income' ? 'درآمد' : 'هزینه'}</Badge></td>
                  <td className="tabular py-2.5 text-slate-500">{toFa(r.count)}</td>
                  <td className="tabular py-2.5 font-black text-slate-700 dark:text-slate-100">{fmt(r.value)}</td>
                  <td className="tabular py-2.5 text-slate-400">{toFa(r.share)}٪</td>
                  <td className="py-2.5"><div className="w-24"><Progress value={r.share} h={6} color={r.type === 'income' ? '#10b981' : '#f43f5e'} /></div></td>
                </tr>
              ))}
              {monthTx.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">تراکنشی در این ماه نیست</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, delta, sub, invert, c }: { icon: React.ReactNode; label: string; value: string; delta?: number; sub?: string; invert?: boolean; c: string }) {
  const good = delta == null ? null : invert ? delta <= 0 : delta >= 0;
  return (
    <Card className="p-4">
      <span className={cx('mb-2.5 grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br text-white', c)}>{icon}</span>
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="tabular mt-1 text-[15px] font-black text-slate-800 dark:text-white">{value}</p>
      {delta != null && (
        <p className={cx('tabular mt-1 text-[11px] font-black', good ? 'text-emerald-500' : 'text-rose-500')}>
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '●'} {toFa(Math.abs(delta))}٪ <span className="font-bold text-slate-400">نسبت به ماه قبل</span>
        </p>
      )}
      {sub && <p className="mt-1 text-[11px] font-bold text-slate-400">{sub}</p>}
    </Card>
  );
}

function Record({ icon, label, value, sub, c }: { icon: React.ReactNode; label: string; value: string; sub: string; c: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-3 dark:border-white/5">
      <span className={cx('mb-2 grid h-9 w-9 place-items-center rounded-xl', c)}>{icon}</span>
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-black text-slate-700 dark:text-slate-100">{value}</p>
      {sub && <p className="tabular text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

function buildInsights(
  exp: number, prevExp: number, inc: number,
  groups: Array<{ category: string; value: number; count: number }>,
  avgDaily: number, saveRate: number,
): string[] {
  const out: string[] = [];
  if (exp === 0 && inc === 0) return ['هنوز داده‌ای برای این ماه ثبت نشده؛ بعد از ثبت چند تراکنش، تحلیل هوشمند اینجا نمایش داده می‌شود.'];
  if (prevExp > 0) {
    const d = Math.round(((exp - prevExp) / prevExp) * 100);
    if (d >= 20) out.push(`هزینه این ماه ${toFa(d)}٪ بیشتر از ماه قبل است. بد نیست پرهزینه‌ترین دسته‌ها را بررسی کنی.`);
    else if (d <= -20) out.push(`آفرین! هزینه این ماه ${toFa(Math.abs(d))}٪ کمتر از ماه قبل شده. همین روند را ادامه بده. 👏`);
  }
  if (groups[0]) {
    const share = exp > 0 ? Math.round((groups[0].value / exp) * 100) : 0;
    out.push(`بیشترین سهم هزینه مربوط به «${groups[0].category}» است (${toFa(share)}٪ از کل).`);
  }
  if (saveRate < 0) out.push('هشدار: هزینه‌ها از درآمد این ماه بیشتر شده‌اند (پس‌انداز منفی).');
  else if (saveRate >= 30) out.push(`نرخ پس‌اندازت ${toFa(saveRate)}٪ است — عالی! بالای ۲۰٪ یعنی مدیریت مالی قوی.`);
  else if (inc > 0) out.push(`نرخ پس‌اندازت ${toFa(saveRate)}٪ است. هدف پیشنهادی: رساندن آن به بالای ۲۰٪.`);
  if (avgDaily > 0) out.push(`به‌طور میانگین روزانه حدود ${avgDaily.toLocaleString('fa-IR')} تومان هزینه می‌کنی.`);
  return out.slice(0, 5);
}

function topDayLabel(tx: Array<{ date: number }>): string {
  if (tx.length === 0) return '—';
  const m = new Map<number, number>();
  for (const t of tx) {
    const k = startOfDay(t.date);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  const [day, count] = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  return `${new Date(day).toLocaleDateString('fa-IR')} (${toFa(count)} تراکنش)`;
}

function biggest(tx: Array<{ type: string; amount: number; title: string }>, type: 'income' | 'expense'): string | null {
  const arr = tx.filter((t) => t.type === type);
  if (arr.length === 0) return null;
  const b = arr.sort((a, z) => z.amount - a.amount)[0];
  return `${b.title} (${b.amount.toLocaleString('fa-IR')})`;
}

// ── عملکرد روزانه: بهره‌وری تسک‌ها + حال روزانه + عادت‌ها ──
function DailyPerfSection({ jy, jm }: { jy: number; jm: number }) {
  const { state } = useApp();
  const [rangeN, setRangeN] = useState<7 | 14 | 30>(14);

  const days = useMemo(() => {
    const out: Array<{ day: number; total: number; done: number; pct: number; mood: number | null; habits: number; habitTotal: number }> = [];
    const today = todayStart();
    for (let i = rangeN - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      const ts = state.tasks.filter((t) => !t.backlog && t.due === d);
      const dn = ts.filter((t) => t.status === 'done').length;
      const ref = (state.reflections ?? []).find((r) => r.day === d);
      const hDone = state.habits.filter((h) => state.habitLogs[`${h.id}:${d}`]).length;
      out.push({
        day: d, total: ts.length, done: dn,
        pct: ts.length ? Math.round((dn / ts.length) * 100) : -1,
        mood: ref?.mood ?? null, habits: hDone, habitTotal: state.habits.length,
      });
    }
    void jy; void jm;
    return out;
  }, [state.tasks, state.reflections, state.habits, state.habitLogs, rangeN, jy, jm]);

  const withData = days.filter((d) => d.total > 0);
  const avg = withData.length ? Math.round(withData.reduce((a, d) => a + d.pct, 0) / withData.length) : 0;
  const best = withData.reduce((a, d) => (d.pct > (a?.pct ?? -1) ? d : a), null as (typeof withData)[number] | null);
  const moods = days.filter((d) => d.mood != null);
  const avgMood = moods.length ? (moods.reduce((a, d) => a + (d.mood ?? 0), 0) / moods.length) : null;

  const moodFace = (m: number | null) => (m == null ? '—' : m <= 1 ? '😞' : m === 2 ? '😐' : m === 3 ? '🙂' : m === 4 ? '😄' : '🤩');

  return (
    <Card>
      <CardHead
        title="عملکرد روزانه"
        sub="درصد انجام تسک‌ها، حال روزانه و عادت‌ها"
        action={
          <Segmented
            value={String(rangeN) as '7' | '14' | '30'}
            onChange={(v) => setRangeN(Number(v) as 7 | 14 | 30)}
            options={[{ v: '7', label: '۷ روز' }, { v: '14', label: '۱۴ روز' }, { v: '30', label: '۳۰ روز' }]}
          />
        }
      />
      <div className="grid grid-cols-3 gap-3 px-5 pb-3">
        <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-white/5">
          <p className="tabular text-lg font-black text-slate-800 dark:text-white">{toFa(avg)}٪</p>
          <p className="text-[10px] font-bold text-slate-400">میانگین انجام تسک</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-white/5">
          <p className="text-lg font-black">{avgMood != null ? `${moodFace(Math.round(avgMood))} ${toFa(avgMood.toFixed(1))}` : '—'}</p>
          <p className="text-[10px] font-bold text-slate-400">میانگین حال روزانه</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-white/5">
          <p className="tabular truncate text-[13px] font-black text-slate-800 dark:text-white">
            {best ? new Date(best.day).toLocaleDateString('fa-IR') : '—'}
          </p>
          <p className="text-[10px] font-bold text-slate-400">بهترین روز {best ? `(${toFa(best.pct)}٪)` : ''}</p>
        </div>
      </div>
      <div className="px-5 pb-2">
        <Bars
          data={days.map((d) => ({
            label: toFa(toJalaali(new Date(d.day)).jd),
            value: Math.max(d.pct, 0),
            color: d.pct < 0 ? '#cbd5e1' : d.pct >= 80 ? '#10b981' : d.pct >= 50 ? '#f59e0b' : '#f43f5e',
            dim: d.pct < 0,
          }))}
          formatTick={(v) => (v > 0 ? `${toFa(v)}٪` : '')}
        />
      </div>
      <div className="px-5 pb-5">
        <div className="flex gap-1.5 overflow-x-auto pb-1" dir="ltr">
          {days.map((d) => (
            <div
              key={d.day}
              title={`${new Date(d.day).toLocaleDateString('fa-IR')} — انجام تسک: ${d.pct < 0 ? 'تسکی نبود' : toFa(d.pct) + '٪'} — حال: ${moodFace(d.mood)} — عادت: ${toFa(d.habits)}/${toFa(d.habitTotal)}`}
              className={cx(
                'grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-[13px] transition',
                d.mood == null ? 'border-slate-100 text-slate-300 dark:border-white/5' : 'border-transparent bg-violet-500/10',
              )}
            >
              {moodFace(d.mood)}
            </div>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">نوارها: درصد انجام تسک هر روز • ایموجی‌ها: حال ثبت‌شده آن روز (هاور کنید)</p>
      </div>
    </Card>
  );
}

function catTable(tx: Array<{ category: string; type: 'income' | 'expense'; amount: number }>) {
  const m = new Map<string, { type: 'income' | 'expense'; value: number; count: number }>();
  for (const t of tx) {
    const e = m.get(t.category) ?? { type: t.type, value: 0, count: 0 };
    e.value += t.amount; e.count++;
    m.set(t.category, e);
  }
  const total = tx.reduce((a, t) => a + t.amount, 0) || 1;
  return [...m.entries()]
    .map(([category, v]) => ({ category, ...v, share: Math.round((v.value / total) * 100) }))
    .sort((a, b) => b.value - a.value);
}
