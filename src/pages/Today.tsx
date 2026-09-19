import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Plus, Check, Pencil, Trash2, Clock,
  Flame, MoonStar, Copy, CheckCheck, Sparkles, CalendarPlus, RotateCcw,
  PartyPopper, ArrowLeft, Target, Hourglass, Star, CalendarDays, Minus, LineChart,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../lib/store';
import {
  toJalaali, J_MONTHS, toFa, formatJalali, formatGregorian, todayStart,
  addDays, startOfDay, formatClock, parseClock, clockToFa, formatScore,
} from '../lib/jalali';
import { habitStreak } from '../lib/stats';
import { buildDaySummary, DEFAULT_SUMMARY_OPTIONS } from '../lib/summary';
import { MOODS, PRIORITY_META, SCORE_MAX, SCORE_MIN, SCORE_STEP, type DayReflection, type Task } from '../lib/types';
import { Card, CardHead, Btn, Badge, Empty, Progress, Confirm, inputCls, Segmented, TimeField } from '../components/ui';
import { TaskModal } from '../components/forms';
import { CheckIcon } from './Dashboard';
import { cx, copyToClipboard } from '../lib/utils';

export default function Today() {
  const { state, moveTask, updateTask, deleteTask, toggleHabit, addTask } = useApp();
  const [params] = useSearchParams();
  const realToday = todayStart();
  const initialDay = (() => {
    const raw = params.get('day');
    const n = raw != null ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? startOfDay(n) : realToday;
  })();
  const [day, setDay] = useState<number>(initialDay);

  // سینک با ?day= وقتی از تقویم می‌آییم (کامپوننت دوباره ساخته نمی‌شود)
  useEffect(() => {
    const raw = params.get('day');
    const n = raw != null ? Number(raw) : NaN;
    if (Number.isFinite(n) && n > 0) setDay(startOfDay(n));
  }, [params]);

  const [showTaskM, setShowTaskM] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [presetForTomorrow, setPresetForTomorrow] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPri, setQuickPri] = useState<Task['priority']>('medium');
  const quickRef = useRef<HTMLInputElement>(null);

  const isToday = day === realToday;
  const tomorrow = addDays(day, 1);

  // ── کلیدهای میانبر: جهت‌نما برای جابه‌جایی روز، N برای تسک جدید ──
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) return;
      if (showTaskM) return;
      if (e.key === 'ArrowLeft') setDay((d) => addDays(d, 1)); // در RTL، چپ = جلو
      else if (e.key === 'ArrowRight') setDay((d) => addDays(d, -1));
      else if (e.key === 'n' || e.key === 'N' || e.key === 'ی') {
        e.preventDefault();
        setEditTask(null); setPresetForTomorrow(false); setShowTaskM(true);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [showTaskM]);

  const dayTasks = useMemo(
    () => state.tasks.filter((t) => !t.backlog && t.due === day).sort((a, b) => {
      const ta = a.time ? parseClock(a.time) ?? 9999 : 9999;
      const tb = b.time ? parseClock(b.time) ?? 9999 : 9999;
      const pw = { high: 0, medium: 1, low: 2 };
      return ta - tb || pw[a.priority] - pw[b.priority];
    }),
    [state.tasks, day],
  );
  const tomorrowTasks = useMemo(
    () => state.tasks.filter((t) => !t.backlog && t.due === tomorrow && t.status !== 'done'),
    [state.tasks, tomorrow],
  );
  const dayEvents = useMemo(
    () => (state.events.filter((e) => e.day === day) ?? []).sort((a, b) => (a.time || '99').localeCompare(b.time || '99')),
    [state.events, day],
  );

  const doneCount = dayTasks.filter((t) => t.status === 'done').length;
  const pct = dayTasks.length ? Math.round((doneCount / dayTasks.length) * 100) : 0;
  const remaining = dayTasks.length - doneCount;
  const activeHabits = useMemo(() => state.habits.filter((h) => !h.archived), [state.habits]);

  const reflection: DayReflection | undefined = (state.reflections ?? []).find((r) => r.day === day);
  const dayInfo: DayReflection = reflection ?? {
    day, mood: 3, score: null, wins: '', lessons: '', gratitude: '', updatedAt: 0,
  };

  // ویرایش درجا
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTxt, setEditingTxt] = useState('');

  const quickAdd = () => {
    const title = quickTitle.trim();
    if (!title) return;
    addTask({ title, status: 'todo', priority: quickPri, tags: [], due: day, backlog: false, subtasks: [] });
    setQuickTitle('');
    quickRef.current?.focus();
  };

  const commitInline = (t: Task) => {
    const v = editingTxt.trim();
    if (v && v !== t.title) updateTask(t.id, { title: v });
    setEditingId(null);
  };

  // تایم‌لاین: ترکیب تسک‌های زمان‌دار + رویدادهای ساعت‌دار
  const timeline = useMemo(() => {
    const items: Array<{ mins: number; end: number; title: string; kind: 'task' | 'event'; color: string; id: string; task?: Task }> = [];
    for (const t of dayTasks) {
      if (!t.time) continue;
      const m = parseClock(t.time);
      if (m == null) continue;
      items.push({
        mins: m, end: m + (t.durationMin ?? 60), title: t.title, kind: 'task',
        color: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#0ea5e9',
        id: t.id, task: t,
      });
    }
    for (const e of dayEvents) {
      if (!e.time) continue;
      const m = parseClock(e.time);
      if (m == null) continue;
      items.push({ mins: m, end: m + 60, title: e.title, kind: 'event', color: e.color, id: e.id });
    }
    return items.sort((a, b) => a.mins - b.mins);
  }, [dayTasks, dayEvents]);

  // خلاصه روز — از سازنده مشترک استفاده می‌کند تا خروجی همه‌جا یکسان و شفاف باشد
  const summaryText = useMemo(
    () => buildDaySummary(day, {
      reflections: state.reflections,
      tasks: state.tasks,
      habits: state.habits,
      habitLogs: state.habitLogs,
    }, { ...DEFAULT_SUMMARY_OPTIONS, includeScore: true }),
    [day, state.reflections, state.tasks, state.habits, state.habitLogs],
  );

  const copySummary = async () => {
    const ok = await copyToClipboard(summaryText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const rollover = () => {
    for (const t of dayTasks.filter((x) => x.status !== 'done')) updateTask(t.id, { due: tomorrow, backlog: false });
  };

  const j = toJalaali(new Date(day));

  return (
    <div className="space-y-5">
      {/* ناوبری روزانه */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 bg-gradient-to-l from-emerald-600 to-teal-600 px-4 py-3.5 text-white">
          <button onClick={() => setDay((d) => addDays(d, -1))} aria-label="روز قبل" className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 transition hover:bg-white/25" title="روز قبل (→)">
            <ChevronRight size={18} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h2 className="text-base font-black sm:text-lg">
              {isToday ? 'امروز' : formatJalali(day, { weekday: true })}
              <span className="mr-2 text-[11px] font-bold text-emerald-100">{toFa(j.jd)} {J_MONTHS[j.jm - 1]} {toFa(j.jy)}</span>
            </h2>
            <p dir="ltr" className="tabular mt-0.5 text-[11px] text-emerald-100/90">{formatGregorian(day)}</p>
          </div>
          <button onClick={() => setDay((d) => addDays(d, 1))} aria-label="روز بعد" className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 transition hover:bg-white/25" title="روز بعد (←)">
            <ChevronLeft size={18} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          {!isToday && <Btn size="sm" variant="soft" onClick={() => setDay(realToday)}>بازگشت به امروز</Btn>}
          <span className="text-[11px] text-slate-400">کلیدهای جهت‌نمای ◀ ▶ برای جابه‌جایی روز • کلید N برای تسک جدید</span>
          <span className="flex-1" />
          <Btn size="sm" variant="outline" onClick={copySummary}>
            {copied ? <CheckCheck size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? 'کپی شد!' : 'کپی خلاصه روز'}
          </Btn>
          <Link to="/insights" className="flex h-8 items-center gap-1 rounded-xl bg-emerald-600/10 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-600/15 dark:text-emerald-300">
            <LineChart size={14} /> تحلیل و خلاصه‌ها
          </Link>
        </div>
      </Card>

      {/* ۱. اطلاعات پایه روز */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DayInfo icon={<Target size={17} />} label="پیشرفت تسک‌ها" value={`${toFa(pct)}٪`} sub={`${toFa(doneCount)} از ${toFa(dayTasks.length)} انجام شد`} c="from-emerald-500 to-teal-600" />
        <DayInfo icon={<Hourglass size={17} />} label="باقی‌مانده" value={`${toFa(remaining)} تسک`} sub={remaining === 0 && dayTasks.length > 0 ? 'روزت کامل شد! 🎉' : 'ادامه بده 💪'} c="from-sky-500 to-blue-600" />
        <DayInfo
          icon={<Star size={17} />}
          label="نمره روز"
          value={dayInfo.score != null ? `${formatScore(dayInfo.score)} از ۱۰` : 'ثبت نشده'}
          sub={dayInfo.score != null ? 'با یک رقم اعشار ثبت می‌شود' : 'در بخش بازتاب، نمره بده'}
          c="from-amber-500 to-orange-600"
        />
        <DayInfo
          icon={<CalendarDays size={17} />}
          label="رویدادها"
          value={`${toFa(dayEvents.length)} رویداد`}
          sub={dayEvents.length ? dayEvents[0].title : 'برنامه‌ای ثبت نشده'}
          c="from-violet-500 to-purple-600"
        />
      </div>

      {/* اطلاعات پایه روز (فرم فشرده اینلاین) */}
      <DayBasicsCard key={day} day={day} />
      {dayTasks.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>پیشرفت این روز</span>
            <span className="tabular">{toFa(pct)}٪</span>
          </div>
          <div className="mt-2"><Progress value={pct} h={10} color={pct === 100 ? '#10b981' : '#0ea5e9'} /></div>
          {pct === 100 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
              <PartyPopper size={15} /> همه تسک‌های این روز تمام شد — فوق‌العاده‌ای!
            </p>
          )}
        </Card>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-5">
        <div className="min-w-0 space-y-5 xl:col-span-3">
          {/* ۲. تسک‌های روز */}
          <Card>
            <CardHead
              title={isToday ? 'تسک‌های امروز' : `تسک‌های ${formatJalali(day)}`}
              sub="Enter برای ثبت سریع • دابل‌کلیک روی عنوان برای ویرایش درجا"
              action={<Btn size="sm" onClick={() => { setEditTask(null); setPresetForTomorrow(false); setShowTaskM(true); }}><Plus size={14} /> تسک</Btn>}
            />
            <div className="px-5 pb-3">
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-0 flex-1 basis-[170px]">
                  <input
                    ref={quickRef}
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); quickAdd(); } }}
                    placeholder="تسک جدید بنویس و Enter بزن…"
                    className={inputCls}
                  />
                </div>
                <select value={quickPri} onChange={(e) => setQuickPri(e.target.value as Task['priority'])} className={cx(inputCls, 'w-auto max-w-[104px] shrink-0')} title="اولویت">
                  <option value="high">مهم</option>
                  <option value="medium">متوسط</option>
                  <option value="low">عادی</option>
                </select>
                <Btn onClick={quickAdd} title="افزودن"><Plus size={15} /></Btn>
              </div>
            </div>
            <div className="px-5 pb-5">
              {dayTasks.length === 0 ? (
                <Empty icon={<Check size={26} />} title="تسکی برای این روز نیست" sub="با Enter سریع اضافه کن یا از بک‌لاگ زمان‌بندی کن" />
              ) : (
                <ul className="space-y-2">
                  {dayTasks.map((t) => (
                    <li
                      key={t.id}
                      className={cx(
                        'group flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 transition',
                        t.status === 'done'
                          ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 dark:border-white/5 dark:hover:bg-white/[0.03]',
                      )}
                    >
                      <button
                        onClick={() => moveTask(t.id, t.status === 'done' ? 'todo' : 'done')}
                        title={t.status === 'done' ? 'برگرداندن' : 'انجام شد'}
                        className={cx(
                          'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition active:scale-90',
                          t.status === 'done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-500 dark:border-white/20',
                        )}
                      >
                        {t.status === 'done' && <CheckIcon />}
                      </button>
                      <span className={cx('h-8 w-1 shrink-0 rounded-full', t.priority === 'high' ? 'bg-rose-500' : t.priority === 'medium' ? 'bg-amber-400' : 'bg-sky-400')} title={`اولویت: ${PRIORITY_META[t.priority].label}`} />
                      <div className="min-w-0 flex-1">
                        {editingId === t.id ? (
                          <input
                            autoFocus
                            value={editingTxt}
                            onChange={(e) => setEditingTxt(e.target.value)}
                            onBlur={() => commitInline(t)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); commitInline(t); }
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className={cx(inputCls, 'h-8 text-[13px]')}
                          />
                        ) : (
                          <p
                            onDoubleClick={() => { setEditingId(t.id); setEditingTxt(t.title); }}
                            title="دابل‌کلیک برای ویرایش درجا"
                            className={cx('cursor-text truncate text-[13px] font-bold', t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200')}
                          >
                            {t.title}
                          </p>
                        )}
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                          {t.time && (
                            <span className="tabular inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-bold dark:bg-white/10">
                              <Clock size={10} />{clockToFa(t.time)}
                            </span>
                          )}
                          <Badge tone={t.priority === 'high' ? 'red' : t.priority === 'medium' ? 'amber' : 'blue'}>{PRIORITY_META[t.priority].label}</Badge>
                          {t.tags.slice(0, 2).map((tg) => (
                            <span key={tg} className="rounded-md bg-slate-900/5 px-1.5 py-0.5 font-bold dark:bg-white/10">#{tg}</span>
                          ))}
                        </p>
                      </div>
                      <span className="flex shrink-0 gap-0.5 transition sm:opacity-0 sm:group-hover:opacity-100">
                        <button onClick={() => { setEditTask(t); setPresetForTomorrow(false); setShowTaskM(true); }} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-sky-500/10 hover:text-sky-600" title="ویرایش کامل"><Pencil size={13} /></button>
                        <button onClick={() => setConfirmId(t.id)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-500" title="حذف"><Trash2 size={13} /></button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {remaining > 0 && dayTasks.some((t) => t.status !== 'done') && !isToday && day < realToday && (
                <Btn variant="soft" className="mt-3 w-full" onClick={rollover}>
                  <RotateCcw size={14} /> انتقال {toFa(remaining)} تسک باز به فردا
                </Btn>
              )}
            </div>
          </Card>

          {/* ۵. برنامه‌ریزی فردا */}
          <Card>
            <CardHead
              title={`برنامه‌ریزی فردا (${formatJalali(tomorrow)})`}
              sub={`${toFa(tomorrowTasks.length)} تسک برای فردا ثبت شده`}
              action={<Btn size="sm" variant="soft" onClick={() => { setEditTask(null); setPresetForTomorrow(true); setShowTaskM(true); }}><CalendarPlus size={14} /> تسک فردا</Btn>}
            />
            <div className="px-5 pb-5">
              {tomorrowTasks.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 py-4 text-center text-xs text-slate-400 dark:bg-white/5">
                  هنوز برای فردا چیزی برنامه‌ریزی نکرده‌ای — امشب ۵ دقیقه وقت بگذار 🌙
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {tomorrowTasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2 text-[13px] font-bold text-slate-600 dark:border-white/5 dark:text-slate-300">
                      <span className={cx('h-6 w-1 rounded-full', t.priority === 'high' ? 'bg-rose-500' : t.priority === 'medium' ? 'bg-amber-400' : 'bg-sky-400')} />
                      <span className="min-w-0 flex-1 truncate">{t.title}</span>
                      {t.time && <span className="tabular text-[11px] text-slate-400">{clockToFa(t.time)}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* ۶. بازتاب پایان روز */}
          <ReflectionCard key={day} day={day} reflection={reflection} />
        </div>

        <div className="min-w-0 space-y-5 xl:col-span-2">
          {/* ۳. تایم‌لاین روز */}
          <Card>
            <CardHead title="تایم‌لاین روز" sub="تسک‌ها و رویدادهای ساعت‌دار به ترتیب زمان (۲۴ساعته)" />
            <div className="px-5 pb-5">
              {timeline.length === 0 ? (
                <Empty icon={<Clock size={26} />} title="تایم‌لاین خالی است" sub="برای تسک‌ها و رویدادها ساعت تعیین کن تا اینجا نمایش داده شوند" />
              ) : (
                <div className="relative space-y-0 pr-1">
                  <span className="absolute bottom-2 right-[7px] top-2 w-0.5 rounded bg-slate-100 dark:bg-white/10" />
                  {timeline.map((it, i) => (
                    <motion.div
                      key={it.kind + it.id}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.4) }}
                      className="relative flex gap-3 py-2 pr-5"
                    >
                      <span className="absolute right-[3px] top-4 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-slate-900" style={{ background: it.color }} />
                      <span className="tabular w-11 shrink-0 pt-0.5 text-[11px] font-black text-slate-500">{formatClock(it.mins)}</span>
                      <div className="min-w-0 flex-1 rounded-xl border border-slate-100 px-2.5 py-2 dark:border-white/5">
                        <p className={cx('truncate text-xs font-black', it.task?.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200')}>{it.title}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {it.kind === 'task' ? `تسک • ${toFa(it.end - it.mins)} دقیقه` : 'رویداد'} • تا {formatClock(it.end)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              {dayEvents.filter((e) => !e.time).map((e) => (
                <div key={e.id} className="mt-1.5 flex items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-500 dark:bg-white/5 dark:text-slate-300">
                  <span className="h-5 w-1 rounded-full" style={{ background: e.color }} />
                  <span className="min-w-0 flex-1 truncate">{e.title}</span>
                  <span className="text-[10px] text-slate-400">بدون ساعت</span>
                </div>
              ))}
            </div>
          </Card>

          {/* ۴. ردیاب عادت‌ها */}
          <Card>
            <CardHead title="ردیاب عادت‌ها" sub={isToday ? 'امروز را ثبت کن' : formatJalali(day)} action={<Link to="/habits" className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400">همه <ArrowLeft size={13} /></Link>} />
            <div className="space-y-2 px-5 pb-5">
              {activeHabits.length === 0 && <p className="rounded-2xl bg-slate-50 py-4 text-center text-xs text-slate-400 dark:bg-white/5">عادت فعالی نداری — از بخش عادت‌ها بساز</p>}
              {activeHabits.map((h) => {
                const done = !!state.habitLogs[`${h.id}:${day}`];
                const streak = habitStreak(h.id, state.habitLogs);
                return (
                  <button
                    key={h.id}
                    onClick={() => toggleHabit(h.id, day)}
                    className={cx(
                      'flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-right transition active:scale-[0.99]',
                      done ? 'border-transparent bg-emerald-500/10' : 'border-slate-100 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5',
                    )}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: done ? h.color : 'transparent', border: `2px solid ${h.color}` }}>
                      {done && <CheckIcon />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cx('block truncate text-[13px] font-bold', done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200')}>{h.title}</span>
                      {streak > 1 && <span className="flex items-center gap-1 text-[11px] font-bold text-orange-500"><Flame size={11} />{toFa(streak)} روز پیاپی</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* پیش‌نمایش خلاصه روز */}
          <Card>
            <CardHead
              title="خلاصه آماده این روز"
              sub="همان متنی که با دکمه «کپی خلاصه روز» کپی می‌شود"
              action={
                <Btn size="xs" variant="outline" onClick={copySummary}>
                  {copied ? <CheckCheck size={12} /> : <Copy size={12} />} کپی
                </Btn>
              }
            />
            <div className="px-5 pb-5">
              <pre dir="rtl" className="max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-50/70 p-3.5 text-[11px] leading-6 text-slate-600 dark:bg-white/[0.03] dark:text-slate-300">
                {summaryText}
              </pre>
            </div>
          </Card>

          {/* نکته انگیزشی */}
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2.5 bg-gradient-to-l from-violet-600 to-purple-700 px-5 py-4 text-white">
              <Sparkles size={18} />
              <p className="text-xs font-black leading-6">{tipOfDay(day)}</p>
            </div>
          </Card>
        </div>
      </div>

      <TaskModal
        open={showTaskM}
        onClose={() => setShowTaskM(false)}
        edit={editTask}
        presetDue={editTask ? undefined : presetForTomorrow ? tomorrow : day}
        presetBacklog={false}
      />
      <Confirm open={confirmId != null} onClose={() => setConfirmId(null)} onYes={() => confirmId && deleteTask(confirmId)} title="حذف تسک؟" desc="این تسک برای همیشه حذف می‌شود." />
    </div>
  );
}

function DayInfo({ icon, label, value, sub, c }: { icon: React.ReactNode; label: string; value: string; sub: string; c: string }) {
  return (
    <Card className="p-4">
      <span className={cx('mb-2 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br text-white', c)}>
        {icon}
      </span>
      <p className="text-[11px] font-bold text-slate-400">{label}</p>
      <p className="tabular mt-0.5 truncate text-[15px] font-black text-slate-800 dark:text-white">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-slate-400">{sub}</p>
    </Card>
  );
}

/**
 * نمره روز: هم با نوار قابل جابه‌جایی، هم با ورود دستی عدد (اعشار با یک رقم).
 * ورودی عدد هم ارقام فارسی و هم لاتین را می‌پذیرد.
 */
function ScorePicker({
  score, onChange,
}: {
  score: number | null;
  onChange: (v: number | null) => void;
}) {
  const [txt, setTxt] = useState(score != null ? formatScore(score) : '');
  const [invalid, setInvalid] = useState(false);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setTxt(score != null ? formatScore(score) : '');
      setInvalid(false);
    }
  }, [score]);

  const apply = (raw: string) => {
    const cleaned = raw
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[,،]/g, '')
      .replace(/[٫]/g, '.')
      .trim();
    if (!cleaned) {
      onChange(null);
      setInvalid(false);
      return;
    }
    const n = Number(cleaned);
    if (!Number.isFinite(n)) { setInvalid(true); return; }
    const clamped = Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(n * 10) / 10));
    setInvalid(false);
    onChange(clamped);
  };

  const step = (delta: number) => {
    const cur = score ?? SCORE_MIN;
    const next = Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round((cur + delta) * 10) / 10));
    onChange(next);
  };

  const sliderValue = score ?? (SCORE_MIN + SCORE_MAX) / 2;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => step(-SCORE_STEP)}
          aria-label="کاهش نمره"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-amber-400 hover:text-amber-600 disabled:opacity-40 dark:border-white/10"
          disabled={score != null && score <= SCORE_MIN}
        >
          <Minus size={15} />
        </button>

        <input
          type="range"
          min={SCORE_MIN}
          max={SCORE_MAX}
          step={SCORE_STEP}
          value={sliderValue}
          onChange={(e) => onChange(Math.round(Number(e.target.value) * 10) / 10)}
          aria-label="نمره روز با نوار لغزنده"
          className="h-2 min-w-[100px] flex-1 basis-[130px] accent-amber-500"
          dir="ltr"
        />

        <button
          type="button"
          onClick={() => step(SCORE_STEP)}
          aria-label="افزایش نمره"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-amber-400 hover:text-amber-600 disabled:opacity-40 dark:border-white/10"
          disabled={score != null && score >= SCORE_MAX}
        >
          <Plus size={15} />
        </button>

        <div className="relative w-20 shrink-0">
          <input
            inputMode="decimal"
            dir="ltr"
            value={txt}
            placeholder="۷٫۵"
            aria-label="ورود دستی نمره"
            onFocus={() => { focused.current = true; }}
            onChange={(e) => setTxt(e.target.value)}
            onBlur={(e) => {
              focused.current = false;
              apply(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); apply(txt); (e.target as HTMLInputElement).blur(); }
            }}
            className={cx(
              inputCls, 'tabular h-10 text-center text-base font-black',
              invalid && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10',
            )}
          />
        </div>

        <button
          type="button"
          onClick={() => { onChange(null); setTxt(''); setInvalid(false); }}
          title={score == null ? 'نمره‌ای ثبت نشده' : 'پاک کردن نمره'}
          className={cx(
            'tabular grid h-10 shrink-0 place-items-center rounded-xl px-3 text-xs font-black transition',
            score != null ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-slate-100 text-slate-400 dark:bg-white/10',
          )}
        >
          {score != null ? `${formatScore(score)} از ۱۰` : 'ثبت نشده'}
        </button>
      </div>

      <div className="flex justify-between text-[10px] font-bold text-slate-400">
        <span>۰ • افتضاح</span>
        <span>۵ • متوسط</span>
        <span>۱۰ • عالی</span>
      </div>
      <p className="text-[10px] text-slate-400">
        نمره با دقت یک رقم اعشار ثبت می‌شود (مثلاً ۷٫۵) — هم با نوار، هم با تایپ عدد، هم با کلیدهای ▲▼.
      </p>
      {invalid && <p className="text-[11px] font-bold text-rose-500">عدد معتبر بین ۰ تا ۱۰ وارد کنید</p>}
    </div>
  );
}

interface RDraft {
  mood: DayReflection['mood'];
  score: number | null;
  wins: string;
  improve: string;
  lessons: string;
  gratitude: string;
}

const emptyDraft: RDraft = { mood: 3, score: null, wins: '', improve: '', lessons: '', gratitude: '' };

const draftOf = (r?: DayReflection): RDraft =>
  r
    ? { mood: r.mood ?? 3, score: r.score ?? null, wins: r.wins ?? '', improve: r.improve ?? '', lessons: r.lessons ?? '', gratitude: r.gratitude ?? '' }
    : { ...emptyDraft };

function ReflectionCard({ day, reflection }: { day: number; reflection?: DayReflection }) {
  const { saveReflection, deleteReflection } = useApp();
  // پیش‌نویس با تغییر روز ریست می‌شود (key در والد)، پس افکت همگام‌سازی لازم نیست
  const [draft, setDraft] = useState<RDraft>(() => draftOf(reflection));
  const [flash, setFlash] = useState(false);
  const live = useRef(reflection);

  useEffect(() => { live.current = reflection; }, [reflection]);
  useEffect(() => {
    if (!flash) return;
    const h = setTimeout(() => setFlash(false), 1800);
    return () => clearTimeout(h);
  }, [flash]);

  const stored = draftOf(reflection);
  const dirty =
    draft.mood !== stored.mood ||
    draft.score !== stored.score ||
    draft.wins.trim() !== stored.wins.trim() ||
    draft.improve.trim() !== stored.improve.trim() ||
    draft.lessons.trim() !== stored.lessons.trim() ||
    draft.gratitude.trim() !== stored.gratitude.trim();

  /** رکورد کامل روز؛ فیلدهای پایه از آخرین مقدار ذخیره‌شده خوانده می‌شوند تا چیزی بازنویسی نشود */
  const persist = (d: RDraft) => {
    const b = live.current;
    saveReflection({
      day,
      mood: d.mood,
      score: d.score,
      wake: b?.wake,
      sleep: b?.sleep,
      sport: b?.sport,
      sportType: b?.sportType,
      wentOut: b?.wentOut,
      outPlace: b?.outPlace,
      dayNote: b?.dayNote,
      wins: d.wins.trim(),
      improve: d.improve.trim() || undefined,
      lessons: d.lessons.trim(),
      gratitude: d.gratitude.trim(),
    });
    setFlash(true);
  };

  const set = <K extends keyof RDraft>(k: K, v: RDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  // ذخیره خودکار (debounce) تا هیچ نوشته‌ای از دست نرود
  useEffect(() => {
    if (!dirty) return;
    const h = setTimeout(() => persist(draft), 900);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, dirty, day]);

  /** نمره بلافاصله ذخیره می‌شود: اسلایدر، دکمه‌های ±۰٫۱ و ورود دستی */
  const onScore = (v: number | null) => {
    const next = { ...draft, score: v };
    setDraft(next);
    persist(next);
  };

  const clearAll = () => {
    deleteReflection(day);
    setDraft(draftOf(undefined));
    setFlash(false);
  };

  return (
    <Card>
      <CardHead
        title="بازتاب پایان روز 🌙"
        sub="نمره بلافاصله ذخیره می‌شود؛ متن‌ها هم خودکار ذخیره می‌شوند"
        action={
          <div className="flex items-center gap-1.5">
            <span
              className={cx(
                'flex items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-black',
                dirty ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
              )}
            >
              {dirty ? <><Pencil size={11} /> ذخیره‌نشده…</> : <><Check size={11} /> ذخیره شد</>}
            </span>
            {reflection && (
              <button
                onClick={clearAll}
                title="پاک کردن بازتاب این روز"
                className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-bold text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500"
              >
                <Trash2 size={13} /> پاک
              </button>
            )}
          </div>
        }
      />
      <div className="space-y-3.5 px-5 pb-5">
        <div>
          <p className="mb-2 text-xs font-bold text-slate-500">این روز چطور بود؟</p>
          <div className="flex flex-wrap gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m.v}
                onClick={() => set('mood', m.v)}
                title={m.l}
                aria-pressed={draft.mood === m.v}
                className={cx(
                  'flex h-12 min-w-[56px] flex-1 flex-col items-center justify-center rounded-2xl border-2 text-lg transition active:scale-95',
                  draft.mood === m.v ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-100 hover:border-slate-200 dark:border-white/5',
                )}
              >
                {m.e}
                <span className="text-[9px] font-bold text-slate-400">{m.l}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold text-slate-500">⭐ نمره روز (۰ تا ۱۰ — با یک رقم اعشار)</p>
          <ScorePicker score={draft.score} onChange={onScore} />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold text-slate-500">🏆 دستاوردها / نکات مثبت این روز</p>
          <textarea value={draft.wins} onChange={(e) => set('wins', e.target.value)} rows={2} placeholder="چیزهای خوبی که این روز اتفاق افتاد…" className={cx(inputCls, 'h-auto py-2.5 leading-6')} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-slate-500">🔧 ۱ مورد قابل بهبود</p>
          <input value={draft.improve} onChange={(e) => set('improve', e.target.value)} placeholder="فردا چه چیزی را بهتر می‌کنی؟" className={inputCls} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-slate-500">💡 ۱ درس آموخته‌شده</p>
          <textarea value={draft.lessons} onChange={(e) => set('lessons', e.target.value)} rows={2} placeholder="چه چیزی یاد گرفتی؟" className={cx(inputCls, 'h-auto py-2.5 leading-6')} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-slate-500">🙏 قدردانی</p>
          <input value={draft.gratitude} onChange={(e) => set('gratitude', e.target.value)} placeholder="بابت چه چیزی شکرگزاری؟" className={inputCls} />
        </div>
        <Btn onClick={() => persist(draft)} className="w-full">
          {flash && !dirty ? <><Check size={15} /> ذخیره شد ✓</> : <><MoonStar size={15} /> ذخیره بازتاب</>}
        </Btn>
      </div>
    </Card>
  );
}

function tipOfDay(day: number): string {
  const tips = [
    'مهم‌ترین کارت را اول صبح انجام بده؛ بقیه روز سبک می‌شود.',
    'هر تسک بزرگ را به قدم ۱۵ دقیقه‌ای بشکن.',
    'قانون دو دقیقه: کاری که زیر دو دقیقه طول می‌کشد را همین حالا انجام بده.',
    'شب، فردا را برنامه‌ریزی کن تا صبح با وضوح شروع کنی.',
    'استراحت هم جزئی از برنامه است، نه پاداش آن.',
    'زنجیره عادت را نشکن — حتی نسخه کوچکش را انجام بده.',
    'نه گفتن به کار کم‌اهمیت، بله گفتن به تمرکز است.',
  ];
  return tips[Math.abs(day) % tips.length];
}

/** کارت اطلاعات پایه روز: خواب/بیداری (۲۴ساعته)، ورزش، بیرون، یادداشت (ذخیره خودکار در بازتاب روز) */
function DayBasicsCard({ day }: { day: number }) {
  const { state, saveReflection } = useApp();
  const ref = (state.reflections ?? []).find((r) => r.day === day);

  const [wake, setWake] = useState(ref?.wake ?? '');
  const [sleep, setSleep] = useState(ref?.sleep ?? '');
  const [sport, setSport] = useState(ref?.sport ?? false);
  const [sportType, setSportType] = useState(ref?.sportType ?? '');
  const [wentOut, setWentOut] = useState(ref?.wentOut ?? false);
  const [outPlace, setOutPlace] = useState(ref?.outPlace ?? '');
  const [dayNote, setDayNote] = useState(ref?.dayNote ?? '');

  // ذخیره خودکار (debounce) — اطلاعات پایه در همان رکورد بازتاب روز نگه داشته می‌شود
  useEffect(() => {
    const h = setTimeout(() => {
      const cur = { wake, sleep, sport, sportType, wentOut, outPlace, dayNote };
      const prev = {
        wake: ref?.wake ?? '', sleep: ref?.sleep ?? '', sport: ref?.sport ?? false,
        sportType: ref?.sportType ?? '', wentOut: ref?.wentOut ?? false, outPlace: ref?.outPlace ?? '',
        dayNote: ref?.dayNote ?? '',
      };
      if (JSON.stringify(cur) === JSON.stringify(prev)) return;
      saveReflection({
        day,
        mood: ref?.mood ?? 3,
        score: ref?.score ?? null,
        wake: wake || undefined,
        sleep: sleep || undefined,
        sport,
        sportType: sportType.trim() || undefined,
        wentOut,
        outPlace: outPlace.trim() || undefined,
        dayNote: dayNote.trim() || undefined,
        wins: ref?.wins ?? '',
        improve: ref?.improve,
        lessons: ref?.lessons ?? '',
        gratitude: ref?.gratitude ?? '',
      });
    }, 700);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wake, sleep, sport, sportType, wentOut, outPlace, dayNote, day]);

  const sleepDur = wake && sleep ? calcSleep(wake, sleep) : null;

  return (
    <Card>
      <CardHead title="اطلاعات پایه روز" sub="ساعت‌ها ۲۴ساعته (۰۰:۰۰ تا ۲۳:۵۹) — خودکار ذخیره می‌شود" />
      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-white/5">
          <p className="mb-2 text-xs font-black text-slate-500">😴 خواب و بیداری</p>
          <div className="flex items-start gap-2">
            <label className="flex-1 text-[11px] text-slate-400">
              بیداری
              <div className="mt-1">
                <TimeField value={wake} onChange={setWake} ariaLabel="ساعت بیداری" placeholder="۰۷:۰۰" />
              </div>
            </label>
            <label className="flex-1 text-[11px] text-slate-400">
              خواب
              <div className="mt-1">
                <TimeField value={sleep} onChange={setSleep} ariaLabel="ساعت خواب" placeholder="۲۳:۳۰" />
              </div>
            </label>
          </div>
          {sleepDur && <p className="tabular mt-2 text-[11px] font-bold text-sky-600 dark:text-sky-400">مدت خواب: حدود {sleepDur}</p>}
        </div>

        <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-white/5">
          <p className="mb-2 text-xs font-black text-slate-500">🏃 ورزش</p>
          <Segmented value={sport ? 'yes' : 'no'} onChange={(v) => setSport(v === 'yes')} options={[{ v: 'no', label: 'نه' }, { v: 'yes', label: 'بله' }]} />
          {sport && (
            <input value={sportType} onChange={(e) => setSportType(e.target.value)} placeholder="نوع فعالیت (مثلاً پیاده‌روی)…" className={cx(inputCls, 'mt-2 h-9 text-xs')} />
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-white/5">
          <p className="mb-2 text-xs font-black text-slate-500">🚶 بیرون رفتن</p>
          <Segmented value={wentOut ? 'yes' : 'no'} onChange={(v) => setWentOut(v === 'yes')} options={[{ v: 'no', label: 'نه' }, { v: 'yes', label: 'بله' }]} />
          {wentOut && (
            <input value={outPlace} onChange={(e) => setOutPlace(e.target.value)} placeholder="کجا؟ (مثلاً پارک، خرید…)" className={cx(inputCls, 'mt-2 h-9 text-xs')} />
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 p-3.5 sm:col-span-2 xl:col-span-3 dark:border-white/5">
          <p className="mb-2 text-xs font-black text-slate-500">📝 یادداشت آزاد روز</p>
          <textarea value={dayNote} onChange={(e) => setDayNote(e.target.value)} rows={2} placeholder="هر نکته‌ای درباره این روز…" className={cx(inputCls, 'h-auto py-2.5 text-xs leading-6')} />
        </div>
      </div>
    </Card>
  );
}

function calcSleep(wake: string, sleep: string): string | null {
  const wm = parseClock(wake);
  const sm = parseClock(sleep);
  if (wm == null || sm == null) return null;
  let diff = wm - sm;
  if (diff <= 0) diff += 24 * 60;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${toFa(h)} ساعت${m ? ` و ${toFa(m)} دقیقه` : ''}`;
}
