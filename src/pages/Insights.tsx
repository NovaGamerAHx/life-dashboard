import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Award, BedDouble, CalendarRange, Check, ChevronLeft, ChevronRight,
  Copy, Dices, Download, Eye, FileSpreadsheet, FileText, Flame, Footprints, Gauge,
  Info, ListChecks, RefreshCw, Shuffle, Smile, Sparkles, Star, Target,
  TrendingDown, TrendingUp, X,
} from 'lucide-react';
import { useApp } from '../lib/store';
import {
  addDays, addMonthsJalali, formatClock24, formatJalali, formatJalaliShort, formatScore,
  getMonthGrid, J_MONTHS, J_WEEKDAYS_SHORT, toFa, toJalaali, todayStart,
} from '../lib/jalali';
import {
  buildDayStats, dayListBetween, formatDurationFa, monthBuckets, moodDistribution,
  pickRandom, resolveRange, rollupDays, scoreDistribution, scoreStats, trendDelta,
  weekBuckets, type DayStat, type RangePreset,
} from '../lib/days';
import {
  DEFAULT_SUMMARY_OPTIONS, buildDayBlock, buildSummaryCsv, buildSummaryText,
  type SummaryOptions,
} from '../lib/summary';
import {
  EMPTY, EMPTY_LABEL, SCORE_LEGEND, moodFace, moodLabel, orEmpty, scoreGrade, scoreHeatClass,
} from '../lib/display';
import { buildLifeInsights, daysSinceLastScore, goodStreak } from '../lib/insights';
import { copyText, downloadText } from '../lib/stats';
import { jalaliStamp } from '../lib/backup';
import { Card, CardHead, Btn, Badge, Segmented, Empty, Chip, Modal, inputCls, CheckIcon } from '../components/ui';
import { Bars, ScoreTrend } from '../components/charts';
import { JalaliDateField } from '../components/forms';
import { cx } from '../lib/utils';

const PRESETS: Array<{ v: RangePreset; label: string }> = [
  { v: '7d', label: '۷ روز' },
  { v: '14d', label: '۱۴ روز' },
  { v: '30d', label: '۳۰ روز' },
  { v: '90d', label: '۹۰ روز' },
  { v: 'thisMonth', label: 'این ماه' },
  { v: 'lastMonth', label: 'ماه گذشته' },
  { v: 'custom', label: 'بازه دلخواه' },
];



