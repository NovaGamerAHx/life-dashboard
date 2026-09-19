import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ListTodo, CalendarDays, Flame, Plus, ArrowLeft, CheckCircle2, Clock, Sparkles,
  ChevronLeft, Activity, Star, StickyNote, MoonStar, LineChart,
} from 'lucide-react';
import { useApp } from '../lib/store';
import {
  toJalaali, J_MONTHS, toFa, greetingByHour, formatJalali, todayStart, addDays,
  weekdayName, smartDate, diffDays, formatScore, clockToFa,
} from '../lib/jalali';
import { habitStreak, reflectionMap } from '../lib/stats';
import { useNow } from '../lib/hooks';
import { moodFace, type DayReflection } from '../lib/types';
import { Card, CardHead, Btn, Badge, Empty } from '../components/ui';
import { Bars } from '../components/charts';
import type { QuickKind } from '../components/Shell';
import { cx } from '../lib/utils';

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

export default function Dashboard({ onQuickAdd }: { onQuickAdd: (k: QuickKind) => void }) {
  const { state } = useApp();
  const nowTs = useNow();
  const now = new Date(nowTs);
  const j = toJalaali(now);
  const today = todayStart();

  const openTasks = useMemo(() => state.tasks.filter((t) => t.status !== 'done' && !t.backlog), [state.tasks]);
  const overdue = useMemo(() => openTasks.filter((t) => t.due != null && diffDays(t.due, nowTs) < 0), [openTasks, nowTs]);
  const dueToday = useMemo(() => openTasks.filter((t) => t.due != null && diffDays(t.due, nowTs) === 0), [openTasks, nowTs]);
  const todayEvents = useMemo(
    () => state.events.filter((e) => e.day === today).sort((a, b) => (a.time || '99').localeCompare(b.time || '99')),
    [state.events, today],
  );

  const activeHabits = useMemo(() => state.habits.filter((h) => !h.archived), [state.habits]);
  const habitToday = useMemo(
    () => activeHabits.map((h) => ({
      h,
      done: !!state.habitLogs[`${h.id}:${today}`],
      streak: habitStreak(h.id, state.habitLogs),
    })),
    [activeHabits, state.habitLogs, today],
  );

  const todayTasksAll = useMemo(() => state.tasks.filter((t) => !t.backlog && t.due === today), [state.tasks, today]);
  const todayDone = todayTasksAll.filter((t) => t.status === 'done').length;
  const todayPct = todayTasksAll.length ? Math.round((todayDone / todayTasksAll.length) * 100) : 0;

  // ── نمره‌ها و حال روزهای اخیر ──
  const refMap = useMemo(() => reflectionMap(state.reflections), [state.reflections]);
  const last7 = useMemo(() => {
    const out: Array<{ day: number; ref?: DayReflection }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(today, -i);
      out.push({ day: d, ref: refMap.get(d) });
    }
    return out;
  }, [refMap, today]);
  const scored7 = last7.map((x) => x.ref?.score).filter((s): s is number => s != null);
  const avgScore7 = scored7.length ? Math.round((scored7.reduce((a, b) => a + b, 0) / scored7.length) * 10) / 10 : null;
  const sportDays7 = last7.filter((x) => x.ref?.sport).length;
  const todayRef = refMap.get(today);

  const name = state.profile.name?.trim();

  return (
    <div className="space-y-5">
      {/* هیرو */}
      <motion.section
        {...fadeUp}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-xl shadow-emerald-600/20 sm:p-8"
      >
        <div className="bg-grid-fade absolute inset-0 opacity-40" />
        <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 right-1/3 h-56 w-56 rounded-full bg-yellow-300/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-100">
              <Sparkles size={14} />
              {weekdayName(today)}، {toFa(j.jd)} {J_MONTHS[j.jm - 1]} {toFa(j.jy)}
            </p>
            <h2 className="mt-2 text-2xl font-black leading-9 sm:text-[28px]">
              {greetingByHour(now.getHours())}{name ? `، ${name}` : ''} 👋
            </h2>
            <p className="mt-1.5 max-w-lg text-[13px] leading-6 text-emerald-50/90">
              {summarySentence(overdue.length, dueToday.length, todayEvents.length)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => onQuickAdd('task')} className="flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-[13px] font-black text-emerald-700 shadow transition hover:brightness-95 active:scale-95">
                <Plus size={16} strokeWidth={3} /> وظیفه جدید
              </button>
              <button onClick={() => onQuickAdd('event')} className="flex h-10 items-center gap-1.5 rounded-xl bg-white/15 px-4 text-[13px] font-black text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25 active:scale-95">
                <Plus size={16} strokeWidth={3} /> رویداد
              </button>
              <Link to="/today" className="flex h-10 items-center gap-1.5 rounded-xl bg-white/15 px-4 text-[13px] font-black text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25 active:scale-95">
                <MoonStar size={16} strokeWidth={2.6} /> ثبت بازتاب امروز
              </Link>
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <MiniStat label="پیشرفت امروز" value={todayTasksAll.length ? `${toFa(todayPct)}٪` : 'بدون تسک'} />
            <MiniStat label="نمره امروز" value={todayRef?.score != null ? `${formatScore(todayRef.score)} از ۱۰` : 'ثبت نشده'} />
            <MiniStat label="رویداد امروز" value={`${toFa(todayEvents.length)} رویداد`} />
          </div>
        </div>
      </motion.section>

      {/* کارت‌های خلاصه */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard delay={0.05} icon={<ListTodo size={20} />} tone="sky" label="بهره‌وری امروز" value={todayTasksAll.length ? `${toFa(todayPct)}٪` : 'بدون تسک'} sub={todayTasksAll.length ? `${toFa(todayDone)} از ${toFa(todayTasksAll.length)} انجام شد` : 'روز سبکی داری ✨'} alert={overdue.length > 0} />
        <StatCard delay={0.1} icon={<Flame size={20} />} tone="amber" label="بهترین استریک عادت" value={habitToday.length ? `${toFa(Math.max(...habitToday.map((x) => x.streak), 0))} روز` : '—'} sub={`${toFa(habitToday.filter((x) => x.done).length)} از ${toFa(habitToday.length)} امروز انجام شد`} />
        <StatCard delay={0.15} icon={<Star size={20} />} tone="violet" label="میانگین نمره ۷ روز" value={avgScore7 != null ? `${formatScore(avgScore7)} از ۱۰` : 'ثبت نشده'} sub={scored7.length ? `${toFa(scored7.length)} روز نمره‌دار — برای جزئیات به «نمره‌ها» برو` : 'در صفحه «روز جاری» نمره بده'} />
        <StatCard delay={0.2} icon={<Activity size={20} />} tone="green" label="ورزش ۷ روز اخیر" value={`${toFa(sportDays7)} روز`} sub={sportDays7 > 0 ? 'آفرین، ادامه بده! 💪' : 'هنوز ورزشی ثبت نشده'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* روند نمره + یادداشت‌های سنجاق‌شده */}
        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.1 }} className="xl:col-span-2">
          <Card>
            <CardHead
              title="روند نمره روزها — ۱۴ روز اخیر"
              sub="نمره‌های ثبت‌شده در بازتاب پایان روز (با یک رقم اعشار)"
              action={
                <Link to="/insights" className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">
                  تحلیل کامل <ChevronLeft size={14} />
                </Link>
              }
            />
            <div className="px-5 pb-3">
              <ScoreTrend />
            </div>
            <div className="border-t border-slate-100 px-5 py-4 dark:border-white/5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[13px] font-extrabold text-slate-700 dark:text-slate-200">یادداشت‌های سنجاق‌شده 📌</h4>
                <Link to="/notes" className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">
                  همه <ArrowLeft size={13} />
                </Link>
              </div>
              <PinnedNotes onQuickAdd={onQuickAdd} />
            </div>
          </Card>
        </motion.div>

        <div className="space-y-5">
          <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.15 }}>
            <Card>
              <CardHead title="توزیع وضعیت وظایف" sub="نمای کلی بار کاری" />
              <div className="flex flex-col items-center gap-4 px-5 pb-5">
                <TaskStatusDonut />
              </div>
            </Card>
          </motion.div>
          <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.18 }}>
            <Card>
              <CardHead title="حال و نمره ۷ روز اخیر" sub="از بازتاب‌های روزانه" />
              <div className="px-5 pb-5">
                <WeekMood />
              </div>
            </Card>
          </motion.div>

          {/* برنامه امروز */}
          <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.2 }}>
            <Card>
              <CardHead
                title="برنامه امروز"
                sub={formatJalali(today, { weekday: true })}
                action={<Link to="/calendar" className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">تقویم <ChevronLeft size={14} /></Link>}
              />
              <div className="space-y-2 px-5 pb-5">
                {todayEvents.length === 0 && dueToday.length === 0 && (
                  <p className="rounded-2xl bg-slate-50 py-5 text-center text-xs text-slate-400 dark:bg-white/5">امروز برنامه‌ای نداری — از روزت لذت ببر ✨</p>
                )}
                {todayEvents.map((e) => (
                  <div key={e.id} className="flex items-center gap-2.5 rounded-2xl border border-slate-100 px-3 py-2.5 dark:border-white/5">
                    <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: e.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-slate-700 dark:text-slate-200">{e.title}</p>
                      <p className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock size={11} />
                        {e.time ? `ساعت ${clockToFa(e.time)}` : 'بدون ساعت'}
                      </p>
                    </div>
                  </div>
                ))}
                {dueToday.map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5 rounded-2xl bg-amber-500/5 px-3 py-2.5 ring-1 ring-amber-500/20">
                    <CheckCircle2 size={17} className="shrink-0 text-amber-500" />
                    <p className="flex-1 truncate text-[13px] font-bold text-slate-700 dark:text-slate-200">{t.title}</p>
                    <Badge tone="amber">سررسید امروز</Badge>
                  </div>
                ))}
                {overdue.length > 0 && (
                  <Link to="/tasks" className="flex items-center justify-between rounded-2xl bg-rose-500/5 px-3 py-2.5 text-xs font-bold text-rose-600 ring-1 ring-rose-500/20 dark:text-rose-300">
                    {toFa(overdue.length)} وظیفه عقب‌افتاده داری
                    <ArrowLeft size={14} />
                  </Link>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.1 }}>
          <Card>
            <CardHead title="عادت‌های امروز" sub="با یک کلیک ثبت کن" action={<Link to="/habits" className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">همه <ChevronLeft size={14} /></Link>} />
            <TodayHabits />
          </Card>
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.15 }} className="xl:col-span-2">
          <Card>
            <CardHead title="نزدیک‌ترین سررسیدها" sub="وظایف باز به ترتیب فوریت" action={<Link to="/tasks" className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">مدیریت وظایف <ChevronLeft size={14} /></Link>} />
            <UpcomingTasks />
          </Card>
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.2 }} className="xl:col-span-3">
          <Card>
            <CardHead
              title="بازتاب‌های اخیر"
              sub="حال و نمره روزهای گذشته — با یک کلیک به تحلیل و کپی خلاصه‌ها بروید"
              action={<Link to="/insights" className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400"><LineChart size={13} /> نمره‌ها و خلاصه‌ها</Link>}
            />
            <RecentReflections />
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[124px] rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/25 backdrop-blur">
      <p className="text-[11px] font-bold text-emerald-100">{label}</p>
      <p className="tabular mt-1 text-base font-black text-white">{value}</p>
    </div>
  );
}

