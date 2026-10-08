import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Award, BedDouble, ChevronLeft, Download, Flame, Lightbulb,
  MoonStar, Smile, Sparkles, Star, Target, TrendingDown, TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/store';
import { formatJalali, formatScore, toFa, toJalaali, todayStart, addDays } from '../lib/jalali';
import {
  buildDayStats, formatDurationFa, rollupDays, scoreStats, trendDelta, type DayStat,
} from '../lib/days';
import { buildLifeInsights, daysSinceLastScore, goodStreak } from '../lib/insights';
import { habitStreak, habitWeekCount, exportRowsCsv, downloadText } from '../lib/stats';
import { EMPTY_LABEL, moodFace, scoreGrade, scoreHeatClass } from '../lib/display';
import { Badge, Btn, Card, CardHead, Empty, Progress, Segmented } from '../components/ui';
import { Bars, ScoreTrend } from '../components/charts';
import { cx } from '../lib/utils';

type RangeN = 7 | 14 | 30 | 90;

export default function Reports() {
  const { state } = useApp();
  const [rangeN, setRangeN] = useState<RangeN>(14);
  const [trendKind, setTrendKind] = useState<'tasks' | 'score'>('score');
  const today = todayStart();

  const stats = useMemo(() => {
    const days: number[] = [];
    for (let i = rangeN - 1; i >= 0; i--) days.push(addDays(today, -i));
    return buildDayStats(state, days);
  }, [state, today, rangeN]);

  const s = useMemo(() => scoreStats(stats), [stats]);
  const roll = useMemo(() => rollupDays(stats), [stats]);
  const delta = useMemo(() => trendDelta(stats), [stats]);
  const streakDays = useMemo(() => goodStreak(stats, 8), [stats]);
  const sinceLast = useMemo(() => daysSinceLastScore(stats), [stats]);

  const insights = useMemo(
    () => buildLifeInsights({ stats, s, roll, streakDays, sinceLast, range: { label: `${rangeN} روز`, days: stats.map((d) => d.day) } }),
    [stats, s, roll, streakDays, sinceLast, rangeN],
  );

  const exportCsv = () => {
    const rows = stats.map((d) => ({
      تاریخ: formatJalali(d.day),
      تسک_انجام_شده: d.tasksDone,
      تسک_کل: d.tasksTotal,
      درصد_انجام: d.tasksPct < 0 ? EMPTY_LABEL : d.tasksPct,
      حال: d.mood == null ? EMPTY_LABEL : moodFace(d.mood),
      نمره: d.score == null ? EMPTY_LABEL : formatScore(d.score),
      بیداری: d.wake || EMPTY_LABEL,
      خواب: d.sleep || EMPTY_LABEL,
      مدت_خواب: d.sleepMin == null ? EMPTY_LABEL : Math.round(d.sleepMin),
      ورزش: d.sport ? 'بله' : 'خیر',
      بیرون_رفتن: d.wentOut ? 'بله' : 'خیر',
      عادت_انجام_شده: d.habitsDone,
      عادت_کل: d.habitsTotal,
      توضیحات: d.dayNote || EMPTY_LABEL,
    }));
    downloadText(`life-report-${rangeN}d.csv`, exportRowsCsv(rows));
  };

  return (
    <div className="space-y-5">
      {/* هدر */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-slate-800 dark:text-white">گزارش زندگی 🌱</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">
              بهره‌وری، عادت‌ها، حال روزانه، خواب و ورزش — {toFa(rangeN)} روز اخیر
            </p>
          </div>
          <Segmented
            value={String(rangeN) as '7' | '14' | '30' | '90'}
            onChange={(v) => setRangeN(Number(v) as RangeN)}
            options={[
              { v: '7', label: '۷ روز' }, { v: '14', label: '۱۴ روز' },
              { v: '30', label: '۳۰ روز' }, { v: '90', label: '۹۰ روز' },
            ]}
          />
          <Btn variant="outline" onClick={exportCsv}><Download size={15} /> خروجی CSV</Btn>
          <Link to="/insights">
            <Btn variant="soft"><Sparkles size={15} /> تحلیل روزها</Btn>
          </Link>
        </div>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          icon={<Target size={19} />} label="میانگین انجام تسک‌ها"
          value={roll.avgTasksPct != null ? `${toFa(roll.avgTasksPct)}٪` : EMPTY_LABEL}
          sub={roll.taskDays ? `${toFa(roll.doneTasks)} از ${toFa(roll.totalTasks)} تسک` : 'تسکی در این بازه نبود'}
          c="from-sky-500 to-blue-600"
        />
        <Kpi
          icon={<Star size={19} />} label="میانگین نمره روز"
          value={s.avg != null ? `${formatScore(s.avg)} از ۱۰` : EMPTY_LABEL}
          delta={delta} invert={false}
          sub={s.count ? `${toFa(s.count)} روز دارای نمره • ${scoreGrade(s.avg)}` : 'نمره‌ای ثبت نشده'}
          c="from-amber-500 to-orange-600"
        />
        <Kpi
          icon={<Smile size={19} />} label="میانگین حال روزانه"
          value={roll.avgMood != null ? `${moodFace(Math.round(roll.avgMood))} ${formatScore(roll.avgMood)}` : EMPTY_LABEL}
          sub={roll.moodCount ? `${toFa(roll.moodCount)} روز ثبت‌شده از ۵` : 'حالی ثبت نشده'}
          c="from-violet-500 to-purple-600"
        />
        <Kpi
          icon={<Activity size={19} />} label="روزهای ورزش"
          value={`${toFa(roll.sportDays)} روز`}
          sub={roll.avgSleepMin != null ? `میانگین خواب ${formatDurationFa(roll.avgSleepMin)}` : 'خوابی ثبت نشده'}
          c="from-emerald-500 to-teal-600"
        />
      </div>

      {/* عملکرد روزانه */}
      <Card>
        <CardHead
          title="عملکرد روزانه"
          sub={trendKind === 'tasks' ? 'درصد انجام تسک‌های هر روز' : 'نمره هر روز (۰ تا ۱۰ با یک رقم اعشار)'}
          action={
            <Segmented
              value={trendKind}
              onChange={setTrendKind}
              options={[
                { v: 'tasks', label: 'تسک‌ها', icon: <Target size={13} /> },
                { v: 'score', label: 'نمره', icon: <Star size={13} /> },
              ]}
            />
          }
        />
        <div className="px-5 pb-4">
          {trendKind === 'tasks' ? (
            <Bars
              data={stats.map((d) => ({
                label: toFa(toJalaali(new Date(d.day)).jd),
                value: Math.max(d.tasksPct, 0),
                color: d.tasksPct < 0 ? '#cbd5e1' : d.tasksPct >= 80 ? '#10b981' : d.tasksPct >= 50 ? '#f59e0b' : '#f43f5e',
                dim: d.tasksPct < 0,
                hint: `${formatJalali(d.day)} — ${d.tasksPct < 0 ? 'تسکی نبود' : `${toFa(d.tasksPct)}٪ (${toFa(d.tasksDone)} از ${toFa(d.tasksTotal)})`}`,
              }))}
              formatTick={(v) => (v > 0 ? `${toFa(v)}٪` : '')}
              averageLabel="میانگین"
            />
          ) : (
            <ScoreTrend
              points={stats.map((d) => ({
                label: toFa(toJalaali(new Date(d.day)).jd),
                value: d.score,
                hint: `${formatJalali(d.day)} — نمره: ${d.score != null ? formatScore(d.score) : EMPTY_LABEL}`,
              }))}
              height={200}
            />
          )}
        </div>
        {/* نوار حال روزانه */}
        <div className="border-t border-slate-100 px-5 py-4 dark:border-white/5">
          <p className="mb-2 text-[11px] font-black text-slate-500">حال روزانه ({toFa(rangeN)} روز)</p>
          <div className="flex gap-1 overflow-x-auto pb-1" dir="ltr">
            {stats.map((d) => (
              <div
                key={d.day}
                title={`${formatJalali(d.day)} — حال: ${d.mood != null ? moodFace(d.mood) : EMPTY_LABEL} • نمره: ${d.score != null ? formatScore(d.score) : EMPTY_LABEL}`}
                className={cx(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-[13px]',
                  d.mood == null ? 'border-slate-100 text-slate-300 dark:border-white/5 dark:text-slate-600' : 'border-transparent bg-violet-500/10',
                )}
              >
                {moodFace(d.mood)}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* بینش‌های هوشمند */}
      <Card>
        <CardHead title="بینش‌های هوشمند" sub="تحلیل خودکار سبک زندگی شما در این بازه" />
        <ul className="space-y-2 px-5 pb-5">
          {insights.map((t, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.07, 0.4) }}
              className="flex items-start gap-2.5 rounded-2xl bg-violet-500/[0.06] px-3.5 py-3 text-[12px] leading-6 text-slate-600 ring-1 ring-violet-500/15 dark:text-slate-300"
            >
              <Lightbulb size={16} className="mt-0.5 shrink-0 text-violet-500" />
              {t}
            </motion.li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* عادت‌ها */}
        <Card>
          <CardHead title={`عملکرد عادت‌ها (${toFa(rangeN)} روز)`} sub="نسبت انجام هر عادت در بازه" action={<Badge tone="slate">{toFa(roll.habitChecks)} ثبت از {toFa(roll.habitPossible)} فرصت</Badge>} />
          <div className="px-5 pb-5">
            <HabitsReport days={stats} />
          </div>
        </Card>

        {/* خواب و ورزش */}
        <Card>
          <CardHead title="خواب و تحرک" sub="از اطلاعات پایه هر روز (ساعت‌ها ۲۴ ساعته)" />
          <div className="px-5 pb-5">
            <SleepSport days={stats} />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* رکوردها */}
        <Card>
          <CardHead title="رکوردهای این بازه" sub="نکات برجسته" />
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            <Record icon={<Award size={18} />} label="بهترین روز" value={s.best ? formatJalali(s.best.day) : EMPTY_LABEL} sub={s.best ? `نمره ${formatScore(s.best.score!)} از ۱۰` : ''} c="bg-amber-500/10 text-amber-600" />
            <Record icon={<Flame size={18} />} label="بهترین رشته نمره" value={streakDays.length > 1 ? `${toFa(streakDays.length)} روز` : EMPTY_LABEL} sub={streakDays.length > 1 ? 'نمره ۸ و بالاتر' : 'رشته‌ای ثبت نشده'} c="bg-orange-500/10 text-orange-600" />
            <Record icon={<Star size={18} />} label="بالاترین نمره" value={s.max != null ? `${formatScore(s.max)} از ۱۰` : EMPTY_LABEL} sub={s.best ? formatJalali(s.best.day) : ''} c="bg-violet-500/10 text-violet-600" />
            <Record icon={<BedDouble size={18} />} label="میانگین خواب" value={roll.avgSleepMin != null ? formatDurationFa(roll.avgSleepMin) : EMPTY_LABEL} sub={roll.sleepCount ? `${toFa(roll.sleepCount)} شب ثبت‌شده` : ''} c="bg-sky-500/10 text-sky-600" />
          </div>
        </Card>

        {/* توزیع و پراکندگی */}
        <Card>
          <CardHead title="پراکندگی و پایداری" sub="نمره‌های ثبت‌شده در این بازه" />
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            <Record icon={<TrendingUp size={18} />} label="میانه نمره" value={s.median != null ? formatScore(s.median) : EMPTY_LABEL} sub={s.count ? `از ${toFa(s.count)} روز` : ''} c="bg-emerald-500/10 text-emerald-600" />
            <Record icon={<TrendingDown size={18} />} label="نوسان (انحراف معیار)" value={s.std != null ? formatScore(s.std) : EMPTY_LABEL} sub={s.std != null ? (s.std < 1.5 ? 'پایدار 👍' : s.std < 2.5 ? 'متوسط' : 'نوسان زیاد') : ''} c="bg-rose-500/10 text-rose-600" />
            <Record icon={<Award size={18} />} label="روزهای عالی" value={`${toFa(s.greatDays)} روز`} sub="نمره ۸ و بالاتر" c="bg-lime-500/10 text-lime-600" />
            <Record icon={<TrendingDown size={18} />} label="روزهای ضعیف" value={`${toFa(s.lowDays)} روز`} sub="نمره کمتر از ۵" c="bg-slate-500/10 text-slate-500" />
          </div>
        </Card>
      </div>

      {/* خط زمانی بازتاب‌ها */}
      <Card>
        <CardHead
          title="خط زمانی بازتاب‌ها"
          sub="مرور حال، توضیح و درس‌های روزهای اخیر"
          action={<Link to="/insights"><Btn size="sm" variant="ghost">تحلیل کامل <ChevronLeft size={14} /></Btn></Link>}
        />
        <ReflectionsTimeline days={stats} />
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, delta, sub, c }: { icon: React.ReactNode; label: string; value: string; delta?: number | null; invert?: boolean; sub: string; c: string }) {
  return (
    <Card className="p-4">
      <div className="mb-2.5 flex items-start justify-between">
        <span className={cx('grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg', c)}>{icon}</span>
        {delta != null && (
          <span className={cx('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black', delta >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500')}>
            {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {formatScore(Math.abs(delta))}
          </span>
        )}
      </div>
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="tabular mt-1 text-[17px] font-black text-slate-800 dark:text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>
    </Card>
  );
}

function Record({ icon, label, value, sub, c }: { icon: React.ReactNode; label: string; value: string; sub: string; c: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-white/5">
      <span className={cx('mb-2 grid h-9 w-9 place-items-center rounded-xl', c)}>{icon}</span>
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="tabular mt-0.5 truncate text-[15px] font-black text-slate-800 dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

/** عملکرد عادت‌ها در بازه — بر پایه شمارش لاگ‌های ثبت‌شده */
function HabitsReport({ days }: { days: DayStat[] }) {
  const { state } = useApp();
  const habits = state.habits.filter((h) => !h.archived);

  if (habits.length === 0) {
    return <Empty icon={<Flame size={26} />} title="عادت فعالی نداری" sub="از صفحه عادت‌ها اولین عادتت را بساز" action={<Link to="/habits"><Btn size="sm">ساخت عادت</Btn></Link>} />;
  }

  const rows = habits.map((h) => {
    const done = days.filter((d) => state.habitLogs[`${h.id}:${d.day}`]).length;
    const pct = days.length ? Math.round((done / days.length) * 100) : 0;
    return { h, done, pct, streak: habitStreak(h.id, state.habitLogs), week: habitWeekCount(h.id, state.habitLogs) };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.h.id}>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.h.color }} />
            <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-700 dark:text-slate-200">{r.h.title}</span>
            <span className="tabular shrink-0 text-[11px] font-black text-slate-500">
              {toFa(r.done)} از {toFa(days.length)} روز ({toFa(r.pct)}٪)
            </span>
          </div>
          <Progress value={r.pct} color={r.h.color} h={7} />
          <p className="mt-1 text-[10px] text-slate-400">
            استریک فعلی: {r.streak > 0 ? `${toFa(r.streak)} روز` : EMPTY_LABEL} • این هفته: {toFa(r.week)} بار
          </p>
        </li>
      ))}
    </ul>
  );
}

/** خواب (۲۴ ساعته) و تحرک روزانه */
function SleepSport({ days }: { days: DayStat[] }) {
  const sleeps = days.filter((d) => d.sleepMin != null);
  const sportDays = days.filter((d) => d.sport);
  const outDays = days.filter((d) => d.wentOut);
  const avg = sleeps.length ? sleeps.reduce((a, d) => a + (d.sleepMin ?? 0), 0) / sleeps.length : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MiniBox icon={<BedDouble size={16} />} label="میانگین خواب" value={avg != null ? formatDurationFa(avg) : EMPTY_LABEL} c="text-sky-500" />
        <MiniBox icon={<Activity size={16} />} label="روزهای ورزش" value={`${toFa(sportDays.length)} روز`} c="text-emerald-500" />
        <MiniBox icon={<MoonStar size={16} />} label="بیرون رفتن" value={`${toFa(outDays.length)} روز`} c="text-violet-500" />
      </div>

      {sleeps.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 py-4 text-center text-xs text-slate-400 dark:bg-white/5">
          ساعتی برای خواب/بیداری ثبت نشده — از «اطلاعات پایه روز» در صفحه روز جاری وارد کن.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] font-black text-slate-500">مدت خواب هر شب</p>
          {sleeps.slice(-12).map((d) => {
            const mins = d.sleepMin ?? 0;
            const pct = Math.min(100, Math.round((mins / (12 * 60)) * 100));
            const tone = mins < 390 ? '#f59e0b' : mins <= 570 ? '#10b981' : '#0ea5e9';
            return (
              <div key={d.day} className="flex items-center gap-2.5">
                <span className="tabular w-16 shrink-0 text-[11px] font-bold text-slate-400">{formatJalali(d.day)}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: tone }} />
                </span>
                <span className="tabular w-24 shrink-0 text-left text-[11px] font-black text-slate-500">{formatDurationFa(mins)}</span>
              </div>
            );
          })}
          <p className="pt-1 text-[10px] text-slate-400">
            خواب و بیداری هر روز با ساعت ۲۴ ساعته ثبت می‌شود (مثلاً ۲۳:۳۰ تا ۰۷:۰۰).
          </p>
        </div>
      )}
    </div>
  );
}

