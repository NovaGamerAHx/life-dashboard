import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Plus, Check, Pencil, Trash2, Clock,
  Flame, MoonStar, Copy, CheckCheck, Sparkles, CalendarPlus, RotateCcw,
  PartyPopper, ArrowLeft, Target, Hourglass, Wallet, Star, CalendarDays,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../lib/store';
import { useMoney } from '../lib/money';
import {
  toJalaali, J_MONTHS, toFa, formatJalali, formatGregorian, todayStart,
  addDays, startOfDay, weekdayName, formatClock, parseClock, diffDays,
} from '../lib/jalali';
import { habitStreak, sumTx, inRange } from '../lib/stats';
import { PRIORITY_META, type DayReflection, type Task } from '../lib/types';
import { Card, CardHead, Btn, Badge, Empty, Progress, Confirm, inputCls, Segmented } from '../components/ui';
import { TaskModal } from '../components/forms';
import { CheckIcon } from './Dashboard';
import { cx } from '../lib/utils';

const MOODS = [
  { v: 1 as const, e: '😞', l: 'بد' },
  { v: 2 as const, e: '😐', l: 'معمولی' },
  { v: 3 as const, e: '🙂', l: 'خوب' },
  { v: 4 as const, e: '😄', l: 'عالی' },
  { v: 5 as const, e: '🤩', l: 'فوق‌العاده' },
];

