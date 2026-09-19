import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award, CalendarRange, Download, Lightbulb, Target, Star, Activity,
  BedDouble, Flame, MoonStar, Smile, TrendingUp, TrendingDown,
} from 'lucide-react';
import { useApp } from '../lib/store';
import {
  toJalaali, toFa, todayStart, formatJalali, addDays, formatScore, parseClock,
  rangeLabel, startOfDay,
} from '../lib/jalali';
import { exportRowsCsv, downloadText, habitStreak, reflectionMap } from '../lib/stats';
import { Card, CardHead, Btn, Progress, Segmented, Empty } from '../components/ui';
import { Bars } from '../components/charts';
import { moodFace, moodLabel } from '../lib/types';
import { cx } from '../lib/utils';

type RangeN = 7 | 14 | 30 | 90;

interface DayStat {
  day: number;
  total: number;
  done: number;
  pct: number; // ‎-1 یعنی تسکی نبود
  mood: number | null;
  score: number | null;
  wake?: string;
  sleep?: string;
  sport: boolean;
  wentOut: boolean;
  habits: number;
  habitTotal: number;
}

function sleepDurMin(wake?: string, sleep?: string): number | null {
  if (!wake || !sleep) return null;
  const wm = parseClock(wake);
  const sm = parseClock(sleep);
  if (wm == null || sm == null) return null;
  let diff = wm - sm;
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

function formatDur(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${toFa(h)} ساعت${m ? ` و ${toFa(m)} دقیقه` : ''}`;
}

export default function Reports() {
  const [rangeN, setRangeN] = useState<RangeN>(14);
  const s = useDayStats(rangeN);

  const exportCsv = () => {
    const rows = s.days.map((d) => ({
      تاریخ: formatJalali(d.day),
      تسک_انجام‌شده: d.total ? d.done : 'ثبت نشده',
      تسک_کل: d.total || 'ثبت نشده',
      درصد_انجام: d.pct < 0 ? 'ثبت نشده' : d.pct,
      حال_۱تا۵: d.mood ?? 'ثبت نشده',
      نمره_۰تا۱۰: d.score ?? 'ثبت نشده',
      بیداری: d.wake ?? 'ثبت نشده',
      خواب: d.sleep ?? 'ثبت نشده',
      ورزش: d.sport ? 'بله' : 'ثبت نشده',
      بیرون_رفتن: d.wentOut ? 'بله' : 'ثبت نشده',
      عادت_انجام‌شده: d.habitTotal ? d.habits : 'ثبت نشده',
      عادت_کل: d.habitTotal,
    }));
    downloadText(`life-report-${rangeN}d.csv`, exportRowsCsv(rows), 'text/csv;charset=utf-8');
  };

  return (
    <div className="space-y-5">
      {/* هدر */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1 text-center sm:text-right">
            <h2 className="text-lg font-black text-slate-800 dark:text-white">گزارش زندگی 🌱</h2>
            <p className="text-[11px] text-slate-400">
              بهره‌وری، عادت‌ها، حال روزانه، نمره، خواب و ورزش — {toFa(rangeN)} روز اخیر
            </p>
          </div>
          <Segmented
            value={String(rangeN) as '7' | '14' | '30' | '90'}
            onChange={(v) => setRangeN(Number(v) as RangeN)}
            options={[
              { v: '7', label: '۷ روز' },
              { v: '14', label: '۱۴ روز' },
              { v: '30', label: '۳۰ روز' },
              { v: '90', label: '۹۰ روز' },
            ]}
          />
          <Btn variant="outline" onClick={exportCsv}><Download size={15} /> خروجی CSV</Btn>
        </div>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi icon={<Target size={19} />} label="میانگین انجام تسک‌ها" value={`${toFa(s.avg)}٪`} sub={s.withData.length ? `${toFa(s.withData.length)} روز دارای تسک` : 'تسکی در این بازه نبود'} c="from-sky-500 to-blue-600" />
        <Kpi icon={<Star size={19} />} label="میانگین نمره روز" value={s.avgScore != null ? `${formatScore(s.avgScore)} از ۱۰` : 'ثبت نشده'} sub={s.scoredCount ? `${toFa(s.scoredCount)} روز نمره‌دار` : 'نمره‌ای ثبت نشده'} c="from-amber-500 to-orange-600" />
        <Kpi icon={<Smile size={19} />} label="میانگین حال روزانه" value={s.avgMood != null ? `${moodFace(Math.round(s.avgMood))} ${formatScore(s.avgMood)}` : 'ثبت نشده'} sub={s.moodsCount ? `${toFa(s.moodsCount)} روز ثبت‌شده` : 'حالی ثبت نشده'} c="from-violet-500 to-purple-600" />
        <Kpi icon={<Activity size={19} />} label="روزهای ورزش" value={`${toFa(s.sportDays)} روز`} sub={s.avgSleep ?? 'خوابی ثبت نشده'} c="from-emerald-500 to-teal-600" />
      </div>

      {/* عملکرد روزانه */}
      <DailyPerfSection range={rangeN} onRange={setRangeN} />

      {/* بینش‌ها */}
      {s.lifeInsights.length > 0 && (
        <Card>
          <CardHead title="بینش‌های هوشمند" sub="تحلیل خودکار سبک زندگی شما در این بازه" />
          <ul className="space-y-2 px-5 pb-5">
            {s.lifeInsights.map((t, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-start gap-2.5 rounded-2xl bg-violet-500/[0.06] px-3.5 py-3 text-[12px] leading-6 text-slate-600 ring-1 ring-violet-500/15 dark:text-slate-300"
              >
                <Lightbulb size={16} className="mt-0.5 shrink-0 text-violet-500" />
                {t}
              </motion.li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {/* نمره روزانه */}
        <Card>
          <CardHead title="نمره روزهای اخیر" sub="از بازتاب پایان روز (۰ تا ۱۰ با یک رقم اعشار)" />
          <div className="px-5 pb-5">
            <Bars
              data={s.days.map((d) => ({
                label: toFa(toJalaali(new Date(d.day)).jd),
                value: d.score ?? 0,
                color: d.score == null ? '#cbd5e1' : d.score >= 8 ? '#10b981' : d.score >= 5 ? '#f59e0b' : '#f43f5e',
                dim: d.score == null,
              }))}
              formatTick={(v) => (v > 0 ? formatScore(v) : '')}
            />
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1" dir="ltr">
              {s.days.map((d) => (
                <div
                  key={d.day}
                  title={`${formatJalali(d.day)} — نمره: ${d.score != null ? formatScore(d.score) : 'ثبت نشده'} — حال: ${moodLabel(d.mood)}`}
                  className={cx(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-[13px]',
                    d.mood == null ? 'border-slate-100 text-slate-300 dark:border-white/5' : 'border-transparent bg-violet-500/10',
                  )}
                >
                  {moodFace(d.mood)}
                </div>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">ستون کم‌رنگ = نمره ثبت نشده • ایموجی‌ها: حال ثبت‌شده آن روز</p>
          </div>
        </Card>

        {/* عادت‌ها در بازه */}
        <Card>
          <CardHead title={`عملکرد عادت‌ها (${toFa(rangeN)} روز)`} sub="نسبت انجام به هدف هفتگی" />
          <div className="space-y-3 px-5 pb-5">
            <HabitsReport rangeN={rangeN} />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* خواب و ورزش */}
        <Card>
          <CardHead title="خواب و تحرک" sub="از اطلاعات پایه روز — ساعت‌ها ۲۴ساعته" />
          <div className="px-5 pb-5">
            <SleepSport days={s.days} />
          </div>
        </Card>

        {/* رکوردهای بازه */}
        <Card>
          <CardHead title="رکوردهای این بازه" sub="نکات برجسته" />
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            <Record icon={<Award size={18} />} label="بهترین روز (تسک)" value={s.best ? formatJalali(s.best.day) : '—'} sub={s.best ? `${toFa(s.best.pct)}٪ انجام تسک` : ''} c="bg-amber-500/10 text-amber-600" />
            <Record icon={<Flame size={18} />} label="بهترین استریک عادت" value={s.bestStreak > 0 ? `${toFa(s.bestStreak)} روز` : '—'} sub={s.bestStreakName} c="bg-orange-500/10 text-orange-600" />
            <Record icon={<Star size={18} />} label="بالاترین نمره" value={s.topScore != null ? `${formatScore(s.topScore)} از ۱۰` : '—'} sub={s.topScoreDay ? formatJalali(s.topScoreDay) : ''} c="bg-violet-500/10 text-violet-600" />
            <Record icon={<BedDouble size={18} />} label="میانگین خواب" value={s.avgSleep ?? '—'} sub={s.sleepCount ? `${toFa(s.sleepCount)} شب ثبت‌شده` : ''} c="bg-sky-500/10 text-sky-600" />
          </div>
          <div className="border-t border-slate-100 px-5 py-4 dark:border-white/5">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-slate-500">
              <CalendarRange size={14} className="text-emerald-500" /> خط زمانی بازتاب‌های اخیر
            </div>
            <ReflectionsTimeline rangeN={rangeN} />
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── هوک مشترک آمار روزانه ─────────────────────────────────────
function useDayStats(rangeN: RangeN) {
  const { state } = useApp();
  return useMemo(() => {
    const today = todayStart();
    const habits = state.habits.filter((h) => !h.archived);
    const refMap = reflectionMap(state.reflections);
    const days: DayStat[] = [];
    for (let i = rangeN - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      const ts = state.tasks.filter((t) => !t.backlog && t.due === d);
      const dn = ts.filter((t) => t.status === 'done').length;
      const ref = refMap.get(d);
      const hDone = habits.filter((h) => state.habitLogs[`${h.id}:${d}`]).length;
      days.push({
        day: d,
        total: ts.length,
        done: dn,
        pct: ts.length ? Math.round((dn / ts.length) * 100) : -1,
        mood: ref?.mood ?? null,
        score: ref?.score ?? null,
        wake: ref?.wake,
        sleep: ref?.sleep,
        sport: !!ref?.sport,
        wentOut: !!ref?.wentOut,
        habits: hDone,
        habitTotal: habits.length,
      });
    }
    const withData = days.filter((d) => d.total > 0);
    const avg = withData.length ? Math.round(withData.reduce((a, d) => a + d.pct, 0) / withData.length) : 0;
    const best = withData.reduce<DayStat | null>((a, d) => (d.pct > (a?.pct ?? -1) ? d : a), null);
    const moods = days.filter((d) => d.mood != null);
    const avgMood = moods.length ? +(moods.reduce((a, d) => a + (d.mood ?? 0), 0) / moods.length).toFixed(1) : null;
    const scored = days.filter((d) => d.score != null);
    const avgScore = scored.length ? +(scored.reduce((a, d) => a + (d.score ?? 0), 0) / scored.length).toFixed(1) : null;
    const topScored = scored.reduce<DayStat | null>((a, d) => ((d.score ?? -1) > (a?.score ?? -1) ? d : a), null);
    const sportDays = days.filter((d) => d.sport).length;
    const sleepDurs = days.map((d) => sleepDurMin(d.wake, d.sleep)).filter((x): x is number => x != null);
    const avgSleep = sleepDurs.length ? formatDur(sleepDurs.reduce((a, x) => a + x, 0) / sleepDurs.length) : null;

    let bestStreak = 0;
    let bestStreakName = '';
    for (const h of habits) {
      const st = habitStreak(h.id, state.habitLogs);
      if (st > bestStreak) {
        bestStreak = st;
        bestStreakName = h.title;
      }
    }

    const lifeInsights = buildLifeInsights({ days, withData, avg, best, avgMood, avgScore, sportDays, habits });
    return {
      days, withData, avg, best,
      moodsCount: moods.length, avgMood,
      scoredCount: scored.length, avgScore,
      topScore: topScored?.score ?? null, topScoreDay: topScored?.day ?? null,
      sportDays, sleepCount: sleepDurs.length, avgSleep,
      bestStreak, bestStreakName, lifeInsights,
    };
  }, [state.tasks, state.reflections, state.habits, state.habitLogs, rangeN]);
}

function buildLifeInsights(a: {
  days: DayStat[]; withData: DayStat[]; avg: number; best: DayStat | null;
  avgMood: number | null; avgScore: number | null; sportDays: number;
  habits: Array<{ id: string; title: string }>;
}): string[] {
  const out: string[] = [];
  if (a.withData.length === 0 && a.days.every((d) => d.mood == null && d.score == null)) {
    return ['هنوز داده‌ای در این بازه ثبت نشده؛ چند تسک زمان‌بندی کن و هر شب بازتاب بنویس تا تحلیل هوشمند اینجا نمایش داده شود.'];
  }
  if (a.withData.length > 0) {
    if (a.avg >= 80) out.push(`میانگین انجام تسک‌ها ${toFa(a.avg)}٪ است — فوق‌العاده! همین روند را حفظ کن. 🌟`);
    else if (a.avg >= 50) out.push(`میانگین انجام تسک‌ها ${toFa(a.avg)}٪ است. با شکستن تسک‌های بزرگ به قدم‌های کوچک‌تر می‌توانی بالاترش ببری.`);
    else out.push(`میانگین انجام تسک‌ها فقط ${toFa(a.avg)}٪ است. پیشنهاد: هر روز فقط ۳ تسک مهم انتخاب کن و بقیه را به بک‌لاگ بسپار.`);
  }
  if (a.best) out.push(`بهترین روزت ${formatJalali(a.best.day)} بود با ${toFa(a.best.pct)}٪ انجام. سعی کن الگوی آن روز را تکرار کنی.`);
  // روند حال: مقایسه نیمه اول و دوم
  const half = Math.floor(a.days.length / 2);
  const first = a.days.slice(0, half).filter((d) => d.mood != null);
  const second = a.days.slice(half).filter((d) => d.mood != null);
  if (first.length >= 2 && second.length >= 2) {
    const m1 = first.reduce((x, d) => x + (d.mood ?? 0), 0) / first.length;
    const m2 = second.reduce((x, d) => x + (d.mood ?? 0), 0) / second.length;
    if (m2 - m1 >= 0.7) out.push('روند حالت صعودی است 📈 — هر کاری که می‌کنی، درست است!');
    else if (m1 - m2 >= 0.7) out.push('روند حالت کمی نزولی است 📉 — بد نیست خواب، ورزش و بار کاری‌ات را مرور کنی.');
  }
  if (a.avgScore != null) {
    if (a.avgScore >= 8) out.push(`میانگین نمره روزهایت ${formatScore(a.avgScore)} از ۱۰ است — روزهای درخشانی داری! ✨`);
    else if (a.avgScore < 5) out.push(`میانگین نمره روزهایت ${formatScore(a.avgScore)} از ۱۰ است. مرور «۱ مورد قابل بهبود» در بازتاب‌ها کمکت می‌کند.`);
  }
  if (a.sportDays === 0) out.push('در این بازه ورزشی ثبت نشده. حتی ۱۵ دقیقه پیاده‌روی هم روی حال و نمره روز اثر می‌گذارد. 🏃');
  else if (a.sportDays >= 3) out.push(`${toFa(a.sportDays)} روز ورزش در این بازه — آفرین! بدن فعال، ذهن فعال. 💪`);
  if (a.habits.length === 0) out.push('هنوز عادتی نداری؛ یک عادت کوچک روزانه (مثلاً مطالعه ۱۰ دقیقه‌ای) اثر مرکب شگفت‌انگیزی دارد.');
  return out.slice(0, 6);
}

function HabitsReport({ rangeN }: { rangeN: number }) {
  const { state } = useApp();
  const habits = state.habits.filter((h) => !h.archived);
  const today = todayStart();
  if (habits.length === 0) {
    return <p className="rounded-2xl bg-slate-50 py-5 text-center text-xs text-slate-400 dark:bg-white/5">عادت فعالی نداری — از بخش عادت‌ها بساز</p>;
  }
  return (
    <>
      {habits.map((h) => {
        let done = 0;
        for (let i = 0; i < rangeN; i++) {
          if (state.habitLogs[`${h.id}:${addDays(today, -i)}`]) done++;
        }
        const expected = Math.max(1, Math.round((h.targetPerWeek / 7) * rangeN));
        const pct = Math.min(100, Math.round((done / expected) * 100));
        const streak = habitStreak(h.id, state.habitLogs);
        return (
          <div key={h.id}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs font-bold">
              <span className="flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: h.color }} />
                <span className="truncate">{h.title}</span>
              </span>
              <span className="tabular flex shrink-0 items-center gap-1.5 text-slate-400">
                {streak > 1 && <span className="inline-flex items-center gap-0.5 text-orange-500"><Flame size={11} />{toFa(streak)}</span>}
                {toFa(done)}/{toFa(expected)}
              </span>
            </div>
            <Progress value={pct} color={h.color} h={7} />
          </div>
        );
      })}
    </>
  );
}

function SleepSport({ days }: { days: DayStat[] }) {
  const withSleep = days.filter((d) => sleepDurMin(d.wake, d.sleep) != null);
  const avg = withSleep.length
    ? withSleep.reduce((a, d) => a + (sleepDurMin(d.wake, d.sleep) ?? 0), 0) / withSleep.length
    : null;
  const sportDays = days.filter((d) => d.sport);
  const outDays = days.filter((d) => d.wentOut);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
          <p className="tabular text-base font-black text-slate-800 dark:text-white">{avg != null ? formatDur(avg) : 'ثبت نشده'}</p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-400">میانگین خواب</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
          <p className="tabular text-base font-black text-emerald-600">{toFa(sportDays.length)}</p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-400">روز ورزش</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
          <p className="tabular text-base font-black text-sky-600">{toFa(outDays.length)}</p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-400">روز بیرون</p>
        </div>
      </div>
      {withSleep.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-black text-slate-500">مدت خواب شبانه (ساعت)</p>
          <Bars
            data={days.map((d) => {
              const m = sleepDurMin(d.wake, d.sleep);
              const h = m != null ? +(m / 60).toFixed(1) : 0;
              return {
                label: toFa(toJalaali(new Date(d.day)).jd),
                value: h,
                color: m == null ? '#cbd5e1' : h >= 7 && h <= 9 ? '#10b981' : '#f59e0b',
                dim: m == null,
              };
            })}
            height={130}
            formatTick={(v) => (v > 0 ? toFa(v) : '')}
          />
          <p className="mt-1 text-[11px] text-slate-400">محدوده ایده‌آل: ۷ تا ۹ ساعت خواب شبانه</p>
        </div>
      ) : (
        <p className="rounded-2xl bg-slate-50 py-4 text-center text-xs text-slate-400 dark:bg-white/5">
          ساعت خواب و ورزش را در «اطلاعات پایه روز» صفحه روز جاری ثبت کن
        </p>
      )}
    </div>
  );
}

function ReflectionsTimeline({ rangeN }: { rangeN: number }) {
  const { state } = useApp();
  const from = addDays(todayStart(), -(rangeN - 1));
  const list = (state.reflections ?? [])
    .filter((r) => r.day >= from)
    .sort((a, b) => b.day - a.day)
    .slice(0, 8);
  if (list.length === 0) {
    return (
      <Empty
        icon={<MoonStar size={26} />}
        title="بازتابی در این بازه نیست"
        sub="هر شب از صفحه «روز جاری» دو دقیقه برای بازتاب وقت بگذار"
      />
    );
  }
  return (
    <ul className="space-y-2.5">
      {list.map((r) => (
        <li key={r.day} className="rounded-2xl border border-slate-100 p-3.5 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{moodFace(r.mood)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-black text-slate-700 dark:text-slate-200">{formatJalali(r.day, { weekday: true })}</p>
              <p className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                {r.sport && <span>🏃 ورزش{r.sportType ? `: ${r.sportType}` : ''}</span>}
                {r.wentOut && <span>🚶 بیرون{r.outPlace ? `: ${r.outPlace}` : ''}</span>}
                {r.wake && r.sleep && <span className="tabular">😴 {r.sleep} تا {r.wake}</span>}
              </p>
            </div>
            <span className={cx(
              'tabular flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black',
              r.score == null ? 'bg-slate-100 text-slate-400 dark:bg-white/5'
                : r.score >= 8 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                  : r.score >= 5 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
            )}>
              {r.score != null ? <><Star size={12} />{formatScore(r.score)}</> : 'ثبت نشده'}
            </span>
          </div>
          {(r.wins?.trim() || r.improve?.trim() || r.lessons?.trim() || r.gratitude?.trim()) && (
            <div className="mt-2.5 grid gap-1.5 text-[11px] leading-6 sm:grid-cols-2">
              {r.wins?.trim() && <p className="rounded-xl bg-emerald-500/5 px-2.5 py-1.5 text-slate-600 ring-1 ring-emerald-500/10 dark:text-slate-300">🏆 {r.wins}</p>}
              {r.improve?.trim() && <p className="rounded-xl bg-sky-500/5 px-2.5 py-1.5 text-slate-600 ring-1 ring-sky-500/10 dark:text-slate-300">🔧 {r.improve}</p>}
              {r.lessons?.trim() && <p className="rounded-xl bg-violet-500/5 px-2.5 py-1.5 text-slate-600 ring-1 ring-violet-500/10 dark:text-slate-300">💡 {r.lessons}</p>}
              {r.gratitude?.trim() && <p className="rounded-xl bg-amber-500/5 px-2.5 py-1.5 text-slate-600 ring-1 ring-amber-500/10 dark:text-slate-300">🙏 {r.gratitude}</p>}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// ── عملکرد روزانه: بهره‌وری تسک‌ها + حال روزانه + نمره ──
function DailyPerfSection({ range, onRange }: { range: RangeN; onRange: (r: RangeN) => void }) {
  const { days, avg, best, avgMood, avgScore } = useDayStats(range);
  const prevFrom = addDays(todayStart(), -(range * 2 - 1));
  const prevTo = addDays(todayStart(), -range);
  const prevStats = usePrevStats(prevFrom, prevTo);
  const delta = prevStats.avgTask != null ? Math.round(avg - prevStats.avgTask) : null;

  return (
    <Card>
      <CardHead
        title="عملکرد روزانه"
        sub="درصد انجام تسک‌ها، حال روزانه و نمره روز"
        action={
          <Segmented
            value={String(range) as '7' | '14' | '30' | '90'}
            onChange={(v) => onRange(Number(v) as RangeN)}
            options={[
              { v: '7', label: '۷ روز' },
              { v: '14', label: '۱۴ روز' },
              { v: '30', label: '۳۰ روز' },
              { v: '90', label: '۹۰ روز' },
            ]}
          />
        }
      />
      <div className="grid grid-cols-2 gap-3 px-5 pb-3 sm:grid-cols-4">
        <MiniStat label="میانگین انجام تسک" value={`${toFa(avg)}٪`} delta={delta} />
        <MiniStat label="میانگین نمره" value={avgScore != null ? formatScore(avgScore) : 'ثبت نشده'} />
        <MiniStat label="میانگین حال" value={avgMood != null ? `${moodFace(Math.round(avgMood))} ${formatScore(avgMood)}` : 'ثبت نشده'} />
        <MiniStat label="بهترین روز" value={best ? formatJalali(best.day) : '—'} sub={best ? `${toFa(best.pct)}٪ انجام` : ''} />
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
      <div className="px-5 pb-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1" dir="ltr">
          {days.map((d) => (
            <div
              key={d.day}
              title={`${formatJalali(d.day)} — انجام تسک: ${d.pct < 0 ? 'تسکی نبود' : toFa(d.pct) + '٪'} — حال: ${moodLabel(d.mood)} — عادت: ${toFa(d.habits)}/${toFa(d.habitTotal)} — نمره: ${d.score != null ? formatScore(d.score) : 'ثبت نشده'}`}
              className={cx(
                'grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-[13px] transition',
                d.mood == null ? 'border-slate-100 text-slate-300 dark:border-white/5' : 'border-transparent bg-violet-500/10',
              )}
            >
              {moodFace(d.mood)}
            </div>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          نوارها: درصد انجام تسک هر روز • ایموجی‌ها: حال ثبت‌شده • خط زمانی {formatJalali(days[0]?.day ?? todayStart())} تا {formatJalali(days[days.length - 1]?.day ?? todayStart())}
        </p>
      </div>
      <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400 dark:border-white/5">
        بازه پیشین ({rangeLabel(prevFrom, prevTo)}): میانگین انجام تسک{' '}
        <b className="tabular text-slate-600 dark:text-slate-300">{prevStats.avgTask != null ? `${toFa(prevStats.avgTask)}٪` : 'ثبت نشده'}</b>
        {' '}• میانگین نمره{' '}
        <b className="tabular text-slate-600 dark:text-slate-300">{prevStats.avgScore != null ? formatScore(prevStats.avgScore) : 'ثبت نشده'}</b>
      </div>
    </Card>
  );
}

function usePrevStats(from: number, to: number) {
  const { state } = useApp();
  return useMemo(() => {
    const start = startOfDay(from);
    const end = startOfDay(to);
    const daysT: number[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) daysT.push(d);
    const tasksByDay = state.tasks.filter((t) => !t.backlog && t.due != null && t.due >= start && t.due <= end);
    const dayPcts: number[] = [];
    for (const d of daysT) {
      const list = tasksByDay.filter((t) => t.due === d);
      if (list.length) dayPcts.push(Math.round((list.filter((t) => t.status === 'done').length / list.length) * 100));
    }
    const refs = state.reflections.filter((r) => r.day >= start && r.day <= end && r.score != null);
    return {
      avgTask: dayPcts.length ? Math.round(dayPcts.reduce((a, b) => a + b, 0) / dayPcts.length) : null,
      avgScore: refs.length ? +(refs.reduce((a, r) => a + (r.score ?? 0), 0) / refs.length).toFixed(1) : null,
    };
  }, [state.tasks, state.reflections, from, to]);
}

function MiniStat({ label, value, sub, delta }: { label: string; value: string; sub?: string; delta?: number | null }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-white/5">
      <p className="tabular truncate text-[15px] font-black text-slate-800 dark:text-white">{value}</p>
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      {delta != null && (
        <p className={cx('tabular mt-0.5 text-[10px] font-black', delta >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
          {delta >= 0 ? <TrendingUp size={10} className="inline" /> : <TrendingDown size={10} className="inline" />} {toFa(Math.abs(delta))}٪ نسبت به بازه قبل
        </p>
      )}
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
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
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '●'} {toFa(Math.abs(delta))}٪
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