type Tone = 'green' | 'sky' | 'amber' | 'violet';

function StatCard({ icon, tone, label, value, sub, alert, delay }: { icon: React.ReactNode; tone: Tone; label: string; value: string; sub: string; alert?: boolean; delay: number }) {
  const tones: Record<Tone, string> = {
    green: 'from-emerald-500 to-teal-600 shadow-emerald-600/20',
    sky: 'from-sky-500 to-blue-600 shadow-sky-600/20',
    amber: 'from-amber-500 to-orange-600 shadow-amber-600/20',
    violet: 'from-violet-500 to-purple-600 shadow-violet-600/20',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
      <Card hover className="p-4 sm:p-5">
        <div className={cx('mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg', tones[tone])}>{icon}</div>
        <p className="text-[11px] font-bold text-slate-400">{label}</p>
        <p className="tabular mt-1 text-lg font-black text-slate-800 dark:text-white">{value}</p>
        <p className={cx('mt-1 text-[11px] font-bold', alert ? 'text-rose-500' : 'text-slate-400')}>{sub}</p>
      </Card>
    </motion.div>
  );
}

function summarySentence(overdue: number, dueToday: number, events: number): string {
  const parts: string[] = [];
  if (overdue > 0) parts.push(`${toFa(overdue)} وظیفه عقب‌افتاده`);
  if (dueToday > 0) parts.push(`${toFa(dueToday)} سررسید امروز`);
  if (events > 0) parts.push(`${toFa(events)} رویداد امروز`);
  if (parts.length === 0) return 'امروز سبک به نظر می‌رسد؛ فرصت خوبی برای جلو افتادن از برنامه‌هاست.';
  return `امروز ${parts.join('، ')} داری. بزن بریم! 💪`;
}

