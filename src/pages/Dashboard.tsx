import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity, ArrowLeft, CalendarDays, CheckCircle2, ChevronLeft, Flame, Gauge,
  ListTodo, Plus, Sparkles, Star, StickyNote, MoonStar, Target,
} from 'lucide-react';
import { useApp } from '../lib/store';
import {
  addDays, formatJalali, formatScore, greetingByHour, J_MONTHS, toFa, toJalaali,
  todayStart, weekdayName, smartDate, diffDays, parseClock,
} from '../lib/jalali';
import { habitStreak } from '../lib/stats';
import { buildDayStats } from '../lib/days';
import { moodFace } from '../lib/display';
import { Card, CardHead, Btn, Badge, Empty, Segmented, CheckIcon } from '../components/ui';
import { Bars, Donut, Legend, ScoreTrend } from '../components/charts';
import { cx } from '../lib/utils';
import type { QuickKind } from '../components/Shell';

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

export default function Dashboard({ onQuickAdd }: { onQuickAdd: (k: QuickKind) => void }) {
  const { state } = useApp();
  const now = new Date();
  const j = toJalaali(now);
  // امروز فقط یک‌بار محاسبه می‌شود تا مبناهای «امروز/گذشته» در طول رندر ثابت بمانند
  const today = useMemo(() => todayStart(), []);
  const [trendKind, setTrendKind] = useState<'tasks' | 'score'>('tasks');

  const openTasks = useMemo(() => state.tasks.filter((t) => t.status !== 'done' && !t.backlog), [state.tasks]);
  const overdue = openTasks.filter((t) => t.due != null && diffDays(t.due, today) < 0);
  const dueToday = openTasks.filter((t) => t.due != null && diffDays(t.due, today) === 0);

  const todayEvents = useMemo(
    () => state.events.filter((e) => e.day === today).sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')),
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

  // آمار ۱۴ روز اخیر (بهره‌وری + نمره)
  const last14 = useMemo(() => {
    const days: number[] = [];
    for (let i = 13; i >= 0; i--) days.push(addDays(today, -i));
    return buildDayStats(state, days);
  }, [state, today]);

  const scored14 = last14.filter((d) => d.score != null);
  const avgScore14 = scored14.length
    ? Math.round((scored14.reduce((a, d) => a + (d.score ?? 0), 0) / scored14.length) * 10) / 10
    : null;
  const sport7 = last14.slice(-7).filter((d) => d.sport).length;
  const todayScore = last14[last14.length - 1]?.score ?? null;

  const name = state.profile.name?.trim();
  const bestStreak = habitToday.length ? Math.max(...habitToday.map((x) => x.streak), 0) : 0;

  return (
    <div className="space-y-5">
      {/* هیرو */}
      <motion.section
        {...fadeUp}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-emerald-700 via-teal-700 to-cyan-700 p-6 text-white shadow-xl shadow-brand/20 sm:p-8"
      >
        <div className="bg-grid-fade absolute inset-0 opacity-40" />
        <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 right-1/3 h-56 w-56 rounded-full bg-yellow-300/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-bold text-white/85">
              <Sparkles size={14} />
              {weekdayName(today)}، {toFa(j.jd)} {J_MONTHS[j.jm - 1]} {toFa(j.jy)}
            </p>
            <h2 className="mt-2 text-2xl font-black leading-9 sm:text-[28px]">
              {greetingByHour(now.getHours())}{name ? `، ${name}` : ''} 👋
            </h2>
            <p className="mt-1.5 max-w-lg text-[13px] leading-6 text-white/85">
              {summarySentence(overdue.length, dueToday.length, todayEvents.length)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => onQuickAdd('task')} className="flex h-10 items-center gap-1.5 rounded-xl bg-surface px-4 text-[13px] font-black text-brand-ink shadow transition hover:brightness-95 active:scale-95">
                <Plus size={16} strokeWidth={3} /> وظیفه جدید
              </button>
              <button onClick={() => onQuickAdd('event')} className="flex h-10 items-center gap-1.5 rounded-xl bg-white/15 px-4 text-[13px] font-black text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25 active:scale-95">
                <Plus size={16} strokeWidth={3} /> رویداد
              </button>
              <button onClick={() => onQuickAdd('note')} className="flex h-10 items-center gap-1.5 rounded-xl bg-white/15 px-4 text-[13px] font-black text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25 active:scale-95">
                <Plus size={16} strokeWidth={3} /> یادداشت
              </button>
              <Link to="/insights" className="flex h-10 items-center gap-1.5 rounded-xl bg-white/15 px-4 text-[13px] font-black text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25 active:scale-95">
                <Gauge size={16} /> تحلیل روزها
              </Link>
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <MiniStat label="پیشرفت امروز" value={todayTasksAll.length ? `${toFa(todayPct)}٪` : 'بدون تسک'} />
            <MiniStat label="نمره امروز" value={todayScore != null ? `${formatScore(todayScore)} از ۱۰` : 'ثبت نشده'} />
            <MiniStat label="رویداد امروز" value={`${toFa(todayEvents.length)} رویداد`} />
          </div>
        </div>
      </motion.section>

      {/* کارت‌های خلاصه */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard delay={0.05} icon={<ListTodo size={20} />} tone="sky" label="بهره‌وری امروز" value={todayTasksAll.length ? `${toFa(todayPct)}٪` : 'بدون تسک'} sub={todayTasksAll.length ? `${toFa(todayDone)} از ${toFa(todayTasksAll.length)} انجام شد` : 'روز سبکی داری ✨'} alert={overdue.length > 0} />
        <StatCard delay={0.1} icon={<Flame size={20} />} tone="amber" label="بهترین استریک عادت" value={bestStreak > 0 ? `${toFa(bestStreak)} روز` : '—'} sub={`${toFa(habitToday.filter((x) => x.done).length)} از ${toFa(habitToday.length)} امروز انجام شد`} />
        <StatCard delay={0.15} icon={<Star size={20} />} tone="violet" label="میانگین نمره ۱۴ روز" value={avgScore14 != null ? `${formatScore(avgScore14)} از ۱۰` : 'ثبت نشده'} sub={scored14.length ? `${toFa(scored14.length)} روز ثبت‌شده` : 'از صفحه «روز جاری» نمره بده'} />
        <StatCard delay={0.2} icon={<Activity size={20} />} tone="green" label="ورزش ۷ روز اخیر" value={`${toFa(sport7)} روز`} sub={sport7 > 0 ? 'آفرین، ادامه بده! 💪' : 'هنوز ورزشی ثبت نشده'} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* روند ۱۴ روز */}
        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.1 }} className="xl:col-span-2">
          <Card>
            <CardHead
              title="روند ۱۴ روز اخیر"
              sub={trendKind === 'tasks' ? 'درصد انجام تسک‌های هر روز' : 'نمره ثبت‌شده هر روز (۰ تا ۱۰)'}
              action={
                <Segmented
                  value={trendKind}
                  onChange={setTrendKind}
                  options={[
                    { v: 'tasks', label: 'بهره‌وری', icon: <Target size={13} /> },
                    { v: 'score', label: 'نمره روز', icon: <Star size={13} /> },
                  ]}
                />
              }
            />
            <div className="px-5 pb-4">
              {trendKind === 'tasks' ? (
                <Bars
                  data={last14.map((d) => ({
                    label: toFa(toJalaali(new Date(d.day)).jd),
                    value: Math.max(d.tasksPct, 0),
                    color: d.tasksPct < 0 ? '#cbd5e1' : d.tasksPct >= 80 ? '#10b981' : d.tasksPct >= 50 ? '#f59e0b' : '#f43f5e',
                    dim: d.tasksPct < 0,
                    hint: `${formatJalali(d.day)} — ${d.tasksPct < 0 ? 'تسکی نبود' : `${toFa(d.tasksPct)}٪ انجام`}`,
                  }))}
                  formatTick={(v) => (v > 0 ? `${toFa(v)}٪` : '')}
                />
              ) : (
                <ScoreTrend
                  points={last14.map((d) => ({
                    label: toFa(toJalaali(new Date(d.day)).jd),
                    value: d.score,
                    hint: `${formatJalali(d.day)} — نمره: ${d.score != null ? formatScore(d.score) : 'ثبت نشده'}`,
                  }))}
                  height={190}
                />
              )}
            </div>
            <div className="border-t border-line px-5 py-4 ">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[13px] font-extrabold text-ink-2 ">یادداشت‌های سنجاق‌شده 📌</h4>
                <Link to="/notes" className="flex items-center gap-1 text-xs font-bold text-brand-ink hover:underline ">
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
              <CardHead
                title="حال ۷ روز اخیر"
                sub="از بازتاب‌های روزانه"
                action={<Link to="/insights" className="flex items-center gap-1 text-xs font-bold text-brand-ink hover:underline ">تحلیل <ChevronLeft size={14} /></Link>}
              />
              <div className="px-5 pb-5">
                <WeekMood />
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.1 }}>
          <Card>
            <CardHead title="برنامه امروز" sub={formatJalali(today, { weekday: true })} action={<Link to="/today" className="flex items-center gap-1 text-xs font-bold text-brand-ink hover:underline ">روز جاری <ChevronLeft size={14} /></Link>} />
            <div className="space-y-2 px-5 pb-5">
              {todayEvents.length === 0 && dueToday.length === 0 && (
                <p className="rounded-2xl bg-surface-2 py-5 text-center text-xs text-muted ">امروز برنامه‌ای نداری — از روزت لذت ببر ✨</p>
              )}
              {todayEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-2.5 rounded-2xl border border-line px-3 py-2.5 ">
                  <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: e.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink-2 ">{e.title}</p>
                    <p className="text-[11px] text-muted">{e.time ? `ساعت ${toFa(e.time)}` : 'بدون ساعت'}</p>
                  </div>
                </div>
              ))}
              {dueToday.map((t) => (
                <div key={t.id} className="flex items-center gap-2.5 rounded-2xl bg-warn/5 px-3 py-2.5 ring-1 ring-warn/20">
                  <CheckCircle2 size={17} className="shrink-0 text-warn-ink" />
                  <p className="flex-1 truncate text-[13px] font-bold text-ink-2 ">{t.title}</p>
                  <Badge tone="amber">سررسید امروز</Badge>
                </div>
              ))}
              {overdue.length > 0 && (
                <Link to="/tasks" className="flex items-center justify-between rounded-2xl bg-danger/5 px-3 py-2.5 text-xs font-bold text-danger-ink ring-1 ring-danger/20 ">
                  {toFa(overdue.length)} وظیفه عقب‌افتاده داری
                  <ArrowLeft size={14} />
                </Link>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.15 }}>
          <Card>
            <CardHead title="عادت‌های امروز" sub="با یک کلیک ثبت کن" action={<Link to="/habits" className="flex items-center gap-1 text-xs font-bold text-brand-ink hover:underline ">همه <ChevronLeft size={14} /></Link>} />
            <TodayHabits />
          </Card>
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.2 }}>
          <Card>
            <CardHead title="بازتاب‌های اخیر" sub="حال و نمره روزهای گذشته" action={<Link to="/today" className="flex items-center gap-1 text-xs font-bold text-brand-ink hover:underline ">امروز <ChevronLeft size={14} /></Link>} />
            <RecentReflections />
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.1 }}>
          <Card>
            <CardHead title="نزدیک‌ترین سررسیدها" sub="وظایف باز به ترتیب فوریت" action={<Link to="/tasks" className="flex items-center gap-1 text-xs font-bold text-brand-ink hover:underline ">مدیریت وظایف <ChevronLeft size={14} /></Link>} />
            <UpcomingTasks />
          </Card>
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.15 }}>
          <Card>
            <CardHead title="برنامه فردا" sub={formatJalali(addDays(today, 1), { weekday: true })} action={<Link to={`/today?day=${addDays(today, 1)}`} className="flex items-center gap-1 text-xs font-bold text-brand-ink hover:underline ">برنامه‌ریزی <ChevronLeft size={14} /></Link>} />
            <TomorrowList />
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[130px] rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/25 backdrop-blur">
      <p className="text-[11px] font-bold text-white/85">{label}</p>
      <p className="num mt-1 text-base font-black text-white">{value}</p>
    </div>
  );
}

