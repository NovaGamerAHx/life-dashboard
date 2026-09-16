import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, ListTodo, CalendarDays, Flame,
  Plus, ArrowLeft, CheckCircle2, Clock, Sparkles, ChevronLeft,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { useMoney } from '../lib/money';
import {
  toJalaali, J_MONTHS, toFa, greetingByHour, formatJalali,
  todayStart, addDays, weekdayName, smartDate, diffDays,
} from '../lib/jalali';
import { jalaliMonthRange, sumTx, dailySeries, groupByCategory, habitStreak } from '../lib/stats';
import { CAT_COLORS } from '../lib/types';
import { Card, CardHead, Btn, Badge, Empty } from '../components/ui';
import { Donut, Legend } from '../components/charts';
import { cx } from '../lib/utils';

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

export default function Dashboard({ onQuickAdd }: { onQuickAdd: (k: 'tx' | 'task' | 'event' | 'note' | 'habit') => void }) {
  const { state } = useApp();
  const { withUnit, fmt } = useMoney();
  const finOn = state.settings.financeEnabled;
  const now = new Date();
  const j = toJalaali(now);
  const today = todayStart();

  const month = useMemo(() => jalaliMonthRange(Date.now()), []);
  const monthTx = useMemo(
    () => state.transactions.filter((t) => t.date >= month.start && t.date <= month.end),
    [state.transactions, month],
  );
  const inc = sumTx(monthTx, 'income');
  const exp = sumTx(monthTx, 'expense');
  const bal = inc - exp;

  const series = useMemo(() => dailySeries(14, state.transactions, 'expense'), [state.transactions]);
  const incomeSeries = useMemo(() => dailySeries(14, state.transactions, 'income'), [state.transactions]);
  const catGroups = useMemo(() => groupByCategory(monthTx.filter((t) => t.type === 'expense')), [monthTx]);

  const openTasks = useMemo(() => state.tasks.filter((t) => t.status !== 'done' && !t.backlog), [state.tasks]);
  const overdue = openTasks.filter((t) => t.due != null && diffDays(t.due, Date.now()) < 0);
  const dueToday = openTasks.filter((t) => t.due != null && diffDays(t.due, Date.now()) === 0);
  const doneThisWeek = useMemo(() => {
    const w = addDays(today, -7);
    return state.tasks.filter((t) => t.status === 'done' && t.completedAt && t.completedAt >= w).length;
  }, [state.tasks, today]);

  const todayEvents = useMemo(
    () => state.events.filter((e) => e.day === today).sort((a, b) => (a.time || '99').localeCompare(b.time || '99')),
    [state.events, today],
  );

  const recentTx = useMemo(() => state.transactions.slice(0, 6), [state.transactions]);

  const donut = useMemo(
    () =>
      catGroups.slice(0, 6).map((g) => ({
        label: g.category,
        value: g.value,
        color: CAT_COLORS[g.category] ?? '#64748b',
      })),
    [catGroups],
  );

  const habitToday = useMemo(() => {
    return state.habits.map((h) => ({
      h,
      done: !!state.habitLogs[`${h.id}:${today}`],
      streak: habitStreak(h.id, state.habitLogs),
    }));
  }, [state.habits, state.habitLogs, today]);

  const name = state.profile.name?.trim();
  const labels = series.map((s) => toFa(toJalaali(new Date(s.day)).jd));

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
              {finOn && (
                <button onClick={() => onQuickAdd('tx')} className="flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-[13px] font-black text-emerald-700 shadow transition hover:brightness-95 active:scale-95">
                  <Plus size={16} strokeWidth={3} /> ثبت هزینه
                </button>
              )}
              <button onClick={() => onQuickAdd('task')} className="flex h-10 items-center gap-1.5 rounded-xl bg-white/15 px-4 text-[13px] font-black text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25 active:scale-95">
                <Plus size={16} strokeWidth={3} /> وظیفه جدید
              </button>
              <button onClick={() => onQuickAdd('event')} className="flex h-10 items-center gap-1.5 rounded-xl bg-white/15 px-4 text-[13px] font-black text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25 active:scale-95">
                <Plus size={16} strokeWidth={3} /> رویداد
              </button>
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-3 md:flex">
            {finOn && <MiniStat label="مانده این ماه" value={withUnit(bal)} neg={bal < 0} />}
            <MiniStat label="وظایف باز" value={`${toFa(openTasks.length)} وظیفه`} />
            <MiniStat label="رویداد امروز" value={`${toFa(todayEvents.length)} رویداد`} />
          </div>
        </div>
      </motion.section>

      {/* کارت‌های خلاصه */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {finOn && (
          <>
            <StatCard delay={0.05} icon={<TrendingUp size={20} />} tone="green" label={`درآمد ${J_MONTHS[j.jm - 1]}`} value={withUnit(inc)} sub={`${toFa(monthTx.filter((t) => t.type === 'income').length)} تراکنش`} />
            <StatCard delay={0.1} icon={<TrendingDown size={20} />} tone="rose" label={`هزینه ${J_MONTHS[j.jm - 1]}`} value={withUnit(exp)} sub={`${toFa(monthTx.filter((t) => t.type === 'expense').length)} تراکنش`} />
          </>
        )}
        <StatCard delay={0.15} icon={<ListTodo size={20} />} tone="sky" label="وظایف باز" value={`${toFa(openTasks.length)} وظیفه`} sub={overdue.length > 0 ? `${toFa(overdue.length)} سررسید گذشته` : `${toFa(doneThisWeek)} انجام‌شده در ۷ روز اخیر`} alert={overdue.length > 0} />
        <StatCard delay={0.2} icon={<Flame size={20} />} tone="amber" label="بهترین استریک عادت" value={habitToday.length ? `${toFa(Math.max(...habitToday.map((x) => x.streak), 0))} روز` : '—'} sub={`${toFa(habitToday.filter((x) => x.done).length)} از ${toFa(habitToday.length)} امروز انجام شد`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* روند مالی */}
        {finOn && (
          <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.1 }} className="xl:col-span-2">
            <Card>
              <CardHead
                title="روند ۱۴ روز اخیر"
                sub="مقایسه هزینه و درآمد روزانه"
              action={
                <Link to="/reports" className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">
                  گزارش کامل <ChevronLeft size={14} />
                </Link>
              }
            />
            <div className="px-4 pb-2">
              <div className="mb-2 flex items-center gap-4 px-1 text-[11px] font-bold text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> هزینه</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> درآمد</span>
              </div>
              <DualArea expense={series.map((s) => s.value)} income={incomeSeries.map((s) => s.value)} labels={labels} />
            </div>
            {/* تراکنش‌های اخیر */}
            <div className="border-t border-slate-100 px-5 py-4 dark:border-white/5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[13px] font-extrabold text-slate-700 dark:text-slate-200">تراکنش‌های اخیر</h4>
                <Link to="/finance" className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">
                  همه <ArrowLeft size={13} />
                </Link>
              </div>
              {recentTx.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">هنوز تراکنشی ثبت نشده است</p>
              ) : (
                <ul className="divide-y divide-slate-50 dark:divide-white/5">
                  {recentTx.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 py-2.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-base" style={{ background: `${CAT_COLORS[t.category] ?? '#64748b'}1a` }}>
                        {t.type === 'income' ? '💰' : catEmoji(t.category)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold text-slate-700 dark:text-slate-200">{t.title}</span>
                        <span className="block text-[11px] text-slate-400">{t.category} • {smartDate(t.date)}</span>
                      </span>
                      <span className={cx('tabular text-[13px] font-black', t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200')}>
                        {t.type === 'income' ? '+' : '−'}{fmt(t.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </motion.div>
        )}

        <div className="space-y-5">
          {/* دونات */}
          {finOn && (
            <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.15 }}>
              <Card>
                <CardHead title={`هزینه‌های ${J_MONTHS[j.jm - 1]}`} sub="تفکیک بر اساس دسته" />
                <div className="flex flex-col items-center gap-4 px-5 pb-5">
                  <Donut data={donut} centerTop="جمع هزینه" centerBottom={withUnit(exp)} />
                  {donut.length > 0 ? <Legend items={donut} money={(v) => fmt(v)} /> : <p className="text-xs text-slate-400">این ماه هزینه‌ای ثبت نشده</p>}
                </div>
              </Card>
            </motion.div>
          )}

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
                      <p className="flex items-center gap-1 text-[11px] text-slate-400"><Clock size={11} />{e.time ? `ساعت ${e.time}` : 'بدون ساعت'}</p>
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
        {/* عادت‌های امروز */}
        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.1 }}>
          <Card>
            <CardHead title="عادت‌های امروز" sub="با یک کلیک ثبت کن" action={<Link to="/habits" className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">همه <ChevronLeft size={14} /></Link>} />
            <TodayHabits />
          </Card>
        </motion.div>
        {/* وظایف نزدیک */}
        <motion.div {...fadeUp} transition={{ duration: 0.45, delay: 0.15 }} className="xl:col-span-2">
          <Card>
            <CardHead title="نزدیک‌ترین سررسیدها" sub="وظایف باز به ترتیب فوریت" action={<Link to="/tasks" className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">مدیریت وظایف <ChevronLeft size={14} /></Link>} />
            <UpcomingTasks />
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, neg }: { label: string; value: string; neg?: boolean }) {
  return (
    <div className="min-w-[130px] rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/25 backdrop-blur">
      <p className="text-[11px] font-bold text-emerald-100">{label}</p>
      <p className={cx('tabular mt-1 text-base font-black', neg ? 'text-yellow-200' : 'text-white')}>{value}</p>
    </div>
  );
}

function StatCard({ icon, tone, label, value, sub, alert, delay }: { icon: React.ReactNode; tone: 'green' | 'rose' | 'sky' | 'amber'; label: string; value: string; sub: string; alert?: boolean; delay: number }) {
  const tones: Record<string, string> = {
    green: 'from-emerald-500 to-teal-600 shadow-emerald-600/20',
    rose: 'from-rose-500 to-pink-600 shadow-rose-600/20',
    sky: 'from-sky-500 to-blue-600 shadow-sky-600/20',
    amber: 'from-amber-500 to-orange-600 shadow-amber-600/20',
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

export function catEmoji(cat: string): string {
  const m: Record<string, string> = {
    'خوراک': '🍔', 'حمل‌ونقل': '🚕', 'قبوض': '🧾', 'سلامت': '💊',
    'پوشاک': '👕', 'تفریح': '🎬', 'آموزش': '📚', 'خانه': '🏠', 'سایر': '📦',
  };
  return m[cat] ?? '💸';
}

function DualArea({ expense, income, labels }: { expense: number[]; income: number[]; labels: string[] }) {
  const W = 600, H = 190, PAD = 10;
  const max = Math.max(...expense, ...income, 1);
  const x = (i: number) => (expense.length <= 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (expense.length - 1));
  const y = (v: number) => PAD + (1 - v / max) * (H - PAD * 2 - 24);
  const line = (arr: number[]) =>
    arr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = (arr: number[]) => `${line(arr)} L ${x(arr.length - 1)} ${H - 24} L ${x(0)} ${H - 24} Z`;
  const step = Math.max(1, Math.floor(labels.length / 7));
  return (
    <div dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 165 }}>
        <defs>
          <linearGradient id="daExp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="daInc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {[0.25, 0.55, 0.85].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} className="stroke-slate-200 dark:stroke-white/10" strokeDasharray="3 5" />
        ))}
        <path d={area(expense)} fill="url(#daExp)" />
        <path d={area(income)} fill="url(#daInc)" />
        <path d={line(expense)} fill="none" stroke="#f43f5e" strokeWidth={2.5} strokeLinecap="round" />
        <path d={line(income)} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" />
        {labels.map((l, i) =>
          (i % step === 0 || i === labels.length - 1) ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={13} className="fill-slate-400" fontFamily="Vazirmatn">{l}</text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

function TodayHabits() {
  const { state, toggleHabit } = useApp();
  const today = todayStart();
  if (state.habits.length === 0) {
    return (
      <div className="px-5 pb-5">
        <Empty icon={<Flame size={26} />} title="هنوز عادتی نساخته‌ای" sub="از بخش عادت‌ها اولین عادت روزانه‌ات را بساز" action={<Link to="/habits"><Btn>ساخت عادت</Btn></Link>} />
      </div>
    );
  }
  return (
    <ul className="space-y-2 px-5 pb-5">
      {state.habits.slice(0, 5).map((h) => {
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
      {state.habits.length > 5 && (
        <Link to="/habits" className="block pt-1 text-center text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">
          {toFa(state.habits.length - 5)} عادت دیگر…
        </Link>
      )}
    </ul>
  );
}

export function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function UpcomingTasks() {
  const { state, moveTask } = useApp();
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
        const d = t.due != null ? diffDays(t.due, Date.now()) : null;
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