export function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** نمودار روند نمره ۱۴ روز اخیر */
function ScoreTrend() {
  const { state } = useApp();
  const today = todayStart();
  const refMap = useMemo(() => reflectionMap(state.reflections), [state.reflections]);
  const data = useMemo(() => {
    const out: Array<{ label: string; value: number; color: string; dim?: boolean }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = addDays(today, -i);
      const s = refMap.get(d)?.score ?? null;
      out.push({
        label: toFa(toJalaali(new Date(d)).jd),
        value: s ?? 0,
        color: s == null ? '#cbd5e1' : s >= 8 ? '#10b981' : s >= 5 ? '#f59e0b' : '#f43f5e',
        dim: s == null,
      });
    }
    return out;
  }, [refMap, today]);
  const scored = data.filter((d) => !d.dim);
  const avgScore = scored.length ? Math.round((scored.reduce((a, d) => a + d.value, 0) / scored.length) * 10) / 10 : null;
  return (
    <div>
      <Bars data={data} formatTick={(v) => (v > 0 ? formatScore(v) : '')} height={150} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>
          میانگین روزهای نمره‌دار:{' '}
          <b className="tabular text-violet-600 dark:text-violet-400">{avgScore != null ? `${formatScore(avgScore)} از ۱۰` : 'ثبت نشده'}</b>
        </span>
        <span>ستون کم‌رنگ = نمره ثبت نشده</span>
      </div>
    </div>
  );
}