type Tone = 'green' | 'rose' | 'sky' | 'amber' | 'violet';

function StatCard({ icon, tone, label, value, sub, alert, delay }: { icon: React.ReactNode; tone: Tone; label: string; value: string; sub: string; alert?: boolean; delay: number }) {
  const tones: Record<Tone, string> = {
    green: 'from-emerald-700 to-teal-700 shadow-brand/20',
    rose: 'from-rose-700 to-pink-700 shadow-danger/20',
    sky: 'from-sky-700 to-blue-700 shadow-info/20',
    amber: 'from-amber-700 to-orange-700 shadow-warn/20',
    violet: 'from-violet-700 to-purple-700 shadow-violet/20',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
      <Card hover className="p-4 sm:p-5">
        <div className={cx('mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg', tones[tone])}>{icon}</div>
        <p className="text-[11px] font-bold text-muted">{label}</p>
        <p className="num mt-1 text-lg font-black text-ink ">{value}</p>
        <p className={cx('mt-1 text-[11px] font-bold', alert ? 'text-danger-ink' : 'text-muted')}>{sub}</p>
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
      {active.slice(0, 6).map((h) => {
        const done = !!state.habitLogs[`${h.id}:${today}`];
        const streak = habitStreak(h.id, state.habitLogs);
        return (
          <li key={h.id}>
            <button
              onClick={() => toggleHabit(h.id, today)}
              className={cx(
                'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-right transition-all active:scale-[0.99]',
                done ? 'border-transparent bg-brand/10' : 'border-line hover:border-line-strong hover:bg-surface-2  ',
              )}
            >
              <span
                className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full transition', done ? 'text-white' : 'text-transparent')}
                style={{ background: done ? h.color : 'transparent', border: `2px solid ${h.color}` }}
              >
                <CheckIcon size={13} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx('block truncate text-[13px] font-bold', done ? 'text-muted line-through' : 'text-ink-2 ')}>{h.title}</span>
                {streak > 1 && <span className="flex items-center gap-1 text-[11px] font-bold text-warn-ink"><Flame size={11} />{toFa(streak)} روز پیاپی</span>}
              </span>
            </button>
          </li>
        );
      })}
      {active.length > 6 && (
        <Link to="/habits" className="block pt-1 text-center text-xs font-bold text-brand-ink hover:underline ">
          {toFa(active.length - 6)} عادت دیگر…
        </Link>
      )}
    </ul>
  );
}