export default function Today() {
  const { state, moveTask, updateTask, deleteTask, toggleHabit, addTask } = useApp();
  const { withUnit } = useMoney();
  const finOn = state.settings.financeEnabled;
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
      if (e.key === 'ArrowLeft') { setDay((d) => addDays(d, 1)); } // در RTL، چپ = جلو
      else if (e.key === 'ArrowRight') { setDay((d) => addDays(d, -1)); }
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
  const dayTx = useMemo(
    () => state.transactions.filter((t) => inRange(t.date, day, day + 86400000 - 1)),
    [state.transactions, day],
  );
  const dayExp = sumTx(dayTx, 'expense');
  const dayInc = sumTx(dayTx, 'income');

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
    addTask({
      title, status: 'todo', priority: quickPri, tags: [],
      due: day, backlog: false, subtasks: [],
    });
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

  const copySummary = async () => {
    const j = toJalaali(new Date(day));
    const lines: string[] = [
      `📅 خلاصه روز ${weekdayName(day)} ${j.jd} ${J_MONTHS[j.jm - 1]} ${j.jy}`,
      ``,
      `✅ انجام‌شده: ${doneCount} از ${dayTasks.length} تسک (${pct}٪)`,
    ];
    const open = dayTasks.filter((t) => t.status !== 'done');
    if (open.length) {
      lines.push(`⏳ باقی‌مانده:`);
      for (const t of open) lines.push(`  • ${t.title}${t.time ? ` (ساعت ${t.time})` : ''}`);
    }
    const hd = activeHabits.filter((h) => state.habitLogs[`${h.id}:${day}`]);
    lines.push(`🔥 عادت‌ها: ${hd.length} از ${activeHabits.length} انجام شد`);
    if (finOn && (dayExp > 0 || dayInc > 0)) lines.push(`💰 هزینه: ${dayExp.toLocaleString('fa-IR')} • درآمد: ${dayInc.toLocaleString('fa-IR')} تومان`);
    if (dayInfo.score != null) lines.push(`⭐ نمره روز: ${dayInfo.score} از ۱۰`);
    if (dayInfo.wake || dayInfo.sleep) lines.push(`😴 خواب: ${dayInfo.wake ? `بیداری ${dayInfo.wake}` : ''}${dayInfo.wake && dayInfo.sleep ? ' • ' : ''}${dayInfo.sleep ? `خواب ${dayInfo.sleep}` : ''}`);
    if (dayInfo.sport) lines.push(`🏃 ورزش: بله${dayInfo.sportType ? ` (${dayInfo.sportType})` : ''}`);
    if (dayInfo.wentOut) lines.push(`🚶 بیرون: بله${dayInfo.outPlace ? ` (${dayInfo.outPlace})` : ''}`);
    if (dayInfo.dayNote) lines.push(`📝 یادداشت روز: ${dayInfo.dayNote}`);
    if (reflection) {
      lines.push(`🌙 حال روز: ${MOODS.find((m) => m.v === reflection.mood)?.e ?? ''}`);
      if (reflection.wins) lines.push(`🏆 بردها: ${reflection.wins}`);
      if (reflection.gratitude) lines.push(`🙏 قدردانی: ${reflection.gratitude}`);
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* کلیپ‌برد در دسترس نیست */ }
  };

  const rollover = () => {
    const open = dayTasks.filter((t) => t.status !== 'done');
    for (const t of open) updateTask(t.id, { due: tomorrow, backlog: false });
  };

  const j = toJalaali(new Date(day));

  return (
    <div className="space-y-5">
      {/* ناوبری روزانه */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 bg-gradient-to-l from-emerald-600 to-teal-600 px-4 py-3.5 text-white">
          <button onClick={() => setDay((d) => addDays(d, -1))} className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 transition hover:bg-white/25" title="روز قبل (→)">
            <ChevronRight size={18} />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h2 className="text-base font-black sm:text-lg">
              {isToday ? 'امروز' : formatJalali(day, { weekday: true })}
              <span className="mr-2 text-[11px] font-bold text-emerald-100">{toFa(j.jd)} {J_MONTHS[j.jm - 1]} {toFa(j.jy)}</span>
            </h2>
            <p dir="ltr" className="tabular mt-0.5 text-[11px] text-emerald-100/90">{formatGregorian(day)}</p>
          </div>
          <button onClick={() => setDay((d) => addDays(d, 1))} className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 transition hover:bg-white/25" title="روز بعد (←)">
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
        </div>
      </Card>

      {/* ۱. اطلاعات پایه روز */}
      <div className={cx('grid grid-cols-2 gap-3', finOn ? 'md:grid-cols-3 xl:grid-cols-5' : 'md:grid-cols-4')}>
        <DayInfo icon={<Target size={17} />} label="پیشرفت تسک‌ها" value={`${toFa(pct)}٪`} sub={`${toFa(doneCount)} از ${toFa(dayTasks.length)} انجام شد`} c="from-emerald-500 to-teal-600" />
        <DayInfo icon={<Hourglass size={17} />} label="باقی‌مانده" value={`${toFa(remaining)} تسک`} sub={remaining === 0 && dayTasks.length > 0 ? 'روزت کامل شد! 🎉' : 'ادامه بده 💪'} c="from-sky-500 to-blue-600" />
        {finOn && (
          <DayInfo icon={<Wallet size={17} />} label="هزینه امروز" value={withUnit(dayExp)} sub={`${toFa(dayTx.filter((t) => t.type === 'expense').length)} تراکنش`} c="from-rose-500 to-pink-600" />
        )}
        <DayInfo icon={<Star size={17} />} label="نمره روز" value={dayInfo.score != null ? `${toFa(dayInfo.score)} از ۱۰` : 'ثبت نشده'} sub={dayInfo.sport ? `🏃 ورزش${dayInfo.sportType ? `: ${dayInfo.sportType}` : ''}` : 'ورزش ثبت نشده'} c="from-amber-500 to-orange-600" />
        <DayInfo icon={<CalendarDays size={17} />} label="رویدادها" value={`${toFa(dayEvents.length)} رویداد`} sub={dayEvents.length ? dayEvents[0].title : 'برنامه‌ای ثبت نشده'} c="from-violet-500 to-purple-600" />
      </div>

      {/* اطلاعات پایه روز (فرم فشرده اینلاین) */}
      <DayBasicsCard day={day} />
      {dayTasks.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>پیشرفت امروز</span>
            <span className="tabular">{toFa(pct)}٪</span>
          </div>
          <div className="mt-2"><Progress value={pct} h={10} color={pct === 100 ? '#10b981' : '#0ea5e9'} /></div>
          {pct === 100 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
              <PartyPopper size={15} /> همه تسک‌های امروز تمام شد — فوق‌العاده‌ای!
            </p>
          )}
        </Card>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-5">
        <div className="space-y-5 xl:col-span-3">
          {/* ۲. تسک‌های امروز */}
          <Card>
            <CardHead
              title={isToday ? 'تسک‌های امروز' : `تسک‌های ${formatJalali(day)}`}
              sub="Enter برای ثبت سریع • دابل‌کلیک روی عنوان برای ویرایش درجا"
              action={<Btn size="sm" onClick={() => { setEditTask(null); setPresetForTomorrow(false); setShowTaskM(true); }}><Plus size={14} /> تسک</Btn>}
            />
            <div className="px-5 pb-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={quickRef}
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); quickAdd(); } }}
                    placeholder="تسک جدید بنویس و Enter بزن…"
                    className={inputCls}
                  />
                </div>
                <select value={quickPri} onChange={(e) => setQuickPri(e.target.value as Task['priority'])} className={cx(inputCls, 'w-auto')} title="اولویت">
                  <option value="high">مهم</option>
                  <option value="medium">متوسط</option>
                  <option value="low">عادی</option>
                </select>
                <Btn onClick={quickAdd}><Plus size={15} /></Btn>
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
                          {t.time && <span className="tabular inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-bold dark:bg-white/10"><Clock size={10} />{t.time}</span>}
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
              {remaining > 0 && dayTasks.some((t) => t.status !== 'done') && !isToday && diffDays(day, Date.now()) < 0 && (
                <Btn variant="soft" className="mt-3 w-full" onClick={rollover}>
                  <RotateCcw size={14} /> انتقال {toFa(remaining)} تسک باز به فردا
                </Btn>
              )}
            </div>
          </Card>

          {/* ۵. برنامه‌ریزی فردا */}
          <Card>
            <CardHead
              title={`برنامه‌ریزی فردا (${formatJalali(tomorrow, { weekday: false })})`}
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
                      <span className="flex-1 truncate">{t.title}</span>
                      {t.time && <span className="tabular text-[11px] text-slate-400">{t.time}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* ۶. بازتاب پایان روز */}
          <ReflectionCard day={day} reflection={reflection} />
        </div>

        <div className="space-y-5 xl:col-span-2">
          {/* ۳. تایم‌لاین روز */}
          <Card>
            <CardHead title="تایم‌لاین روز" sub="تسک‌ها و رویدادهای ساعت‌دار به ترتیب زمان" />
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
                  <span className="flex-1 truncate">{e.title}</span>
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