function TodayHabits() {
  const { state, toggleHabit } = useApp();
  const today = todayStart();
  const active = state.habits.filter((h) => !h.archived);
  if (active.length === 0) {
    return (
      <div className="px-5 pb-5">
        <Empty icon={<Flame size={26} />} title="هنوز عادت فعالی نداری" sub="از بخش عادت‌ها اولین عادت روزانه‌ات را بساز" action={<Link to="/habits"><Btn>ساخت عادت</Btn></Link>} />
      </div>
    );
  }
  return (
    <ul className="space-y-2 px-5 pb-5">
      {active.slice(0, 5).map((h) => {
        const done = !!state.habitLogs[`${h.id}:${today}`];
        const streak = habitStreak(h.id, state.habitLogs);
        return (
          <li key={h.id}>
            <button
              onClick={() => toggleHabit(h.id, today)}
              className={cx(
                'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-right transition-all active:scale-[0.99]',
                done ? 'border-transparent bg-emerald-500/10' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5',
              )}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition" style={{ background: done ? h.color : 'transparent', border: `2px solid ${h.color}` }}>
                {done && <CheckIcon />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx('block truncate text-[13px] font-bold', done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200')}>{h.title}</span>
                {streak > 1 && <span className="flex items-center gap-1 text-[11px] font-bold text-orange-500"><Flame size={11} />{toFa(streak)} روز پیاپی</span>}
              </span>
            </button>
          </li>
        );
      })}
      {active.length > 5 && (
        <Link to="/habits" className="block pt-1 text-center text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">
          {toFa(active.length - 5)} عادت دیگر…
        </Link>
      )}
    </ul>
  );
}

function UpcomingTasks() {
  const { state, moveTask } = useApp();
  const nowTs = useNow();
  const list = useMemo(() => {
    const open = state.tasks.filter((t) => t.status !== 'done');
    const rank = (t: (typeof open)[number]) => {
      if (t.due == null) return 1e13;
      return t.due + (t.priority === 'high' ? -1e12 : t.priority === 'medium' ? -5e11 : 0);
    };
    return [...open].sort((a, b) => rank(a) - rank(b)).slice(0, 5);
  }, [state.tasks]);

  if (list.length === 0) {
    return (
      <div className="px-5 pb-5">
        <Empty icon={<CheckCircle2 size={26} />} title="همه‌چیز انجام شده! 🎉" sub="هیچ وظیفه بازی نداری. یک وظیفه جدید بساز." />
      </div>
    );
  }
  return (
    <ul className="space-y-2 px-5 pb-5">
      {list.map((t) => {
        const d = t.due != null ? diffDays(t.due, nowTs) : null;
        const tone = d == null ? 'slate' : d < 0 ? 'red' : d === 0 ? 'amber' : 'slate';
        const label = d == null ? 'بدون سررسید' : d === 0 ? 'امروز' : d === 1 ? 'فردا' : d < 0 ? `${toFa(Math.abs(d))} روز عقب` : smartDate(t.due!);
        const tones: Record<string, string> = {
          red: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
          amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
          slate: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300',
        };
        return (
          <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 px-3 py-2.5 transition hover:bg-slate-50/70 dark:border-white/5 dark:hover:bg-white/[0.03]">
            <button
              onClick={() => moveTask(t.id, 'done')}
              title="انجام شد"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-slate-200 text-transparent transition hover:border-emerald-500 hover:bg-emerald-500 hover:text-white dark:border-white/15"
            >
              <CheckIcon />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-slate-700 dark:text-slate-200">{t.title}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className={cx('rounded-full px-2 py-0.5 font-bold', tones[tone])}>{label}</span>
                {t.time && <span className="tabular">ساعت {clockToFa(t.time)}</span>}
                {t.priority === 'high' && <span className="font-bold text-rose-500">• مهم</span>}
              </p>
            </div>
            <Link to="/tasks" className="shrink-0 text-slate-300 transition hover:text-emerald-500"><CalendarDays size={16} /></Link>
          </li>
        );
      })}
    </ul>
  );
}

function PinnedNotes({ onQuickAdd }: { onQuickAdd: (k: QuickKind) => void }) {
  const { state } = useApp();
  const pinned = state.notes.filter((n) => n.pinned).slice(0, 4);
  if (pinned.length === 0) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3.5 dark:bg-white/5">
        <p className="text-xs text-slate-400">یادداشت مهمی را سنجاق کن تا همیشه اینجا ببینی 📌</p>
        <button onClick={() => onQuickAdd('note')} className="flex shrink-0 items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700">
          <Plus size={14} /> یادداشت
        </button>
      </div>
    );
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {pinned.map((n) => (
        <li key={n.id}>
          <Link
            to="/notes"
            className="flex h-full items-start gap-2.5 rounded-2xl border border-slate-100 p-3 transition hover:border-amber-300 hover:shadow-md dark:border-white/5"
            style={{ background: `linear-gradient(180deg, ${n.color}44 0%, transparent 70px)` }}
          >
            <StickyNote size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold text-slate-700 dark:text-slate-200">{n.title}</span>
              {n.body && <span className="mt-0.5 block truncate text-[11px] text-slate-400">{n.body.split('\n')[0]}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TaskStatusDonut() {
  const { state } = useApp();
  const todo = state.tasks.filter((t) => !t.backlog && t.status === 'todo').length;
  const doing = state.tasks.filter((t) => !t.backlog && t.status === 'doing').length;
  const done = state.tasks.filter((t) => !t.backlog && t.status === 'done').length;
  const backlogN = state.tasks.filter((t) => t.backlog && t.status !== 'done').length;
  const total = todo + doing + done;
  if (total + backlogN === 0) {
    return <p className="py-6 text-center text-xs text-slate-400">هنوز وظیفه‌ای ثبت نشده است</p>;
  }
  const rate = total ? Math.round((done / total) * 100) : 0;
  const rows = [
    { label: 'برای انجام', value: todo, color: '#94a3b8' },
    { label: 'در حال انجام', value: doing, color: '#0ea5e9' },
    { label: 'انجام‌شده', value: done, color: '#10b981' },
    ...(backlogN > 0 ? [{ label: 'بک‌لاگ باز', value: backlogN, color: '#f59e0b' }] : []),
  ];
  return (
    <>
      <DonutRing data={rows} label="نرخ انجام" value={`${toFa(rate)}٪`} />
      <div className="w-full space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
            <span className="flex-1 font-bold text-slate-600 dark:text-slate-300">{r.label}</span>
            <span className="tabular font-black text-slate-700 dark:text-slate-100">{toFa(r.value)} تسک</span>
            <span className="tabular w-10 text-left text-[11px] text-slate-400">
              {toFa(Math.round((r.value / Math.max(1, total + backlogN)) * 100))}٪
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/** دونات ساده بدون وابستگی — SVG خالص */
function DonutRing({ data, label, value }: { data: Array<{ label: string; value: number; color: string }>; label: string; value: string }) {
  const size = 180;
  const thickness = 24;
  const r = (size - thickness) / 2;
  const c = size / 2;
  const C = 2 * Math.PI * r;
  const total = data.reduce((a, d) => a + d.value, 0);
  let acc = 0;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={thickness} className="stroke-slate-100 dark:stroke-white/10" />
        {total > 0 && data.map((d) => {
          const frac = d.value / total;
          const dash = frac * C;
          const off = acc * C;
          acc += frac;
          if (dash <= 0.5) return null;
          return (
            <circle
              key={d.label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(dash - 2, 0.5)} ${C - Math.max(dash - 2, 0.5)}`}
              strokeDashoffset={-off}
            >
              <title>{`${d.label}: ${toFa(d.value)}`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[11px] font-bold text-slate-400">{label}</div>
          <div className="tabular text-lg font-black text-slate-800 dark:text-white">{value}</div>
        </div>
      </div>
    </div>
  );
}

function WeekMood() {
  const { state } = useApp();
  const today = todayStart();
  const refMap = useMemo(() => reflectionMap(state.reflections), [state.reflections]);
  const days: number[] = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(today, -i));
  return (
    <div className="flex gap-1.5" dir="ltr">
      {days.map((d) => {
        const r = refMap.get(d);
        const isToday = d === today;
        return (
          <div
            key={d}
            title={`${formatJalali(d)}${r ? ` — حال: ${moodFace(r.mood)}${r.score != null ? ` • نمره: ${formatScore(r.score)}` : ''}` : ' — ثبت نشده'}`}
            className={cx(
              'flex flex-1 flex-col items-center gap-1 rounded-xl border py-2 transition',
              r ? 'border-transparent bg-violet-500/10' : 'border-slate-100 dark:border-white/5',
              isToday && 'ring-2 ring-emerald-500/60',
            )}
          >
            <span className="text-lg leading-none">{moodFace(r?.mood)}</span>
            <span className="tabular text-[10px] font-black text-slate-400">{toFa(toJalaali(new Date(d)).jd)}</span>
            {r?.score != null ? (
              <span className="tabular rounded-full bg-amber-500/15 px-1.5 text-[9px] font-black text-amber-600 dark:text-amber-300">
                {formatScore(r.score)}
              </span>
            ) : (
              <span className="text-[8px] font-bold text-slate-400">ثبت نشده</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RecentReflections() {
  const { state } = useApp();
  const list = useMemo(
    () => [...(state.reflections ?? [])].sort((a, b) => b.day - a.day).slice(0, 4),
    [state.reflections],
  );
  if (list.length === 0) {
    return (
      <div className="px-5 pb-5">
        <Empty
          icon={<MoonStar size={26} />}
          title="هنوز بازتابی ثبت نشده"
          sub="هر شب دو دقیقه بنویس؛ روند حالت اینجا نمایش داده می‌شود"
          action={<Link to="/today"><Btn>رفتن به امروز</Btn></Link>}
        />
      </div>
    );
  }
  return (
    <ul className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
      {list.map((r) => (
        <li key={r.day} className="rounded-2xl border border-slate-100 p-3 dark:border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xl">{moodFace(r.mood)}</span>
            <Link to="/insights" className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-700 hover:underline dark:text-slate-200">{formatJalali(r.day, { weekday: true })}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                {r.wins?.trim() ? `🏆 ${r.wins.split('\n')[0]}` : '🏆 دستاوردها ثبت نشده'}
              </p>
            </Link>
            <span className={cx(
              'tabular shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black',
              r.score == null ? 'bg-slate-100 text-slate-400 dark:bg-white/5'
                : r.score >= 8 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                  : r.score >= 5 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
            )}>
            {r.score != null ? formatScore(r.score) : 'ثبت نشده'}
            {r.score != null && <span className="text-[9px] opacity-70"> /۱۰</span>}
            </span>
          </div>
          {r.dayNote?.trim() && (
            <p className="mt-2 line-clamp-2 rounded-xl bg-slate-50 px-2.5 py-1.5 text-[11px] leading-5 text-slate-500 dark:bg-white/5 dark:text-slate-400">
              {r.dayNote}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
