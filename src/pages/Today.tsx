import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CalendarDays, CalendarPlus, Check, CheckCheck, Clock, Copy,
  Flame, MoonStar, PartyPopper, Pencil, Plus, RotateCcw, Sparkles, Star,
  Target, Trash2, Hourglass, Gauge,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../lib/store';
import {
  addDays, diffDays, formatClock, formatGregorian, formatJalali, formatScore, J_MONTHS,
  parseClock, startOfDay, toFa, toJalaali, todayStart,
} from '../lib/jalali';
import { habitStreak, copyText } from '../lib/stats';
import { buildDayStat } from '../lib/days';
import { buildDayBlock, DEFAULT_SUMMARY_OPTIONS } from '../lib/summary';
import { MOODS, moodFace, moodLabel } from '../lib/display';
import { PRIORITY_META, type DayReflection, type Task } from '../lib/types';
import {
  Badge, Btn, Card, CardHead, CheckIcon, Confirm, Empty, Progress, Segmented, inputCls,
} from '../components/ui';
import { ScoreField, TaskModal, TimeField } from '../components/forms';
import { cx } from '../lib/utils';

/**
 * مسیر «روز جاری»: با پارامتر اختیاری ?day=<timestamp> (پيوند از تقویم/تحلیل روزها).
 * چون کامپوننت با key روز ساخته می‌شود، پیمایش بین روزها همیشه با وضعیت تازه شروع می‌شود.
 */
export default function TodayRoute() {
  const [params] = useSearchParams();
  const raw = params.get('day');
  const n = raw != null ? Number(raw) : NaN;
  const fromUrl = Number.isFinite(n) && n > 0 ? startOfDay(n) : null;
  return <Today key={fromUrl ?? 'today'} fromUrl={fromUrl} />;
}