function UpcomingTasks() {
  const { state, moveTask } = useApp();
  const today = useMemo(() => todayStart(), []);
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
        const d = t.due != null ? diffDays(t.due, today) : null;
        const tone = d == null ? 'slate' : d < 0 ? 'red' : d === 0 ? 'amber' : 'slate';
        const label = d == null ? 'بدون سررسید' : d === 0 ? 'امروز' : d === 1 ? 'فردا' : d < 0 ? `${toFa(Math.abs(d))} روز عقب` : smartDate(t.due!);
        const tones: Record<string, string> = {
          red: 'bg-danger/10 text-danger-ink ',
          amber: 'bg-warn/10 text-warn-ink ',
          slate: 'bg-sunken text-muted  ',
        };
        return (
          <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-line px-3 py-2.5 transition hover:bg-surface-2  dark:hover:bg-white/[0.03]">
            <button
              onClick={() => moveTask(t.id, 'done')}
              title="انجام شد"
              className="grid grid-cols-1 h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-line text-transparent transition hover:border-brand hover:bg-brand-strong hover:text-white "
            >
              <CheckIcon size={13} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-ink-2 ">{t.title}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                <span className={cx('rounded-full px-2 py-0.5 font-bold', tones[tone])}>{label}</span>
                {t.priority === 'high' && <span className="font-bold text-danger-ink">• مهم</span>}
                {t.time && <span className="num">• {toFa(t.time)}</span>}
              </p>
            </div>
            <Link to="/tasks" className="shrink-0 text-muted transition hover:text-brand-ink"><CalendarDays size={16} /></Link>
          </li>
        );
      })}
    </ul>
  );
}