function ReflectionCard({ day, reflection }: { day: number; reflection?: DayReflection }) {
  const { saveReflection, deleteReflection } = useApp();
  const [mood, setMood] = useState<DayReflection['mood']>(reflection?.mood ?? 3);
  const [score, setScore] = useState<number | null>(reflection?.score ?? null);
  const [wins, setWins] = useState(reflection?.wins ?? '');
  const [improve, setImprove] = useState(reflection?.improve ?? '');
  const [lessons, setLessons] = useState(reflection?.lessons ?? '');
  const [gratitude, setGratitude] = useState(reflection?.gratitude ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMood(reflection?.mood ?? 3);
    setScore(reflection?.score ?? null);
    setWins(reflection?.wins ?? '');
    setImprove(reflection?.improve ?? '');
    setLessons(reflection?.lessons ?? '');
    setGratitude(reflection?.gratitude ?? '');
    setSaved(false);
  }, [day, reflection?.mood, reflection?.score, reflection?.wins, reflection?.improve, reflection?.lessons, reflection?.gratitude]);

  const save = () => {
    saveReflection({
      day,
      mood,
      score,
      wake: reflection?.wake,
      sleep: reflection?.sleep,
      sport: reflection?.sport,
      sportType: reflection?.sportType,
      wentOut: reflection?.wentOut,
      outPlace: reflection?.outPlace,
      dayNote: reflection?.dayNote,
      wins: wins.trim(),
      improve: improve.trim() || undefined,
      lessons: lessons.trim(),
      gratitude: gratitude.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <CardHead
        title="بازتاب پایان روز 🌙"
        sub="دو دقیقه بنویس؛ فردا بهتر می‌شوی"
        action={
          reflection ? (
            <button onClick={() => deleteReflection(day)} className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500">
              <Trash2 size={13} /> پاک
            </button>
          ) : undefined
        }
      />
      <div className="space-y-3.5 px-5 pb-5">
        <div>
          <p className="mb-2 text-xs font-bold text-slate-500">امروزت چطور بود؟</p>
          <div className="flex gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m.v}
                onClick={() => setMood(m.v)}
                title={m.l}
                className={cx(
                  'flex h-12 flex-1 flex-col items-center justify-center rounded-2xl border-2 text-lg transition active:scale-95',
                  mood === m.v ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-100 hover:border-slate-200 dark:border-white/5',
                )}
              >
                {m.e}
                <span className="text-[9px] font-bold text-slate-400">{m.l}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-slate-500">⭐ نمره روز (۰ تا ۱۰)</p>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={score ?? 5}
              onChange={(e) => setScore(Number(e.target.value))}
              className="h-2 flex-1 accent-amber-500"
              dir="ltr"
            />
            <button
              onClick={() => setScore((s) => (s == null ? 5 : null))}
              title={score == null ? 'ثبت نمره' : 'حذف نمره'}
              className={cx(
                'tabular grid h-10 w-12 shrink-0 place-items-center rounded-xl text-base font-black transition',
                score != null ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'bg-slate-100 text-slate-400 dark:bg-white/10',
              )}
            >
              {score != null ? toFa(score) : '—'}
            </button>
          </div>
          <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-400">
            <span>۱۰ • عالی</span>
            <span>۵ • متوسط</span>
            <span>۰ • افتضاح</span>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-slate-500">🏆 ۳ دستاورد / نکته مثبت امروز</p>
          <textarea value={wins} onChange={(e) => setWins(e.target.value)} rows={2} placeholder="سه چیز خوبی که امروز اتفاق افتاد…" className={cx(inputCls, 'h-auto py-2.5 leading-6')} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-slate-500">🔧 ۱ مورد قابل بهبود</p>
          <input value={improve} onChange={(e) => setImprove(e.target.value)} placeholder="فردا چه چیزی را بهتر می‌کنی؟" className={inputCls} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-slate-500">💡 ۱ درس آموخته‌شده</p>
          <textarea value={lessons} onChange={(e) => setLessons(e.target.value)} rows={2} placeholder="چه چیزی یاد گرفتی؟" className={cx(inputCls, 'h-auto py-2.5 leading-6')} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-slate-500">🙏 قدردانی</p>
          <input value={gratitude} onChange={(e) => setGratitude(e.target.value)} placeholder="بابت چه چیزی شکرگزاری؟" className={inputCls} />
        </div>
        <Btn onClick={save} className="w-full">
          {saved ? <><Check size={15} /> ذخیره شد ✓</> : <><MoonStar size={15} /> ذخیره بازتاب</>}
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

/** کارت اطلاعات پایه روز: خواب/بیداری، روحیه، ورزش، بیرون، یادداشت (ذخیره خودکار در بازتاب روز) */
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

  useEffect(() => {
    setWake(ref?.wake ?? '');
    setSleep(ref?.sleep ?? '');
    setSport(ref?.sport ?? false);
    setSportType(ref?.sportType ?? '');
    setWentOut(ref?.wentOut ?? false);
    setOutPlace(ref?.outPlace ?? '');
    setDayNote(ref?.dayNote ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  // ذخیره خودکار (debounce) — اطلاعات پایه در همان رکورد بازتاب روز نگه داشته می‌شود
  useEffect(() => {
    const h = setTimeout(() => {
      const cur = { wake, sleep, sport, sportType, wentOut, outPlace, dayNote };
      const prev = { wake: ref?.wake ?? '', sleep: ref?.sleep ?? '', sport: ref?.sport ?? false, sportType: ref?.sportType ?? '', wentOut: ref?.wentOut ?? false, outPlace: ref?.outPlace ?? '', dayNote: ref?.dayNote ?? '' };
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
      <CardHead title="اطلاعات پایه روز" sub="فشرده و اینلاین — خودکار ذخیره می‌شود" />
      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-white/5">
          <p className="mb-2 text-xs font-black text-slate-500">😴 خواب و بیداری</p>
          <div className="flex items-center gap-2">
            <label className="flex-1 text-[11px] text-slate-400">
              بیداری
              <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} dir="ltr" className={cx(inputCls, 'tabular mt-1 text-center')} />
            </label>
            <label className="flex-1 text-[11px] text-slate-400">
              خواب
              <input type="time" value={sleep} onChange={(e) => setSleep(e.target.value)} dir="ltr" className={cx(inputCls, 'tabular mt-1 text-center')} />
            </label>
          </div>
          {sleepDur && <p className="tabular mt-2 text-[11px] font-bold text-sky-600 dark:text-sky-400">مدت خواب: حدود {toFa(sleepDur)}</p>}
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
          <textarea value={dayNote} onChange={(e) => setDayNote(e.target.value)} rows={2} placeholder="هر نکته‌ای درباره امروز…" className={cx(inputCls, 'h-auto py-2.5 text-xs leading-6')} />
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