export default function Insights() {
  const { state } = useApp();
  const weekStart = state.settings.weekStart;
  const today = todayStart();

  const [preset, setPreset] = useState<RangePreset>('30d');
  const [customFrom, setCustomFrom] = useState<number>(addDays(today, -13));
  const [customTo, setCustomTo] = useState<number>(today);

  const range = useMemo(
    () => resolveRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );
  const stats = useMemo(() => buildDayStats(state, range.days), [state, range.days]);

  // بازه قبلی با همان طول برای مقایسه
  const prevStats = useMemo(() => {
    const len = range.days.length;
    if (len === 0) return [];
    return buildDayStats(state, dayListBetween(addDays(range.from, -len), addDays(range.from, -1)));
  }, [state, range.from, range.days.length]);

  const s = useMemo(() => scoreStats(stats), [stats]);
  const prevS = useMemo(() => scoreStats(prevStats), [prevStats]);
  const roll = useMemo(() => rollupDays(stats), [stats]);
  const prevRoll = useMemo(() => rollupDays(prevStats), [prevStats]);
  const trend = useMemo(() => trendDelta(stats), [stats]);
  const dist = useMemo(() => scoreDistribution(stats), [stats]);
  const moods = useMemo(() => moodDistribution(stats), [stats]);
  const weeks = useMemo(() => weekBuckets(stats, weekStart), [stats, weekStart]);
  const months = useMemo(() => monthBuckets(stats), [stats]);
  const streakDays = useMemo(() => goodStreak(stats, 8), [stats]);
  const sinceLast = useMemo(() => daysSinceLastScore(stats), [stats]);

  // ── وضعیت انتخاب روزها برای خروجی ────────────────────────
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [opts, setOpts] = useState<SummaryOptions>(DEFAULT_SUMMARY_OPTIONS);
  const [randomN, setRandomN] = useState(10);
  const [randomOnlyScored, setRandomOnlyScored] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [detailDay, setDetailDay] = useState<number | null>(null);
  const [calJ, setCalJ] = useState(() => {
    const j = toJalaali(new Date());
    return { jy: j.jy, jm: j.jm };
  });

  const inRangeSelected = useMemo(() => stats.filter((d) => selected.has(d.day)), [stats, selected]);

  const statByDay = useMemo(() => {
    const m = new Map<number, DayStat>();
    for (const d of stats) m.set(d.day, d);
    return m;
  }, [stats]);

  const detail = detailDay != null ? statByDay.get(detailDay) ?? null : null;

  const notify = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2200);
  };

  const toggleDay = (day: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });

  const selectMany = (days: number[]) => setSelected(new Set(days));

  const outputText = useMemo(
    () =>
      buildSummaryText(inRangeSelected, opts, {
        label: range.label,
        from: range.from,
        to: range.to,
        count: inRangeSelected.length,
      }),
    [inRangeSelected, opts, range],
  );

  const copyOutput = async () => {
    if (inRangeSelected.length === 0) { notify('اول چند روز را انتخاب کنید'); return; }
    const ok = await copyText(outputText);
    notify(ok ? `متن ${toFa(inRangeSelected.length)} روز کپی شد ✅` : 'کپی نشد — متن را دستی انتخاب کنید');
  };

  const downloadTxt = () => {
    if (inRangeSelected.length === 0) { notify('اول چند روز را انتخاب کنید'); return; }
    downloadText(`day-summary-${jalaliStamp()}.txt`, outputText, 'text/plain;charset=utf-8');
    notify('فایل متنی دانلود شد');
  };

  const downloadCsv = () => {
    if (inRangeSelected.length === 0) { notify('اول چند روز را انتخاب کنید'); return; }
    downloadText(`day-summary-${jalaliStamp()}.csv`, buildSummaryCsv(inRangeSelected, opts));
    notify('فایل CSV دانلود شد');
  };

  const scoredDays = stats.filter((d) => d.score != null).map((d) => d.day);
  const notedDays = stats.filter((d) => (d.dayNote ?? '').trim() || d.wins.trim() || d.lessons.trim()).map((d) => d.day);
  const greatDays = stats.filter((d) => d.score != null && d.score >= 8).map((d) => d.day);
  const weakDays = stats.filter((d) => d.score != null && d.score < 5).map((d) => d.day);

  const calGrid = useMemo(() => getMonthGrid(calJ.jy, calJ.jm, weekStart), [calJ, weekStart]);
  const calWeekLabels = weekStart === 'mon'
    ? ['د', 'س', 'چ', 'پ', 'ج', 'ش', 'ی']
    : J_WEEKDAYS_SHORT;

  const shiftCal = (delta: number) => {
    const next = addMonthsJalali(calJ.jy, calJ.jm, delta);
    setCalJ({ jy: next.jy, jm: next.jm });
  };

  const avgDelta = s.avg != null && prevS.avg != null ? Math.round((s.avg - prevS.avg) * 10) / 10 : null;

  return (
    <div className="space-y-5">
      {flash && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-emerald-500/10 px-4 py-2.5 text-[12px] font-bold text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300"
        >
          {flash}
        </motion.div>
      )}

      {/* ── انتخاب بازه ───────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/20">
            <Gauge size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-black text-slate-800 dark:text-white">تحلیل روزها</h2>
            <p className="text-[11px] text-slate-400">
              {range.label} • {toFa(range.days.length)} روز • از {formatJalali(range.from)} تا {formatJalali(range.to)}
            </p>
          </div>
          <Btn size="sm" variant="soft" onClick={() => { selectMany(range.days); notify('همه روزهای بازه انتخاب شد'); }}>
            <Check size={14} /> انتخاب همه روزهای بازه
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            <X size={14} /> پاک‌کردن انتخاب
          </Btn>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
          <Segmented
            value={preset}
            onChange={(v) => setPreset(v)}
            options={PRESETS.map((p) => ({ v: p.v, label: p.label }))}
          />
          {preset === 'custom' && (
            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
              <div className="min-w-[220px]">
                <span className="mb-1 block text-[11px] font-bold text-slate-500">از تاریخ</span>
                <JalaliDateField value={customFrom} onChange={(v) => v != null && setCustomFrom(v)} allowClear={false} />
              </div>
              <div className="min-w-[220px]">
                <span className="mb-1 block text-[11px] font-bold text-slate-500">تا تاریخ</span>
                <JalaliDateField value={customTo} onChange={(v) => v != null && setCustomTo(v)} allowClear={false} />
              </div>
            </div>
          )}
        </div>

        {sinceLast != null && sinceLast >= 3 && (
          <p className="mt-3 flex items-center gap-1.5 rounded-2xl bg-amber-500/[0.07] px-3.5 py-2.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300">
            <Info size={14} /> {toFa(sinceLast)} روز از آخرین نمره ثبت‌شده گذشته — «بازتاب پایان روز» را در صفحه روز جاری بنویس.
          </p>
        )}
      </Card>

      {/* ── کارت‌های آماری ────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          icon={<Star size={19} />}
          c="from-amber-500 to-orange-600"
          label="میانگین نمره"
          value={s.avg != null ? `${formatScore(s.avg)} از ۱۰` : EMPTY_LABEL}
          sub={
            avgDelta != null
              ? `${avgDelta === 0 ? 'بدون تغییر' : `${avgDelta > 0 ? '▲' : '▼'} ${formatScore(Math.abs(avgDelta))} نسبت به بازه قبل`}`
              : `بازه قبل نمره‌ای نداشت`
          }
          tone={avgDelta == null ? 'slate' : avgDelta > 0 ? 'green' : avgDelta < 0 ? 'red' : 'slate'}
        />
        <Kpi
          icon={<ListChecks size={19} />}
          c="from-sky-500 to-blue-600"
          label="روزهای نمره‌دار"
          value={`${toFa(s.count)} از ${toFa(range.days.length)} روز`}
          sub={range.days.length ? `${toFa(Math.round((s.count / range.days.length) * 100))}٪ روزهای بازه` : 'بازه خالی است'}
        />
        <Kpi
          icon={<Award size={19} />}
          c="from-emerald-500 to-teal-600"
          label="بهترین روز"
          value={s.best && s.max != null ? formatScore(s.max) : EMPTY_LABEL}
          sub={s.best ? formatJalali(s.best.day, { weekday: true }) : 'نمره‌ای ثبت نشده'}
        />
        <Kpi
          icon={<TrendingDown size={19} />}
          c="from-rose-500 to-pink-600"
          label="ضعیف‌ترین روز"
          value={s.worst && s.min != null ? formatScore(s.min) : EMPTY_LABEL}
          sub={s.worst ? formatJalali(s.worst.day, { weekday: true }) : 'نمره‌ای ثبت نشده'}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          icon={<Smile size={19} />}
          c="from-violet-500 to-purple-600"
          label="میانگین حال روز"
          value={roll.avgMood != null ? `${formatScore(roll.avgMood)} از ۵` : EMPTY_LABEL}
          sub={roll.moodCount ? `${toFa(roll.moodCount)} روز ثبت‌شده • ${moodFace(Math.round(roll.avgMood ?? 0))}` : 'حالی ثبت نشده'}
        />
        <Kpi
          icon={<Target size={19} />}
          c="from-teal-500 to-emerald-600"
          label="میانگین انجام تسک‌ها"
          value={roll.avgTasksPct != null ? `${toFa(roll.avgTasksPct)}٪` : EMPTY_LABEL}
          sub={`${toFa(roll.doneTasks)} از ${toFa(roll.totalTasks)} تسک در بازه`}
        />
        <Kpi
          icon={<Activity size={19} />}
          c="from-lime-500 to-green-600"
          label="روزهای ورزش"
          value={`${toFa(roll.sportDays)} روز`}
          sub={`بیرون رفتن: ${toFa(roll.outDays)} روز`}
        />
        <Kpi
          icon={<BedDouble size={19} />}
          c="from-indigo-500 to-blue-700"
          label="میانگین خواب"
          value={roll.avgSleepMin != null ? formatDurationFa(roll.avgSleepMin) : EMPTY_LABEL}
          sub={roll.sleepCount ? `${toFa(roll.sleepCount)} شب ثبت‌شده` : 'ساعت خواب ثبت نشده'}
        />
      </div>

      {/* ── روند نمره‌ها ─────────────────────────────────── */}
      <Card>
        <CardHead
          title="روند نمره روزها"
          sub={`${range.label} — نقاط خاکستری پایین نمودار یعنی آن روز نمره ثبت نشده`}
          action={
            trend != null ? (
              <Badge tone={trend > 0 ? 'green' : trend < 0 ? 'red' : 'slate'}>
                {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : null}
                روند: {trend === 0 ? 'ثابت' : `${trend > 0 ? '+' : '−'}${formatScore(Math.abs(trend))}`}
              </Badge>
            ) : undefined
          }
        />
        <div className="px-4 pb-4">
          <ScoreTrend
            points={stats.map((d) => ({
              label: toFa(toJalaali(new Date(d.day)).jd),
              value: d.score,
              hint: `${formatJalali(d.day, { weekday: true })} — نمره: ${d.score != null ? formatScore(d.score) : EMPTY_LABEL}`,
            }))}
          />
        </div>
        <div className="grid gap-3 border-t border-slate-100 px-5 py-4 text-center sm:grid-cols-4 dark:border-white/5">
          <MiniStat label="میانه نمره‌ها" value={s.median != null ? formatScore(s.median) : EMPTY} />
          <MiniStat label="نوسان (انحراف معیار)" value={s.std != null ? formatScore(s.std) : EMPTY} hint="کمتر = روزهای پایدارتر" />
          <MiniStat label="روزهای عالی (۸ به بالا)" value={toFa(s.greatDays)} hint={streakDays.length > 1 ? `بهترین رشته: ${toFa(streakDays.length)} روز پیاپی` : 'رشته‌ای ثبت نشده'} />
          <MiniStat label="روزهای ضعیف (زیر ۵)" value={toFa(s.lowDays)} />
        </div>
      </Card>

      {/* ── تقویم نمره‌ها ─────────────────────────────────── */}
      <Card>
        <CardHead
          title="تقویم نمره‌ها"
          sub="رنگ خانه‌ها شدت نمره است • کلیک = انتخاب/حذف برای خروجی • دابل‌کلیک = جزئیات کامل روز"
          action={
            <div className="flex items-center gap-1.5">
              <button onClick={() => shiftCal(-1)} title="ماه قبل" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                <ChevronRight size={17} />
              </button>
              <span className="min-w-[110px] text-center text-[13px] font-black text-slate-700 dark:text-slate-200">
                {J_MONTHS[calJ.jm - 1]} {toFa(calJ.jy)}
              </span>
              <button onClick={() => shiftCal(1)} title="ماه بعد" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                <ChevronLeft size={17} />
              </button>
            </div>
          }
        />
        <div className="px-4 pb-4">
          <div className="grid grid-cols-7 gap-1">
            {calWeekLabels.map((w, i) => (
              <div key={w + i} className={cx('py-1.5 text-center text-[11px] font-black', (weekStart === 'sat' ? i === 6 : i === 5) ? 'text-rose-400' : 'text-slate-400')}>
                {w}
              </div>
            ))}
            {calGrid.map((cell, i) => {
              const st = statByDay.get(cell.ts);
              const score = st?.score ?? null;
              const isSel = selected.has(cell.ts);
              const jsDay = new Date(cell.ts).getDay();
              const isHoliday = weekStart === 'sat' ? jsDay === 5 : jsDay === 4 || jsDay === 5;
              return (
                <button
                  key={i}
                  onClick={() => cell.inMonth && toggleDay(cell.ts)}
                  onDoubleClick={() => { setDetailDay(cell.ts); setCalJ({ jy: cell.jy, jm: cell.jm }); }}
                  title={
                    `${formatJalali(cell.ts, { weekday: true })} — نمره: ${score != null ? formatScore(score) : EMPTY_LABEL}` +
                    `${st?.mood != null ? ` • حال: ${moodFace(st.mood)}` : ''}` +
                    `${st?.hasReflection ? ' • بازتاب ثبت شده' : ''}` +
                    `${isSel ? ' • انتخاب‌شده' : ''}`
                  }
                  className={cx(
                    'relative flex min-h-[62px] flex-col items-center justify-start gap-0.5 rounded-2xl border p-1 transition-all sm:min-h-[76px]',
                    isSel
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40'
                      : cell.isToday
                        ? 'border-emerald-400/70'
                        : 'border-transparent hover:border-slate-200 dark:hover:border-white/10',
                    !cell.inMonth && 'opacity-30',
                    score != null && cell.inMonth ? scoreHeatClass(score) : 'bg-white dark:bg-transparent',
                  )}
                >
                  <span className={cx(
                    'tabular grid h-6 w-6 place-items-center rounded-full text-[12px] font-black',
                    cell.isToday
                      ? 'bg-emerald-500 text-white'
                      : isHoliday && cell.inMonth ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300',
                  )}>
                    {toFa(cell.jd)}
                  </span>
                  {score != null ? (
                    <span className="tabular rounded-full bg-white/70 px-1.5 text-[10px] font-black text-slate-700 dark:bg-slate-900/70 dark:text-slate-100">
                      {formatScore(score)}
                    </span>
                  ) : cell.inMonth ? (
                    <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600">—</span>
                  ) : null}
                  {st?.mood != null && <span className="text-[10px] leading-none">{moodFace(st.mood)}</span>}
                  {isSel && (
                    <span className="absolute -top-1 left-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white">
                      <CheckIcon size={10} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 font-bold">راهنمای رنگ نمره:</span>
            {SCORE_LEGEND.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className={cx('h-3.5 w-3.5 rounded-md', l.cls)} /> {l.label}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-md border border-emerald-400" /> امروز
            </span>
          </div>
        </div>
      </Card>

      {/* ── توزیع‌ها ─────────────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHead title="توزیع نمره‌ها" sub={`${toFa(s.count)} روز نمره‌دار در ${range.label}`} />
          <div className="px-5 pb-5">
            {s.count === 0 ? (
              <Empty icon={<Star size={26} />} title="نمره‌ای در این بازه نیست" sub="از «روز جاری» بازتاب بنویس و نمره بده" />
            ) : (
              <Bars data={dist} height={150} formatTick={(v) => (v > 0 ? toFa(v) : '')} averageLabel={null} />
            )}
          </div>
        </Card>
        <Card>
          <CardHead title="توزیع حال روزها" sub="شمار روزها به تفکیک حال ثبت‌شده" />
          <div className="px-5 pb-5">
            {roll.moodCount === 0 ? (
              <Empty icon={<Smile size={26} />} title="حال روزی ثبت نشده" sub="در بازتاب پایان روز، حالت را انتخاب کن" />
            ) : (
              <Bars data={moods} height={150} formatTick={(v) => (v > 0 ? toFa(v) : '')} averageLabel={null} />
            )}
          </div>
        </Card>
      </div>

      {/* ── بازه‌های هفتگی و ماهانه ───────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHead title="میانگین هفتگی" sub="بر اساس هفته‌های شمسی (شنبه/دوشنبه بر اساس تنظیمات)" />
          <div className="space-y-2.5 px-5 pb-5">
            {weeks.length === 0 && <p className="rounded-2xl bg-slate-50 py-4 text-center text-xs text-slate-400 dark:bg-white/5">داده‌ای نیست</p>}
            {weeks.map((w) => (
              <PeriodRow
                key={w.key}
                label={w.label}
                sub={w.sub}
                score={w.avgScore}
                tasksPct={w.avgTasksPct}
                habitRate={w.habitRate}
                onPick={() => selectMany(w.days.map((d) => d.day))}
              />
            ))}
          </div>
        </Card>
        <Card>
          <CardHead title="میانگین ماهانه" sub="ماه‌های شمسی موجود در بازه" />
          <div className="space-y-2.5 px-5 pb-5">
            {months.length === 0 && <p className="rounded-2xl bg-slate-50 py-4 text-center text-xs text-slate-400 dark:bg-white/5">داده‌ای نیست</p>}
            {months.map((m) => (
              <PeriodRow
                key={m.key}
                label={m.label}
                sub={m.sub}
                score={m.avgScore}
                tasksPct={m.avgTasksPct}
                habitRate={m.habitRate}
                onPick={() => selectMany(m.days.map((d) => d.day))}
              />
            ))}
          </div>
        </Card>
      </div>

      {/* ── مقایسه با بازه قبل + نکات ─────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHead title="مقایسه با بازه قبلی" sub={`بازه‌ای هم‌اندازه، پیش از ${formatJalali(range.from)}`} />
          <div className="space-y-3 px-5 pb-5">
            <CompareRow
              label="میانگین نمره"
              now={s.avg}
              prev={prevS.avg}
              format={(v) => `${formatScore(v)} از ۱۰`}
            />
            <CompareRow
              label="میانگین حال روز"
              now={roll.avgMood}
              prev={prevRoll.avgMood}
              format={(v) => `${formatScore(v)} از ۵`}
            />
            <CompareRow
              label="میانگین انجام تسک‌ها"
              now={roll.avgTasksPct}
              prev={prevRoll.avgTasksPct}
              format={(v) => `${toFa(Math.round(v))}٪`}
            />
            <CompareRow
              label="روزهای ورزش"
              now={roll.sportDays}
              prev={prevRoll.sportDays}
              format={(v) => `${toFa(Math.round(v))} روز`}
            />
          </div>
        </Card>

        <Card>
          <CardHead title="نکات و بینش‌های بازه" sub="تحلیل خودکار بر اساس داده‌های ثبت‌شده" />
          <ul className="space-y-2 px-5 pb-5">
            {buildLifeInsights({
              stats, s, roll, streakDays, sinceLast, range,
            }).map((t, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-2xl bg-violet-500/[0.06] px-3.5 py-3 text-[12px] leading-6 text-slate-600 ring-1 ring-violet-500/15 dark:text-slate-300">
                <Sparkles size={15} className="mt-0.5 shrink-0 text-violet-500" />
                {t}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ── کارگاه خروجی متنی ────────────────────────────── */}
      <Card>
        <CardHead
          title="ساخت خروجی متنی از روزها"
          sub="۱ یا چند روز را انتخاب کنید (یا به‌صورت تصادفی انتخاب کنید) و خلاصه کامل با نمره یا بدون نمره بگیرید"
          action={<Badge tone={inRangeSelected.length ? 'green' : 'slate'}>{toFa(inRangeSelected.length)} روز انتخاب‌شده</Badge>}
        />

        <div className="space-y-4 px-5 pb-5">
          {/* انتخاب سریع */}
          <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-white/5">
            <p className="mb-2 text-[11px] font-black text-slate-500">انتخاب سریع</p>
            <div className="flex flex-wrap gap-1.5">
              <Chip onClick={() => selectMany(range.days)}><ListChecks size={13} /> همه روزهای بازه</Chip>
              <Chip onClick={() => selectMany(scoredDays)}><Star size={13} /> روزهای دارای نمره ({toFa(scoredDays.length)})</Chip>
              <Chip onClick={() => selectMany(notedDays)}><FileText size={13} /> روزهای دارای توضیحات ({toFa(notedDays.length)})</Chip>
              <Chip tone="amber" onClick={() => selectMany(greatDays)}><Award size={13} /> روزهای عالی ({toFa(greatDays.length)})</Chip>
              <Chip tone="slate" onClick={() => selectMany(weakDays)}><TrendingDown size={13} /> روزهای ضعیف ({toFa(weakDays.length)})</Chip>
              <Chip onClick={() => setSelected(new Set())}><X size={13} /> هیچ‌کدام</Chip>
            </div>
          </div>

          {/* انتخاب تصادفی */}
          <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-white/5">
            <p className="mb-2 text-[11px] font-black text-slate-500">انتخاب تصادفی</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-[12px] font-bold text-slate-500">
                تعداد:
                <input
                  value={String(randomN)}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/[^0-9۰-۹]/g, '').replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))));
                    if (!Number.isNaN(n)) setRandomN(Math.max(1, Math.min(200, n)));
                  }}
                  inputMode="numeric"
                  dir="ltr"
                  className={cx(inputCls, 'tabular h-9 w-20 text-center')}
                />
              </label>
              <Chip active={randomOnlyScored} onClick={() => setRandomOnlyScored((v) => !v)}>
                {randomOnlyScored ? <Check size={13} /> : null} فقط روزهای دارای نمره
              </Chip>
              <Btn
                onClick={() => {
                  const pool = (randomOnlyScored ? scoredDays : range.days);
                  if (pool.length === 0) { notify('روزی برای انتخاب تصادفی وجود ندارد'); return; }
                  const picked = pickRandom(pool, randomN);
                  selectMany(picked);
                  notify(`${toFa(picked.length)} روز تصادفی انتخاب شد`);
                }}
              >
                <Shuffle size={15} /> انتخاب تصادفی
              </Btn>
              <Btn
                variant="soft"
                onClick={() => {
                  const rest = inRangeSelected.length > 1 ? inRangeSelected.map((d) => d.day) : range.days;
                  if (rest.length < 2) return;
                  const shuffled = pickRandom(rest, rest.length);
                  selectMany(shuffled);
                  notify('ترتیب روزها تصادفی (تصادفی‌سازی ترتیب) شد');
                }}
              >
                <Dices size={15} /> تصادفی‌کردن ترتیب
              </Btn>
            </div>
            <p className="mt-2 text-[10px] leading-5 text-slate-400">
              انتخاب تصادفی از میان روزهای بازه انجام می‌شود و جایگزین انتخاب فعلی می‌شود.
            </p>
          </div>

          {/* گزینه‌های خروجی */}
          <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-white/5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-black text-slate-500">محتوای خروجی</p>
              <div className="flex gap-1.5">
                <Chip onClick={() => setOpts(DEFAULT_SUMMARY_OPTIONS)}><RefreshCw size={13} /> حالت پیش‌فرض</Chip>
                <Chip
                  onClick={() =>
                    setOpts({
                      includeScore: false, includeMood: true, includeNote: true, includeReflection: true,
                      includeBasics: true, includeHabits: true, includeTasks: false, includeEvents: false,
                      showEmpty: true, includeStats: true, includeHeader: true,
                    })
                  }
                >
                  <FileText size={13} /> فقط توضیحات (بدون نمره)
                </Chip>
                <Chip
                  onClick={() =>
                    setOpts({
                      includeScore: true, includeMood: true, includeNote: true, includeReflection: true,
                      includeBasics: true, includeHabits: true, includeTasks: true, includeEvents: true,
                      showEmpty: true, includeStats: true, includeHeader: true,
                    })
                  }
                >
                  <Gauge size={13} /> کامل (همه بخش‌ها)
                </Chip>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <OptRow label="نمره روز" icon={<Star size={14} />} checked={opts.includeScore} onChange={(v) => setOpts((o) => ({ ...o, includeScore: v }))} />
              <OptRow label="حال روز" icon={<Smile size={14} />} checked={opts.includeMood} onChange={(v) => setOpts((o) => ({ ...o, includeMood: v }))} />
              <OptRow label="توضیحات روز" icon={<FileText size={14} />} checked={opts.includeNote} onChange={(v) => setOpts((o) => ({ ...o, includeNote: v }))} />
              <OptRow label="دستاورد/بهبود/درس/قدردانی" icon={<Award size={14} />} checked={opts.includeReflection} onChange={(v) => setOpts((o) => ({ ...o, includeReflection: v }))} />
              <OptRow label="خواب، ورزش، بیرون" icon={<BedDouble size={14} />} checked={opts.includeBasics} onChange={(v) => setOpts((o) => ({ ...o, includeBasics: v }))} />
              <OptRow label="عادت‌ها" icon={<Flame size={14} />} checked={opts.includeHabits} onChange={(v) => setOpts((o) => ({ ...o, includeHabits: v }))} />
              <OptRow label="تسک‌های روز" icon={<ListChecks size={14} />} checked={opts.includeTasks} onChange={(v) => setOpts((o) => ({ ...o, includeTasks: v }))} />
              <OptRow label="رویدادهای روز" icon={<CalendarRange size={14} />} checked={opts.includeEvents} onChange={(v) => setOpts((o) => ({ ...o, includeEvents: v }))} />
              <OptRow label={`نمایش موارد خالی با «${EMPTY_LABEL}»`} icon={<Info size={14} />} checked={opts.showEmpty} onChange={(v) => setOpts((o) => ({ ...o, showEmpty: v }))} />
              <OptRow label="خلاصه آماری ابتدای متن" icon={<Gauge size={14} />} checked={opts.includeStats} onChange={(v) => setOpts((o) => ({ ...o, includeStats: v }))} />
              <OptRow label="عنوان و بازه در ابتدای متن" icon={<CalendarRange size={14} />} checked={opts.includeHeader} onChange={(v) => setOpts((o) => ({ ...o, includeHeader: v }))} />
            </div>
          </div>

          {/* لیست روزها برای انتخاب دستی */}
          <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-white/5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-black text-slate-500">
                انتخاب دستی روزها ({range.label})
              </p>
              <span className="text-[10px] text-slate-400">کلیک = انتخاب/حذف • دابل‌کلیک = جزئیات روز</span>
            </div>
            {stats.length === 0 ? (
              <Empty icon={<CalendarRange size={24} />} title="بازه خالی است" sub="بازه دیگری انتخاب کنید" />
            ) : (
              <div className="flex max-h-72 flex-wrap gap-1.5 overflow-y-auto pr-1">
                {stats.map((d) => {
                  const on = selected.has(d.day);
                  const j = toJalaali(new Date(d.day));
                  return (
                    <button
                      key={d.day}
                      onClick={() => toggleDay(d.day)}
                      onDoubleClick={() => { setDetailDay(d.day); setCalJ({ jy: j.jy, jm: j.jm }); }}
                      title={`${formatJalali(d.day, { weekday: true })} — نمره: ${d.score != null ? formatScore(d.score) : EMPTY_LABEL}${d.dayNote ? `\n${d.dayNote}` : ''}`}
                      className={cx(
                        'flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition active:scale-[0.97]',
                        on
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-white/10 dark:text-slate-300',
                        d.day === today && !on && 'ring-1 ring-emerald-400/50',
                      )}
                      style={on ? undefined : { background: d.score != null ? 'transparent' : undefined }}
                    >
                      <span className="tabular">{toFa(j.jd)} {J_MONTHS[j.jm - 1].slice(0, 4)}</span>
                      {d.score != null ? (
                        <span className="tabular rounded-md bg-amber-500/15 px-1.5 text-[10px] font-black text-amber-700 dark:text-amber-300">
                          {formatScore(d.score)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                      )}
                      {d.mood != null && <span className="text-[11px] leading-none">{moodFace(d.mood)}</span>}
                      {on && <CheckIcon size={11} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* دکمه‌های خروجی */}
          <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={copyOutput} disabled={inRangeSelected.length === 0}>
              <Copy size={15} /> کپی متن خلاصه
            </Btn>
            <Btn variant="outline" onClick={downloadTxt} disabled={inRangeSelected.length === 0}>
              <FileText size={15} /> دانلود متن (TXT)
            </Btn>
            <Btn variant="outline" onClick={downloadCsv} disabled={inRangeSelected.length === 0}>
              <FileSpreadsheet size={15} /> دانلود جدول (CSV)
            </Btn>
            <Btn
              variant="soft"
              onClick={() =>
                setOpts((o) => ({ ...o, includeScore: !o.includeScore }))
              }
              title="میان‌بر: روشن/خاموش کردن نمره در خروجی"
            >
              <Star size={15} /> {opts.includeScore ? 'خروجی با نمره' : 'خروجی بدون نمره'}
            </Btn>
            <span className="ms-auto text-[11px] text-slate-400">
              {inRangeSelected.length ? `${toFa(outputText.length)} نویسه • ${toFa(inRangeSelected.length)} روز` : 'روزی انتخاب نشده است'}
            </span>
          </div>

          {/* پیش‌نمایش */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-white/5 dark:bg-white/[0.03]">
              <span className="flex items-center gap-1.5 text-[11px] font-black text-slate-500">
                <Eye size={14} /> پیش‌نمایش خروجی متنی
              </span>
              <span className="flex gap-1.5">
                <button
                  onClick={copyOutput}
                  disabled={inRangeSelected.length === 0}
                  className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-slate-200/70 disabled:opacity-40 dark:hover:bg-white/10"
                >
                  <Copy size={12} className="inline" /> کپی
                </button>
                <button
                  onClick={downloadTxt}
                  disabled={inRangeSelected.length === 0}
                  className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 transition hover:bg-slate-200/70 disabled:opacity-40 dark:hover:bg-white/10"
                >
                  <Download size={12} className="inline" /> دانلود
                </button>
              </span>
            </div>
            <pre
              dir="rtl"
              className="max-h-96 overflow-auto whitespace-pre-wrap px-4 py-3 text-right text-[12px] leading-7 text-slate-700 dark:text-slate-200"
            >
              {inRangeSelected.length ? outputText : 'روزی برای خروجی انتخاب نشده است — از دکمه‌های بالا یا لیست روزها انتخاب کنید.'}
            </pre>
          </div>
        </div>
      </Card>

      {/* ── جدول جزئیات روزهای بازه ───────────────────────── */}
      <Card>
        <CardHead title="جدول روزهای بازه" sub="نمای دقیق همه روزها؛ ستون‌های خالی با «ثبت نشده» مشخص شده‌اند" />
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[860px] text-right text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 dark:border-white/10">
                <th className="py-2.5 font-bold">تاریخ</th>
                <th className="py-2.5 font-bold">نمره</th>
                <th className="py-2.5 font-bold">حال</th>
                <th className="py-2.5 font-bold">توضیحات روز</th>
                <th className="py-2.5 font-bold">عادت‌ها</th>
                <th className="py-2.5 font-bold">تسک‌ها</th>
                <th className="py-2.5 font-bold">خواب</th>
                <th className="py-2.5 font-bold">ورزش</th>
                <th className="py-2.5 font-bold" />
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-slate-400">داده‌ای در این بازه نیست</td></tr>
              )}
              {[...stats].reverse().map((d) => (
                <tr key={d.day} className="border-b border-slate-50 last:border-0 dark:border-white/5">
                  <td className="py-2.5 font-black text-slate-700 dark:text-slate-200">
                    {formatJalali(d.day, { weekday: true })}
                    <span className="tabular mr-1.5 block text-[10px] font-bold text-slate-400">{formatJalaliShort(d.day)}</span>
                  </td>
                  <td className="py-2.5">
                    {d.score != null ? (
                      <span className="tabular inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-black text-amber-700 dark:text-amber-300">
                        <Star size={11} /> {formatScore(d.score)}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">{EMPTY_LABEL}</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    {d.mood != null
                      ? <span title={moodLabel(d.mood)}>{moodFace(d.mood)} <span className="tabular text-slate-400">{formatScore(d.mood)}</span></span>
                      : <span className="text-slate-300 dark:text-slate-600">{EMPTY_LABEL}</span>}
                  </td>
                  <td className="max-w-[260px] py-2.5 text-slate-500 dark:text-slate-300">
                    <span className="line-clamp-2">{orEmpty(d.dayNote)}</span>
                  </td>
                  <td className="tabular py-2.5 text-slate-500 dark:text-slate-300">
                    {d.habitsTotal > 0 ? `${toFa(d.habitsDone)}/${toFa(d.habitsTotal)}` : EMPTY_LABEL}
                  </td>
                  <td className="tabular py-2.5 text-slate-500 dark:text-slate-300">
                    {d.tasksTotal > 0 ? `${toFa(d.tasksDone)}/${toFa(d.tasksTotal)} (${toFa(d.tasksPct)}٪)` : EMPTY_LABEL}
                  </td>
                  <td className="tabular py-2.5 text-slate-500 dark:text-slate-300">
                    {d.sleepMin != null
                      ? formatDurationFa(d.sleepMin)
                      : d.wake || d.sleep
                        ? `${d.sleep ? formatClock24(d.sleep) : EMPTY_LABEL} تا ${d.wake ? formatClock24(d.wake) : EMPTY_LABEL}`
                        : EMPTY_LABEL}
                  </td>
                  <td className="py-2.5">
                    {d.sport
                      ? <Badge tone="green"><Footprints size={11} /> بله{d.sportType ? ` — ${d.sportType}` : ''}</Badge>
                      : <span className="text-slate-300 dark:text-slate-600">{EMPTY_LABEL}</span>}
                  </td>
                  <td className="py-2.5">
                    <button
                      onClick={() => setDetailDay(d.day)}
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-emerald-500/10 hover:text-emerald-600"
                      title="جزئیات کامل روز"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── مودال جزئیات روز ─────────────────────────────── */}
      <Modal
        open={detail != null}
        onClose={() => setDetailDay(null)}
        title={detail ? formatJalali(detail.day, { weekday: true }) : ''}
        sub={detail ? `${formatJalaliShort(detail.day)} • نمای کامل داده‌های ثبت‌شده این روز` : undefined}
        wide
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={detail.score != null ? 'amber' : 'slate'}>
                <Star size={11} /> نمره: {detail.score != null ? `${formatScore(detail.score)} از ۱۰ (${scoreGrade(detail.score)})` : EMPTY_LABEL}
              </Badge>
              <Badge tone="violet"><Smile size={11} /> حال: {moodLabel(detail.mood)}</Badge>
              <Badge tone={detail.tasksTotal ? 'green' : 'slate'}>
                <ListChecks size={11} /> تسک: {detail.tasksTotal ? `${toFa(detail.tasksDone)} از ${toFa(detail.tasksTotal)}` : EMPTY_LABEL}
              </Badge>
              <Badge tone={detail.habitsTotal ? 'blue' : 'slate'}>
                <Flame size={11} /> عادت: {detail.habitsTotal ? `${toFa(detail.habitsDone)} از ${toFa(detail.habitsTotal)}` : EMPTY_LABEL}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailBox title="📝 توضیحات روز" lines={[orEmpty(detail.dayNote)]} />
              <DetailBox title="🏆 دستاوردها" lines={[orEmpty(detail.wins)]} />
              <DetailBox title="🔧 قابل بهبود" lines={[orEmpty(detail.improve)]} />
              <DetailBox title="💡 درس آموخته" lines={[orEmpty(detail.lessons)]} />
              <DetailBox title="🙏 قدردانی" lines={[orEmpty(detail.gratitude)]} />
              <DetailBox
                title="😴 خواب، ورزش، بیرون"
                lines={[
                  detail.wake || detail.sleep
                    ? `بیداری ${detail.wake ? formatClock24(detail.wake) : EMPTY_LABEL} • خواب ${detail.sleep ? formatClock24(detail.sleep) : EMPTY_LABEL}` +
                      (detail.sleepMin != null ? ` • مدت ${formatDurationFa(detail.sleepMin)}` : '')
                    : EMPTY_LABEL,
                  detail.sport ? `ورزش: ${detail.sportType || 'بله'}` : `ورزش: ${EMPTY_LABEL}`,
                  detail.wentOut ? `بیرون: ${detail.outPlace || 'بله'}` : `بیرون: ${EMPTY_LABEL}`,
                ]}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailBox
                title="🔥 عادت‌ها"
                lines={
                  detail.habitsTotal === 0
                    ? [EMPTY_LABEL]
                    : [
                        `انجام‌شده (${toFa(detail.habitsDone)}): ${detail.habitsDoneTitles.join('، ') || EMPTY_LABEL}`,
                        `انجام‌نشده (${toFa(detail.habitsMissedTitles.length)}): ${detail.habitsMissedTitles.join('، ') || EMPTY_LABEL}`,
                      ]
                }
              />
              <DetailBox
                title="✅ تسک‌ها"
                lines={
                  detail.tasksTotal === 0
                    ? [EMPTY_LABEL]
                    : detail.tasks.map(
                        (t) => `${t.status === 'done' ? '✔' : '○'} ${t.title}${t.time ? ` — ساعت ${formatClock24(t.time)}` : ''}`,
                      )
                }
              />
              <DetailBox
                title="📅 رویدادها"
                lines={
                  detail.events.length === 0
                    ? [EMPTY_LABEL]
                    : detail.events.map((e) => `${e.title}${e.time ? ` — ساعت ${formatClock24(e.time)}` : ' — بدون ساعت'}`)
                }
              />
              <DetailBox
                title="🌙 حس کلی روز"
                lines={[detail.hasReflection ? 'این روز بازتاب دارد' : 'برای این روز بازتابی ثبت نشده است']}
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
              <Btn
                variant="outline"
                onClick={async () => {
                  const ok = await copyText(buildDayBlock(detail, opts));
                  notify(ok ? 'خلاصه این روز کپی شد' : 'کپی نشد');
                }}
              >
                <Copy size={15} /> کپی خلاصه این روز
              </Btn>
              <Btn
                variant="soft"
                onClick={() => {
                  toggleDay(detail.day);
                  notify(selected.has(detail.day) ? 'از انتخاب حذف شد' : 'به انتخاب اضافه شد');
                }}
              >
                <Check size={15} /> {selected.has(detail.day) ? 'حذف از انتخاب' : 'افزودن به انتخاب'}
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── اجزای کمکی ────────────────────────────────────────────────
function Kpi({
  icon, label, value, sub, c, tone = 'slate',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  c: string;
  tone?: 'slate' | 'green' | 'red';
}) {
  const toneCls = tone === 'green' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'red' ? 'text-rose-500' : 'text-slate-400';
  return (
    <Card hover className="p-4">
      <span className={cx('mb-2.5 grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md', c)}>{icon}</span>
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="tabular mt-1 text-[15px] font-black text-slate-800 dark:text-white">{value}</p>
      {sub && <p className={cx('mt-1 text-[11px] font-bold', toneCls)}>{sub}</p>}
    </Card>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-white/5">
      <p className="tabular text-base font-black text-slate-800 dark:text-white">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold text-slate-400">{label}</p>
      {hint && <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

function PeriodRow({
  label, sub, score, tasksPct, habitRate, onPick,
}: {
  label: string;
  sub: string;
  score: number | null;
  tasksPct: number | null;
  habitRate: number | null;
  onPick: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 px-3.5 py-2.5 dark:border-white/5">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-black text-slate-700 dark:text-slate-200">{label}</p>
        <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>
      </div>
      <span className="tabular flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-black text-amber-700 dark:text-amber-300">
        <Star size={11} /> {score != null ? formatScore(score) : EMPTY_LABEL}
      </span>
      <span className="tabular flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-black text-sky-700 dark:text-sky-300">
        <Target size={11} /> {tasksPct != null ? `${toFa(tasksPct)}٪` : EMPTY_LABEL}
      </span>
      <span className="tabular flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
        <Flame size={11} /> {habitRate != null ? `${toFa(habitRate)}٪` : EMPTY_LABEL}
      </span>
      <button
        onClick={onPick}
        className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-400 transition hover:bg-emerald-500/10 hover:text-emerald-600"
        title="انتخاب روزهای این بازه برای خروجی"
      >
        انتخاب روزها
      </button>
    </div>
  );
}

function CompareRow({
  label, now, prev, format,
}: {
  label: string;
  now: number | null;
  prev: number | null;
  format: (v: number) => string;
}) {
  const delta = now != null && prev != null ? Math.round((now - prev) * 10) / 10 : null;
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300">{label}</p>
        <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          {prev != null && (
            <div className="h-full bg-slate-300 dark:bg-white/25" style={{ width: `${Math.min(100, (prev / Math.max(now ?? 0, prev, 1)) * 100)}%` }} />
          )}
          {now != null && (
            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (now / Math.max(now ?? 0, prev ?? 0, 1)) * 100)}%` }} />
          )}
        </div>
      </div>
      <div className="w-28 shrink-0 text-left">
        <p className="tabular text-[12px] font-black text-slate-700 dark:text-slate-100">
          {now != null ? format(now) : EMPTY_LABEL}
        </p>
        <p className={cx('tabular text-[10px] font-bold', delta == null ? 'text-slate-400' : delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-rose-500' : 'text-slate-400')}>
          {delta == null ? '—' : `${delta > 0 ? '▲' : delta < 0 ? '▼' : '●'} ${formatScore(Math.abs(delta))} نسبت به قبل`}
        </p>
      </div>
    </div>
  );
}

function OptRow({
  label, icon, checked, onChange,
}: {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        'flex items-center gap-2 rounded-xl border px-3 py-2 text-right text-[11px] font-bold transition',
        checked
          ? 'border-emerald-500 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-300'
          : 'border-slate-200 text-slate-400 hover:border-slate-300 dark:border-white/10 dark:text-slate-400',
      )}
    >
      <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-md border', checked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-white/20')}>
        {checked && <CheckIcon size={11} />}
      </span>
      {icon}
      <span className="flex-1">{label}</span>
    </button>
  );
}

function DetailBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-white/5">
      <p className="mb-1.5 text-[11px] font-black text-slate-500">{title}</p>
      <ul className="space-y-1">
        {lines.map((l, i) => (
          <li key={i} className="text-[12px] leading-6 text-slate-600 dark:text-slate-300">{l}</li>
        ))}
      </ul>
    </div>
  );
}
