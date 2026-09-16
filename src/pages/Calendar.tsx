import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Plus, Pencil, Trash2, Clock,
  CalendarDays, ListTodo, CheckCircle2,
} from 'lucide-react';
import { useApp } from '../lib/store';
import {
  getMonthGrid, addMonthsJalali, J_MONTHS, J_WEEKDAYS_SHORT, toJalaali,
  toFa, formatJalali, todayStart, toGregorian, startOfDay, addDays,
  weekdayName, diffDays, formatTime,
} from '../lib/jalali';
import { useNavigate } from 'react-router-dom';
import { Card, CardHead, Btn, Badge, Empty, Confirm, Segmented } from '../components/ui';
import { EventModal } from '../components/forms';
import type { CalEvent } from '../lib/types';
import { cx } from '../lib/utils';

type Mode = 'month' | 'agenda';

function useNavigateCal() {
  try {
    return useNavigate();
  } catch {
    return () => {};
  }
}

export default function Calendar() {
  const { state, deleteEvent, moveTask } = useApp();
  const navigate = useNavigateCal();
  const weekStart = state.settings.weekStart;
  const nowJ = toJalaali(new Date());
  const [jy, setJy] = useState(nowJ.jy);
  const [jm, setJm] = useState(nowJ.jm);
  const [sel, setSel] = useState<number>(todayStart());
  const [mode, setMode] = useState<Mode>('month');
  const [showM, setShowM] = useState(false);
  const [edit, setEdit] = useState<CalEvent | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const grid = useMemo(() => getMonthGrid(jy, jm, weekStart), [jy, jm, weekStart]);
  const weekLabels = useMemo(
    () => (weekStart === 'mon'
      ? ['د', 'س', 'چ', 'پ', 'ج', 'ش', 'ی']
      : J_WEEKDAYS_SHORT),
    [weekStart],
  );

  const eventsByDay = useMemo(() => {
    const m = new Map<number, CalEvent[]>();
    for (const e of state.events) {
      if (!m.has(e.day)) m.set(e.day, []);
      m.get(e.day)!.push(e);
    }
    for (const arr of m.values()) arr.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    return m;
  }, [state.events]);

  const tasksByDay = useMemo(() => {
    const m = new Map<number, typeof state.tasks>();
    for (const t of state.tasks) {
      if (t.due == null) continue;
      if (!m.has(t.due)) m.set(t.due, []);
      m.get(t.due)!.push(t);
    }
    return m;
  }, [state.tasks]);

  const shift = (d: number) => {
    const n = addMonthsJalali(jy, jm, d);
    setJy(n.jy); setJm(n.jm);
  };
  const goToday = () => {
    const j = toJalaali(new Date());
    setJy(j.jy); setJm(j.jm);
    setSel(todayStart());
  };

  const selEvents = eventsByDay.get(startOfDay(sel)) ?? [];
  const selTasks = tasksByDay.get(startOfDay(sel)) ?? [];

  // دستور کار ۱۴ روز آینده
  const agenda = useMemo(() => {
    const out: Array<{ day: number; events: CalEvent[]; tasks: typeof state.tasks }> = [];
    for (let i = 0; i < 14; i++) {
      const d = addDays(todayStart(), i);
      const ev = eventsByDay.get(d) ?? [];
      const tk = tasksByDay.get(d) ?? [];
      if (ev.length || tk.length) out.push({ day: d, events: ev, tasks: tk });
    }
    return out;
  }, [eventsByDay, tasksByDay]);

  const monthEventCount = useMemo(() => {
    let c = 0;
    for (const cell of grid) {
      if (cell.inMonth) c += (eventsByDay.get(cell.ts) ?? []).length;
    }
    return c;
  }, [grid, eventsByDay]);

  return (
    <div className="space-y-5">
      {/* هدر */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => shift(-1)} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5" title="ماه قبل">
            <ChevronRight size={18} />
          </button>
          <div className="min-w-0 flex-1 text-center sm:text-right">
            <h2 className="text-lg font-black text-slate-800 dark:text-white">{J_MONTHS[jm - 1]} {toFa(jy)}</h2>
            <p className="text-[11px] text-slate-400">{toFa(monthEventCount)} رویداد در این ماه</p>
          </div>
          <Segmented value={mode} onChange={setMode} options={[{ v: 'month', label: 'نمای ماه' }, { v: 'agenda', label: 'دستور کار' }]} />
          <Btn variant="soft" onClick={goToday}>امروز</Btn>
          <Btn onClick={() => { setEdit(null); setShowM(true); }}><Plus size={15} /> رویداد جدید</Btn>
          <button onClick={() => shift(1)} className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5" title="ماه بعد">
            <ChevronLeft size={18} />
          </button>
        </div>
      </Card>

      {mode === 'month' ? (
        <div className="grid items-start gap-5 xl:grid-cols-3">
          {/* گرید ماه */}
          <Card className="overflow-hidden p-3 sm:p-4 xl:col-span-2">
            <div className="grid grid-cols-7 gap-1">
              {weekLabels.map((w, i) => (
                <div key={w + i} className={cx('py-2 text-center text-[11px] font-black', (weekStart === 'sat' ? i === 6 : i === 5) ? 'text-rose-400' : 'text-slate-400')}>{w}</div>
              ))}
              {grid.map((cell, i) => {
                const evs = eventsByDay.get(cell.ts) ?? [];
                const tks = tasksByDay.get(cell.ts) ?? [];
                const done = tks.filter((t) => t.status === 'done').length;
                const isSel = startOfDay(sel) === cell.ts;
                const jsDay = new Date(cell.ts).getDay();
                const isWeekend = weekStart === 'sat' ? jsDay === 5 : jsDay === 4 || jsDay === 5;
                const ref = (state.reflections ?? []).find((r) => r.day === cell.ts);
                const score = ref?.score;
                return (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.004, 0.15) }}
                    onClick={() => setSel(cell.ts)}
                    onDoubleClick={() => navigate(`/today?day=${cell.ts}`)}
                    title="دابل‌کلیک: باز کردن صفحه روز"
                    className={cx(
                      'relative flex min-h-[64px] flex-col items-center rounded-2xl border p-1 transition-all sm:min-h-[88px] sm:p-1.5',
                      isSel
                        ? 'border-emerald-500 bg-emerald-500/[0.07] shadow-md shadow-emerald-500/10'
                        : cell.isToday
                          ? 'border-emerald-400/60 bg-emerald-50/50 dark:bg-emerald-500/10'
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-white/10 dark:hover:bg-white/5',
                      !cell.inMonth && 'opacity-35',
                      // هیت‌مپ نمره روز (سبز کم‌رنگ تا پررنگ)
                      score != null && cell.inMonth && !isSel && heatBg(score),
                    )}
                  >
                    <span className={cx(
                      'tabular grid h-7 w-7 place-items-center rounded-full text-[13px] font-black',
                      cell.isToday ? 'bg-emerald-500 text-white' : isWeekend && cell.inMonth ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200',
                    )}>
                      {toFa(cell.jd)}
                    </span>
                    {/* نسبت انجام تسک‌ها */}
                    {tks.length > 0 && (
                      <span className="tabular mt-0.5 text-[9px] font-black text-slate-400">
                        {done === tks.length ? `✅ ${toFa(done)}/${toFa(tks.length)}` : `${toFa(done)}/${toFa(tks.length)}`}
                      </span>
                    )}
                    {score != null && (
                      <span className="tabular rounded-full bg-amber-500/15 px-1.5 text-[9px] font-black text-amber-600 dark:text-amber-300">
                        ⭐{toFa(score)}
                      </span>
                    )}
                    <span className="mt-1 hidden w-full space-y-1 sm:block">
                      {evs.slice(0, 2).map((e) => (
                        <span key={e.id} className="flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: e.color }}>
                          <span className="truncate">{e.title}</span>
                        </span>
                      ))}
                      {tks.slice(0, 1).map((t) => (
                        <span key={t.id} className="flex items-center gap-1 truncate rounded-md bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                          <span className="truncate">✓ {t.title}</span>
                        </span>
                      ))}
                      {(evs.length + tks.length) > 3 && (
                        <span className="tabular block text-center text-[10px] font-bold text-slate-400">+{toFa(evs.length + tks.length - 3)}</span>
                      )}
                    </span>
                    {/* نقطه‌های موبایل */}
                    <span className="mt-1 flex gap-1 sm:hidden">
                      {evs.slice(0, 3).map((e) => (
                        <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ background: e.color }} />
                      ))}
                      {tks.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </Card>

          {/* پنل روز انتخابی */}
          <Card>
            <CardHead
              title={formatJalali(sel, { weekday: true })}
              sub={`${toFa(selEvents.length)} رویداد • ${toFa(selTasks.length)} سررسید`}
              action={<Btn size="sm" variant="soft" onClick={() => { setEdit(null); setShowM(true); }}><Plus size={14} /></Btn>}
            />
            <div className="max-h-[480px] space-y-2.5 overflow-y-auto px-5 pb-5">
              {selEvents.length === 0 && selTasks.length === 0 && (
                <Empty icon={<CalendarDays size={26} />} title="این روز خالی است" sub="رویداد یا سررسیدی برای این روز ثبت نشده" />
              )}
              {selEvents.map((e) => (
                <div key={e.id} className="group rounded-2xl border border-slate-100 p-3 transition hover:shadow-md dark:border-white/5">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1 h-10 w-1.5 shrink-0 rounded-full" style={{ background: e.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-extrabold text-slate-800 dark:text-slate-100">{e.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        {e.time && <span className="tabular inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-bold dark:bg-white/10"><Clock size={10} />{e.time}</span>}
                        {e.desc && <span>{e.desc}</span>}
                      </p>
                    </div>
                    <span className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
                      <button onClick={() => { setEdit(e); setShowM(true); }} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-sky-500/10 hover:text-sky-600"><Pencil size={13} /></button>
                      <button onClick={() => setConfirmId(e.id)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"><Trash2 size={13} /></button>
                    </span>
                  </div>
                </div>
              ))}
              {selTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2.5 rounded-2xl bg-slate-50 p-3 dark:bg-white/[0.03]">
                  <button
                    onClick={() => moveTask(t.id, t.status === 'done' ? 'todo' : 'done')}
                    className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition', t.status === 'done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-white/20')}
                  >
                    {t.status === 'done' && <CheckCircle2 size={13} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cx('truncate text-[13px] font-bold', t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200')}>{t.title}</p>
                    <p className="text-[11px] text-slate-400">سررسید وظیفه {t.status !== 'done' && diffDays(t.due!, Date.now()) < 0 ? '• عقب‌افتاده' : ''}</p>
                  </div>
                </div>
              ))}
              <Btn variant="outline" className="w-full" onClick={() => { setEdit(null); setShowM(true); }}>
                <Plus size={15} /> افزودن رویداد در این روز
              </Btn>
              <Btn variant="soft" className="w-full" onClick={() => navigate(`/today?day=${startOfDay(sel)}`)}>
                باز کردن صفحه این روز ←
              </Btn>
            </div>
          </Card>
        </div>
      ) : (
        /* دستور کار */
        <Card>
          <CardHead title="دستور کار ۱۴ روز آینده" sub="رویدادها و سررسیدها به ترتیب روز" />
          <div className="space-y-4 px-5 pb-5">
            {agenda.length === 0 && (
              <Empty icon={<CalendarDays size={26} />} title="برنامه‌ای در ۱۴ روز آینده نیست" sub="یک رویداد جدید بساز یا برای وظایف سررسید تعیین کن" action={<Btn onClick={() => { setEdit(null); setShowM(true); }}><Plus size={15} /> رویداد جدید</Btn>} />
            )}
            {agenda.map(({ day, events, tasks }) => (
              <div key={day} className="flex gap-3">
                <div className="flex w-14 shrink-0 flex-col items-center">
                  <span className={cx('tabular grid h-11 w-11 place-items-center rounded-2xl text-base font-black', day === todayStart() ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200')}>
                    {toFa(toJalaali(new Date(day)).jd)}
                  </span>
                  <span className="mt-1 text-[10px] font-bold text-slate-400">{weekdayName(day)}</span>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5 border-r-2 border-dashed border-slate-100 pr-3 dark:border-white/10">
                  <p className="text-[11px] font-bold text-slate-400">{formatJalali(day)} {day === todayStart() && <Badge tone="green">امروز</Badge>}</p>
                  {events.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 rounded-xl border border-slate-100 px-2.5 py-2 dark:border-white/5">
                      <span className="h-6 w-1 rounded-full" style={{ background: e.color }} />
                      <span className="flex-1 truncate text-xs font-bold text-slate-700 dark:text-slate-200">{e.title}</span>
                      {e.time && <span className="tabular text-[11px] text-slate-400">{e.time}</span>}
                    </div>
                  ))}
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2 dark:bg-white/[0.03]">
                      <ListTodo size={13} className="shrink-0 text-slate-400" />
                      <span className="flex-1 truncate text-xs font-bold text-slate-600 dark:text-slate-300">{t.title}</span>
                      <Badge tone={t.status === 'done' ? 'green' : 'slate'}>{t.status === 'done' ? 'انجام‌شده' : 'سررسید'}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <EventModal open={showM} onClose={() => setShowM(false)} edit={edit} presetDay={startOfDay(sel)} />
      <Confirm open={confirmId != null} onClose={() => setConfirmId(null)} onYes={() => confirmId && deleteEvent(confirmId)} title="حذف رویداد؟" desc="این رویداد از تقویم حذف می‌شود." />

      {/* راهنمای هیت‌مپ + مبدل تاریخ */}
      <Card>
        <CardHead title="راهنمای رنگ خانه‌ها" sub="هیت‌مپ نمره روز + نسبت انجام تسک‌ها" />
        <div className="flex flex-wrap items-center gap-3 px-5 pb-5 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-md bg-emerald-500/25" /> نمره بالا (۸–۱۰)</span>
          <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-md bg-emerald-500/10" /> نمره متوسط (۴–۷)</span>
          <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-md bg-slate-100 dark:bg-white/10" /> بدون نمره</span>
          <span className="flex items-center gap-1.5">✅ نسبت انجام‌شده/کل تسک‌های آن روز زیر عدد روز</span>
          <span className="flex items-center gap-1.5">⭐ نمره ثبت‌شده روز</span>
        </div>
      </Card>
      <Converter />
    </div>
  );
}

/** رنگ پس‌زمینه هیت‌مپ بر اساس نمره ۰ تا ۱۰ */
function heatBg(score: number): string {
  if (score >= 8) return 'bg-emerald-500/25 dark:bg-emerald-500/20';
  if (score >= 6) return 'bg-emerald-500/[0.16] dark:bg-emerald-500/10';
  if (score >= 4) return 'bg-emerald-500/[0.08]';
  return 'bg-slate-100/70 dark:bg-white/[0.04]';
}

function Converter() {
  const today = toJalaali(new Date());
  const [jy, setJy] = useState(today.jy);
  const [jm, setJm] = useState(today.jm);
  const [jd, setJd] = useState(today.jd);
  const g = useMemo(() => {
    try {
      const d = toGregorian(jy, jm, Math.min(jd, 29) <= 29 ? jd : jd);
      return d;
    } catch {
      return null;
    }
  }, [jy, jm, jd]);
  return (
    <Card>
      <CardHead title="مبدل تاریخ شمسی به میلادی" sub="هر تاریخی را تبدیل کن" />
      <div className="flex flex-wrap items-center gap-3 px-5 pb-5">
        <select value={jd} onChange={(e) => setJd(Number(e.target.value))} className="h-10 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-[13px] dark:border-white/10 dark:bg-white/5">
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{toFa(d)}</option>)}
        </select>
        <select value={jm} onChange={(e) => setJm(Number(e.target.value))} className="h-10 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-[13px] dark:border-white/10 dark:bg-white/5">
          {J_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={jy} onChange={(e) => setJy(Number(e.target.value))} className="h-10 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-[13px] dark:border-white/10 dark:bg-white/5">
          {Array.from({ length: 11 }, (_, i) => today.jy - 5 + i).map((y) => <option key={y} value={y}>{toFa(y)}</option>)}
        </select>
        <span className="text-slate-300">←</span>
        <span className="tabular rounded-xl bg-slate-100 px-4 py-2.5 text-[13px] font-black text-slate-700 dark:bg-white/10 dark:text-slate-100" dir="ltr">
          {g ? `${g.getFullYear()}/${String(g.getMonth() + 1).padStart(2, '0')}/${String(g.getDate()).padStart(2, '0')}` : '—'}
        </span>
        <span className="text-xs text-slate-400">{g ? `(${weekdayName(g.getTime())} • ${formatTime(g.getTime()).replace(/[۰-۹]/g, (d) => d)} — ${['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'][g.getDay()]})` : ''}</span>
      </div>
    </Card>
  );
}