function MiniBox({ icon, label, value, c }: { icon: React.ReactNode; label: string; value: string; c: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-3 text-center dark:border-white/5">
      <span className={cx('mx-auto mb-1.5 grid h-8 w-8 place-items-center rounded-xl bg-slate-50 dark:bg-white/5', c)}>{icon}</span>
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      <p className="tabular mt-0.5 truncate text-xs font-black text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}

/** خط زمانی بازتاب‌های پایان روز در بازه */
function ReflectionsTimeline({ days }: { days: DayStat[] }) {
  const items = [...days].reverse().filter((d) => d.hasReflection);
  if (items.length === 0) {
    return <Empty icon={<MoonStar size={26} />} title="بازتابی در این بازه ثبت نشده" sub="هر شب دو دقیقه بنویس تا روند حالت را ببینی" />;
  }
  return (
    <div className="space-y-0 px-5 pb-5">
      {items.map((d, i) => (
        <div key={d.day} className="relative flex gap-3 pb-4 pr-5">
          <span className="absolute right-[5px] top-2 h-2.5 w-2.5 rounded-full" style={{ background: scoreHeatClass(d.score).includes('rose') ? '#f43f5e' : '#10b981' }} />
          {i < items.length - 1 && <span className="absolute bottom-0 right-[9px] top-4 w-0.5 bg-slate-100 dark:bg-white/10" />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-black text-slate-700 dark:text-slate-200">{formatJalali(d.day, { weekday: true })}</span>
              <span className="text-base">{moodFace(d.mood)}</span>
              <span className={cx('tabular rounded-full px-2 py-0.5 text-[10px] font-black', d.score != null ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300' : 'bg-slate-100 text-slate-400 dark:bg-white/10')}>
                {d.score != null ? `نمره ${formatScore(d.score)}` : EMPTY_LABEL}
              </span>
              {d.sport && <Badge tone="green">🏃 ورزش</Badge>}
              {d.wentOut && <Badge tone="violet">🚶 بیرون</Badge>}
            </div>
            <div className="mt-1.5 space-y-1 text-[11px] leading-6 text-slate-500 dark:text-slate-400">
              {d.dayNote?.trim() ? <p>📝 {d.dayNote.trim()}</p> : <p className="text-slate-300 dark:text-slate-600">📝 {EMPTY_LABEL}</p>}
              {d.wins.trim() && <p>🏆 {d.wins.trim()}</p>}
              {d.improve?.trim() && <p>🔧 {d.improve.trim()}</p>}
              {d.lessons.trim() && <p>💡 {d.lessons.trim()}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