function Today({ fromUrl }: { fromUrl: number | null }) {
  const { state, moveTask, updateTask, deleteTask, toggleHabit, addTask } = useApp();
  // امروز فقط یک‌بار محاسبه می‌شود تا مبنای «امروز/گذشته» در طول کار با صفحه ثابت بماند
  const realToday = useMemo(() => todayStart(), []);
  const [day, setDay] = useState<number>(() => fromUrl ?? realToday);

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
    () => state.events.filter((e) => e.day === day).sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')),
    [state.events, day],
  );

  const doneCount = dayTasks.filter((t) => t.status === 'done').length;
  const pct = dayTasks.length ? Math.round((doneCount / dayTasks.length) * 100) : 0;
  const remaining = dayTasks.length - doneCount;
  const activeHabits = useMemo(() => state.habits.filter((h) => !h.archived), [state.habits]);

  const reflection: DayReflection | undefined = (state.reflections ?? []).find((r) => r.day === day);
  const stat = useMemo(() => buildDayStat(state, day), [state, day]);

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

  /** خلاصه کامل و شفاف روز (همان قالب صفحه «تحلیل روزها») */
  const copySummary = async () => {
    const ok = await copyText(buildDayBlock(stat, DEFAULT_SUMMARY_OPTIONS));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
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
        <div className="flex items-center gap-2 bg-gradient-to-l from-emerald-700 to-teal-700 px-4 py-3.5 text-white">
          <button onClick={() => setDay((d) => addDays(d, -1))} className="grid grid-cols-1 h-9 w-9 place-items-center rounded-xl bg-white/15 transition hover:bg-white/25" title="روز قبل (→)">
            <ArrowLeft size={18} className="rotate-180" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h2 className="text-base font-black sm:text-lg">
              {isToday ? 'امروز' : formatJalali(day, { weekday: true })}
              <span className="mr-2 text-[11px] font-bold text-white/85">{toFa(j.jd)} {J_MONTHS[j.jm - 1]} {toFa(j.jy)}</span>
            </h2>
            <p dir="ltr" className="num mt-0.5 text-[11px] text-white/85">{formatGregorian(day)}</p>
          </div>
          <button onClick={() => setDay((d) => addDays(d, 1))} className="grid grid-cols-1 h-9 w-9 place-items-center rounded-xl bg-white/15 transition hover:bg-white/25" title="روز بعد (←)">
            <ArrowLeft size={18} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          {!isToday && <Btn size="sm" variant="soft" onClick={() => setDay(realToday)}>بازگشت به امروز</Btn>}
          <span className="text-[11px] text-muted">کلیدهای ◀ ▶ برای جابه‌جایی روز • کلید N برای تسک جدید</span>
          <span className="flex-1" />
          <Link to={`/insights`} className="flex items-center gap-1 text-[11px] font-bold text-brand-ink hover:underline ">
            <Gauge size={13} /> تحلیل روزها <ArrowLeft size={12} />
          </Link>
          <Btn size="sm" variant="outline" onClick={copySummary}>
            {copied ? <CheckCheck size={14} className="text-brand-ink" /> : <Copy size={14} />}
            {copied ? 'کپی شد!' : 'کپی خلاصه روز'}
          </Btn>
        </div>
      </Card>

      {/* ۱. اطلاعات پایه روز */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DayInfo icon={<Target size={17} />} label="پیشرفت تسک‌ها" value={`${toFa(pct)}٪`} sub={`${toFa(doneCount)} از ${toFa(dayTasks.length)} انجام شد`} c="from-emerald-700 to-teal-700" />
        <DayInfo icon={<Hourglass size={17} />} label="باقی‌مانده" value={`${toFa(remaining)} تسک`} sub={remaining === 0 && dayTasks.length > 0 ? 'روزت کامل شد! 🎉' : 'ادامه بده 💪'} c="from-sky-700 to-blue-700" />
        <DayInfo
          icon={<Star size={17} />}
          label="نمره روز"
          value={stat.score != null ? `${formatScore(stat.score)} از ۱۰` : 'ثبت نشده'}
          sub={stat.score != null ? `${moodFace(stat.mood)} حال روز ثبت‌شده` : 'پایین همین صفحه ثبت کن'}
          c="from-amber-700 to-orange-700"
        />
        <DayInfo icon={<CalendarDays size={17} />} label="رویدادها" value={`${toFa(dayEvents.length)} رویداد`} sub={dayEvents.length ? dayEvents[0].title : 'برنامه‌ای ثبت نشده'} c="from-violet-700 to-purple-700" />
      </div>

      {/* اطلاعات پایه روز (فرم فشرده اینلاین) */}
      <DayBasicsCard key={`basics-${day}`} day={day} />
      {dayTasks.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between text-xs font-bold text-muted">
            <span>پیشرفت امروز</span>
            <span className="num">{toFa(pct)}٪</span>
          </div>
          <div className="mt-2"><Progress value={pct} h={10} color={pct === 100 ? '#10b981' : '#0ea5e9'} /></div>
          {pct === 100 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-black text-brand-ink ">
              <PartyPopper size={15} /> همه تسک‌های امروز تمام شد — فوق‌العاده‌ای!
            </p>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-5">
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
                <input
                  ref={quickRef}
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); quickAdd(); } }}
                  placeholder="تسک جدید بنویس و Enter بزن…"
                  className={inputCls}
                />
                <select value={quickPri} onChange={(e) => setQuickPri(e.target.value as Task['priority'])} className={cx(inputCls, 'w-auto')} title="اولویت">
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
                          ? 'border-brand/20 bg-brand/[0.04]'
                          : 'border-line hover:border-line-strong hover:bg-surface-2  dark:hover:bg-white/[0.03]',
                      )}
                    >
                      <button
                        onClick={() => moveTask(t.id, t.status === 'done' ? 'todo' : 'done')}
                        title={t.status === 'done' ? 'برگرداندن' : 'انجام شد'}
                        className={cx(
                          'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition active:scale-90',
                          t.status === 'done' ? 'border-brand bg-brand text-white' : 'border-line-strong hover:border-brand ',
                        )}
                      >
                        {t.status === 'done' && <CheckIcon size={13} />}
                      </button>
                      <span className={cx('h-8 w-1 shrink-0 rounded-full', t.priority === 'high' ? 'bg-danger' : t.priority === 'medium' ? 'bg-warn' : 'bg-info')} title={`اولویت: ${PRIORITY_META[t.priority].label}`} />
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
                            className={cx('cursor-text truncate text-[13px] font-bold', t.status === 'done' ? 'text-muted line-through' : 'text-ink-2 ')}
                          >
                            {t.title}
                          </p>
                        )}
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                          {t.time && <span className="num inline-flex items-center gap-1 rounded-md bg-sunken px-1.5 py-0.5 font-bold "><Clock size={10} />{toFa(t.time)}</span>}
                          <Badge tone={t.priority === 'high' ? 'red' : t.priority === 'medium' ? 'amber' : 'blue'}>{PRIORITY_META[t.priority].label}</Badge>
                          {t.tags.slice(0, 2).map((tg) => (
                            <span key={tg} className="rounded-md bg-ink/5 px-1.5 py-0.5 font-bold ">#{tg}</span>
                          ))}
                        </p>
                      </div>
                      <span className="flex shrink-0 gap-0.5 transition">
                        <button onClick={() => { setEditTask(t); setPresetForTomorrow(false); setShowTaskM(true); }} className="grid grid-cols-1 h-7 w-7 place-items-center rounded-lg text-muted hover:bg-info/10 hover:text-info-ink" title="ویرایش کامل"><Pencil size={13} /></button>
                        <button onClick={() => setConfirmId(t.id)} className="grid grid-cols-1 h-7 w-7 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger-ink" title="حذف"><Trash2 size={13} /></button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {remaining > 0 && dayTasks.some((t) => t.status !== 'done') && !isToday && diffDays(day, realToday) < 0 && (
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
                <p className="rounded-2xl bg-surface-2 py-4 text-center text-xs text-muted ">
                  هنوز برای فردا چیزی برنامه‌ریزی نکرده‌ای — امشب ۵ دقیقه وقت بگذار 🌙
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {tomorrowTasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2 text-[13px] font-bold text-ink-2  ">
                      <span className={cx('h-6 w-1 rounded-full', t.priority === 'high' ? 'bg-danger' : t.priority === 'medium' ? 'bg-warn' : 'bg-info')} />
                      <span className="flex-1 truncate">{t.title}</span>
                      {t.time && <span className="num text-[11px] text-muted">{toFa(t.time)}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* ۶. بازتاب پایان روز */}
          <ReflectionCard key={`refl-${day}`} day={day} reflection={reflection} />
        </div>

        <div className="space-y-5 xl:col-span-2">
          {/* ۳. تایم‌لاین روز */}
          <Card>
            <CardHead title="تایم‌لاین روز" sub="تسک‌ها و رویدادهای ساعت‌دار به ترتیب زمان (۲۴ ساعته)" />
            <div className="px-5 pb-5">
              {timeline.length === 0 ? (
                <Empty icon={<Clock size={26} />} title="تایم‌لاین خالی است" sub="برای تسک‌ها و رویدادها ساعت تعیین کن تا اینجا نمایش داده شوند" />
              ) : (
                <div className="relative space-y-0 pr-1">
                  <span className="absolute bottom-2 right-[7px] top-2 w-0.5 rounded bg-sunken " />
                  {timeline.map((it, i) => (
                    <motion.div
                      key={it.kind + it.id}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.4) }}
                      className="relative flex gap-3 py-2 pr-5"
                    >
                      <span className="absolute right-[3px] top-4 h-2.5 w-2.5 rounded-full ring-4 ring-surface " style={{ background: it.color }} />
                      <span className="num w-11 shrink-0 pt-0.5 text-[11px] font-black text-muted">{formatClock(it.mins)}</span>
                      <div className="min-w-0 flex-1 rounded-xl border border-line px-2.5 py-2 ">
                        <p className={cx('truncate text-xs font-black', it.task?.status === 'done' ? 'text-muted line-through' : 'text-ink-2 ')}>{it.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {it.kind === 'task' ? `تسک • ${toFa(it.end - it.mins)} دقیقه` : 'رویداد'} • تا {formatClock(it.end % (24 * 60))}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              {dayEvents.filter((e) => !e.time).map((e) => (
                <div key={e.id} className="mt-1.5 flex items-center gap-2 rounded-xl bg-surface-2 px-2.5 py-2 text-xs font-bold text-muted  ">
                  <span className="h-5 w-1 rounded-full" style={{ background: e.color }} />
                  <span className="flex-1 truncate">{e.title}</span>
                  <span className="text-[11px] text-muted">بدون ساعت</span>
                </div>
              ))}
            </div>
          </Card>

          {/* ۴. ردیاب عادت‌ها */}
          <Card>
            <CardHead title="ردیاب عادت‌ها" sub={isToday ? 'امروز را ثبت کن' : formatJalali(day)} action={<Link to="/habits" className="flex items-center gap-1 text-xs font-bold text-brand-ink hover:underline ">همه <ArrowLeft size={13} /></Link>} />
            <div className="space-y-2 px-5 pb-5">
              {activeHabits.length === 0 && <p className="rounded-2xl bg-surface-2 py-4 text-center text-xs text-muted ">عادت فعالی نداری — از بخش عادت‌ها بساز</p>}
              {activeHabits.map((h) => {
                const done = !!state.habitLogs[`${h.id}:${day}`];
                const streak = habitStreak(h.id, state.habitLogs);
                return (
                  <button
                    key={h.id}
                    onClick={() => toggleHabit(h.id, day)}
                    className={cx(
                      'flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-right transition active:scale-[0.99]',
                      done ? 'border-transparent bg-brand/10' : 'border-line hover:bg-surface-2  ',
                    )}
                  >
                    <span
                      className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full', done ? 'text-white' : 'text-transparent')}
                      style={{ background: done ? h.color : 'transparent', border: `2px solid ${h.color}` }}
                    >
                      <CheckIcon size={13} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cx('block truncate text-[13px] font-bold', done ? 'text-muted line-through' : 'text-ink-2 ')}>{h.title}</span>
                      {streak > 1 && <span className="flex items-center gap-1 text-[11px] font-bold text-warn-ink"><Flame size={11} />{toFa(streak)} روز پیاپی</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* نکته انگیزشی */}
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2.5 bg-gradient-to-l from-violet-700 to-purple-700 px-5 py-4 text-white">
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
      <p className="text-[11px] font-bold text-muted">{label}</p>
      <p className="num mt-0.5 truncate text-[15px] font-black text-ink ">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-muted">{sub}</p>
    </Card>
  );
}

/** بازتاب پایان روز — فقط فیلدهای مرتبط با حس و جمع‌بندی روز را ذخیره می‌کند */
function ReflectionCard({ day, reflection }: { day: number; reflection?: DayReflection; hasDayInfo?: boolean }) {
  const { patchReflection, deleteReflection } = useApp();
  const [mood, setMood] = useState<DayReflection['mood']>(reflection?.mood ?? 3);
  const [score, setScore] = useState<number | null>(reflection?.score ?? null);
  const [wins, setWins] = useState(reflection?.wins ?? '');
  const [improve, setImprove] = useState(reflection?.improve ?? '');
  const [lessons, setLessons] = useState(reflection?.lessons ?? '');
  const [gratitude, setGratitude] = useState(reflection?.gratitude ?? '');
  const [saved, setSaved] = useState(false);
  // مقداردهی اولیه از بازتاب همان روز انجام می‌شود؛ چون این کارت با key=روز ساخته می‌شود،
  // تغییر روز باعث ساخته‌شدن مجدد و خواندن مقادیر درست می‌شود (بدون افکت هم‌گام‌سازی).
  const save = () => {
    patchReflection(day, {
      mood,
      score,
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
            <button onClick={() => deleteReflection(day)} className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-muted transition hover:bg-danger/10 hover:text-danger-ink">
              <Trash2 size={13} /> پاک کردن بازتاب
            </button>
          ) : undefined
        }
      />
      <div className="space-y-3.5 px-5 pb-5">
        <div>
          <p className="mb-2 text-xs font-bold text-muted">امروزت چطور بود؟</p>
          <div className="flex gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m.v}
                onClick={() => setMood(m.v)}
                title={m.label}
                className={cx(
                  'flex h-12 flex-1 flex-col items-center justify-center rounded-2xl border-2 text-lg transition active:scale-95',
                  mood === m.v ? 'border-brand bg-brand/5' : 'border-line hover:border-line-strong ',
                )}
              >
                {m.emoji}
                <span className="text-[9px] font-bold text-muted">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-warn/15 bg-warn/[0.04] p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-ink-2 ">
            <Star size={13} className="text-warn-ink" /> نمره روز (۰ تا ۱۰ — با یک رقم اعشار)
          </p>
          <ScoreField value={score} onChange={setScore} />
          <p className="mt-2 text-[11px] text-muted">
            هم با نوار می‌توانی تنظیم کنی و هم عدد را دستی وارد کنی (مثلاً ۷٫۵). خالی گذاشتن یعنی «ثبت نشده».
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold text-muted">🏆 ۳ دستاورد / نکته مثبت امروز</p>
          <textarea value={wins} onChange={(e) => setWins(e.target.value)} rows={2} placeholder="سه چیز خوبی که امروز اتفاق افتاد…" className={cx(inputCls, 'h-auto py-2.5 leading-6')} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-muted">🔧 ۱ مورد قابل بهبود</p>
          <input value={improve} onChange={(e) => setImprove(e.target.value)} placeholder="فردا چه چیزی را بهتر می‌کنی؟" className={inputCls} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-muted">💡 ۱ درس آموخته‌شده</p>
          <textarea value={lessons} onChange={(e) => setLessons(e.target.value)} rows={2} placeholder="چه چیزی یاد گرفتی؟" className={cx(inputCls, 'h-auto py-2.5 leading-6')} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-muted">🙏 قدردانی</p>
          <input value={gratitude} onChange={(e) => setGratitude(e.target.value)} placeholder="بابت چه چیزی شکرگزاری؟" className={inputCls} />
        </div>
        <Btn onClick={save} className="w-full">
          {saved ? <><Check size={15} /> ذخیره شد ✓</> : <><MoonStar size={15} /> ذخیره بازتاب</>}
        </Btn>
        <p className="text-center text-[11px] text-muted">
          وضعیت فعلی: حال {moodLabel(mood)} • نمره {score != null ? `${formatScore(score)} از ۱۰` : 'ثبت نشده'}
        </p>
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

/** کارت اطلاعات پایه روز: خواب/بیداری (۲۴ ساعته)، ورزش، بیرون، یادداشت — ذخیره خودکار */
function DayBasicsCard({ day }: { day: number }) {
  const { state, patchReflection } = useApp();
  const ref = (state.reflections ?? []).find((r) => r.day === day);

  const [wake, setWake] = useState(ref?.wake ?? '');
  const [sleep, setSleep] = useState(ref?.sleep ?? '');
  const [sport, setSport] = useState(ref?.sport ?? false);
  const [sportType, setSportType] = useState(ref?.sportType ?? '');
  const [wentOut, setWentOut] = useState(ref?.wentOut ?? false);
  const [outPlace, setOutPlace] = useState(ref?.outPlace ?? '');
  const [dayNote, setDayNote] = useState(ref?.dayNote ?? '');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const basics = useMemo(
    () => ({
      wake: wake || undefined,
      sleep: sleep || undefined,
      sport,
      sportType: sportType.trim() || undefined,
      wentOut,
      outPlace: outPlace.trim() || undefined,
      dayNote: dayNote.trim() || undefined,
    }),
    [wake, sleep, sport, sportType, wentOut, outPlace, dayNote],
  );

  // ذخیره خودکار (با تأخیر کوتاه) — فقط فیلدهای همین کارت وصله می‌شوند تا داده دیگری از دست نرود
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const h = setTimeout(() => {
      patchReflection(day, basics);
      setSavedAt(Date.now());
    }, 700);
    return () => clearTimeout(h);
  }, [basics, day, patchReflection]);

  const sleepDur = wake && sleep ? calcSleepMinutes(wake, sleep) : null;

  return (
    <Card>
      <CardHead
        title="اطلاعات پایه روز"
        sub="ساعت‌ها ۲۴ ساعته (۰۰:۰۰ تا ۲۳:۵۹) و بدون AM/PM — ذخیره خودکار"
        action={savedAt ? <Badge tone="green"><Check size={11} /> ذخیره شد</Badge> : undefined}
      />
      <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-line p-3.5 ">
          <p className="mb-2 text-xs font-black text-muted">😴 خواب و بیداری</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-muted">
              بیداری
              <span className="mt-1 block"><TimeField value={wake} onChange={setWake} placeholder="۰۷:۰۰" /></span>
            </label>
            <label className="text-[11px] text-muted">
              خواب
              <span className="mt-1 block"><TimeField value={sleep} onChange={setSleep} placeholder="۲۳:۳۰" /></span>
            </label>
          </div>
          {sleepDur != null && (
            <p className="num mt-2 text-[11px] font-bold text-info-ink ">
              مدت خواب: حدود {toFa(Math.floor(sleepDur / 60))} ساعت{sleepDur % 60 ? ` و ${toFa(sleepDur % 60)} دقیقه` : ''}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-line p-3.5 ">
          <p className="mb-2 text-xs font-black text-muted">🏃 ورزش</p>
          <Segmented value={sport ? 'yes' : 'no'} onChange={(v) => setSport(v === 'yes')} options={[{ v: 'no', label: 'نه' }, { v: 'yes', label: 'بله' }]} />
          {sport && (
            <input value={sportType} onChange={(e) => setSportType(e.target.value)} placeholder="نوع فعالیت (مثلاً پیاده‌روی)…" className={cx(inputCls, 'mt-2 h-9 text-xs')} />
          )}
        </div>

        <div className="rounded-2xl border border-line p-3.5 ">
          <p className="mb-2 text-xs font-black text-muted">🚶 بیرون رفتن</p>
          <Segmented value={wentOut ? 'yes' : 'no'} onChange={(v) => setWentOut(v === 'yes')} options={[{ v: 'no', label: 'نه' }, { v: 'yes', label: 'بله' }]} />
          {wentOut && (
            <input value={outPlace} onChange={(e) => setOutPlace(e.target.value)} placeholder="کجا؟ (مثلاً پارک، خرید…)" className={cx(inputCls, 'mt-2 h-9 text-xs')} />
          )}
        </div>

        <div className="rounded-2xl border border-line p-3.5 sm:col-span-2 xl:col-span-3 ">
          <p className="mb-2 text-xs font-black text-muted">📝 توضیحات / یادداشت آزاد روز</p>
          <textarea value={dayNote} onChange={(e) => setDayNote(e.target.value)} rows={2} placeholder="هر نکته‌ای درباره امروز… (این متن در خروجی «تحلیل روزها» هم می‌آید)" className={cx(inputCls, 'h-auto py-2.5 text-xs leading-6')} />
        </div>
      </div>
    </Card>
  );
}

function calcSleepMinutes(wake: string, sleep: string): number | null {
  const wm = parseClock(wake);
  const sm = parseClock(sleep);
  if (wm == null || sm == null) return null;
  let diff = wm - sm;
  if (diff <= 0) diff += 24 * 60;
  return diff;
}