function TomorrowList() {
  const { state } = useApp();
  const tomorrow = useMemo(() => addDays(todayStart(), 1), []);
  const tasks = useMemo(
    () => state.tasks.filter((t) => !t.backlog && t.due === tomorrow && t.status !== 'done')
      .sort((a, b) => (parseClock(a.time ?? '') ?? 9999) - (parseClock(b.time ?? '') ?? 9999)),
    [state.tasks, tomorrow],
  );
  const events = useMemo(
    () => state.events.filter((e) => e.day === tomorrow).sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')),
    [state.events, tomorrow],
  );
  if (tasks.length === 0 && events.length === 0) {
    return (
      <div className="px-5 pb-5">
        <p className="rounded-2xl bg-surface-2 py-5 text-center text-xs text-muted ">
          فردا خالی است — امشب ۵ دقیقه وقت بگذار و مهم‌ترین کارها را بچین 🌙
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-2 px-5 pb-5">
      {events.map((e) => (
        <li key={e.id} className="flex items-center gap-3 rounded-2xl border border-line px-3 py-2.5 ">
          <span className="h-6 w-1 shrink-0 rounded-full" style={{ background: e.color }} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink-2 ">{e.title}</span>
          <span className="num shrink-0 text-[11px] font-bold text-muted">{e.time ? toFa(e.time) : 'بدون ساعت'}</span>
        </li>
      ))}
      {tasks.map((t) => (
        <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5 dark:bg-white/[0.03]">
          <span className={cx('h-6 w-1 shrink-0 rounded-full', t.priority === 'high' ? 'bg-danger' : t.priority === 'medium' ? 'bg-warn' : 'bg-info')} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink-2 ">{t.title}</span>
          {t.time && <span className="num shrink-0 text-[11px] font-bold text-muted">{toFa(t.time)}</span>}
        </li>
      ))}
    </ul>
  );
}

function PinnedNotes({ onQuickAdd }: { onQuickAdd: (k: QuickKind) => void }) {
  const { state } = useApp();
  const pinned = state.notes.filter((n) => n.pinned).slice(0, 4);
  if (pinned.length === 0) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3.5 ">
        <p className="text-xs text-muted">یادداشت مهمی را سنجاق کن تا همیشه اینجا ببینی 📌</p>
        <button onClick={() => onQuickAdd('note')} className="flex shrink-0 items-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-strong">
          <Plus size={14} /> یادداشت
        </button>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {pinned.map((n) => (
        <li key={n.id}>
          <Link
            to="/notes"
            className="flex h-full items-start gap-2.5 rounded-2xl border border-line p-3 transition hover:border-warn hover:shadow-md "
            style={{ background: `linear-gradient(180deg, ${n.color}44 0%, transparent 70px)` }}
          >
            <StickyNote size={16} className="mt-0.5 shrink-0 text-warn-ink" />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold text-ink-2 ">{n.title}</span>
              {n.body && <span className="mt-0.5 block truncate text-[11px] text-muted">{n.body.split('\n')[0]}</span>}
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
    return <p className="py-6 text-center text-xs text-muted">هنوز وظیفه‌ای ثبت نشده است</p>;
  }
  const data = [
    { label: 'برای انجام', value: todo, color: '#94a3b8' },
    { label: 'در حال انجام', value: doing, color: '#0ea5e9' },
    { label: 'انجام‌شده', value: done, color: '#10b981' },
    ...(backlogN > 0 ? [{ label: 'بک‌لاگ باز', value: backlogN, color: '#f59e0b' }] : []),
  ];
  const rate = total ? Math.round((done / total) * 100) : 0;
  return (
    <>
      <Donut data={data} centerTop="نرخ انجام" centerBottom={`${toFa(rate)}٪`} />
      <div className="w-full">
        <Legend items={data} format={(v) => `${toFa(v)} تسک`} />
      </div>
    </>
  );
}

function WeekMood() {
  const { state } = useApp();
  const today = todayStart();
  const days: number[] = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(today, -i));
  const refs = new Map((state.reflections ?? []).map((r) => [r.day, r]));
  return (
    <div className="flex gap-1.5" dir="ltr">
      {days.map((d) => {
        const r = refs.get(d);
        const isToday = d === today;
        return (
          <div
            key={d}
            title={`${formatJalali(d)}${r ? ` — حال: ${moodFace(r.mood)}${r.score != null ? ` • نمره: ${formatScore(r.score)}` : ' • نمره ثبت نشده'}` : ' — ثبت نشده'}`}
            className={cx(
              'flex flex-1 flex-col items-center gap-1 rounded-xl border py-2 transition',
              r ? 'border-transparent bg-violet/10' : 'border-line ',
              isToday && 'ring-2 ring-brand/60',
            )}
          >
            <span className="text-lg leading-none">{moodFace(r?.mood)}</span>
            <span className="num text-[11px] font-black text-muted">{toFa(toJalaali(new Date(d)).jd)}</span>
            {r?.score != null && (
              <span className="num rounded-full bg-warn/15 px-1.5 text-[9px] font-black text-warn-ink ">
                {formatScore(r.score)}
              </span>
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
    <ul className="space-y-2 px-5 pb-5">
      {list.map((r) => (
        <li key={r.day} className="rounded-2xl border border-line p-3 ">
          <div className="flex items-center gap-2">
            <span className="text-xl">{moodFace(r.mood)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-ink-2 ">{formatJalali(r.day, { weekday: true })}</p>
              {r.dayNote && <p className="mt-0.5 truncate text-[11px] text-muted">📝 {r.dayNote.split('\n')[0]}</p>}
              {!r.dayNote && r.wins && <p className="mt-0.5 truncate text-[11px] text-muted">🏆 {r.wins.split('\n')[0]}</p>}
            </div>
            <span className={cx('num shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black', r.score != null ? 'bg-warn/10 text-warn-ink ' : 'bg-sunken text-muted ')}>
              {r.score != null ? <><Star size={11} className="inline" /> {formatScore(r.score)}</> : 'ثبت نشده'}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
