import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Plus, Pencil, Trash2, Clock,
  CalendarDays, ListTodo, CheckCircle2,
} from 'lucide-react';
import { useApp } from '../lib/store';
import {
  getMonthGrid, addMonthsJalali, J_MONTHS, J_WEEKDAYS_SHORT, toJalaali,
  toFa, formatJalali, formatScore, todayStart, toGregorian, startOfDay, addDays,
  weekdayName, diffDays, jalaaliMonthLength, formatGregorian,
} from '../lib/jalali';
import { useNavigate } from 'react-router-dom';
import { Card, CardHead, Btn, Badge, Empty, Confirm, Segmented } from '../components/ui';
import { EventModal } from '../components/forms';
import { SCORE_LEGEND, scoreHeatClass } from '../lib/display';
import type { CalEvent, DayReflection, Task } from '../lib/types';
import { cx } from '../lib/utils';

type Mode = 'month' | 'agenda';

export default function Calendar() {
  const { state, deleteEvent, moveTask } = useApp();
  const navigate = useNavigate();
  const weekStart = state.settings.weekStart;
  const nowJ = toJalaali(new Date());
  const [jy, setJy] = useState(nowJ.jy);
  const [jm, setJm] = useState(nowJ.jm);
  const [sel, setSel] = useState<number>(todayStart());
  const [mode, setMode] = useState<Mode>('month');
  const todayTs = useMemo(() => todayStart(), []);
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
    const m = new Map<number, Task[]>();
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
    const j = toJalaali(new Date(todayTs));
    setJy(j.jy); setJm(j.jm);
    setSel(todayTs);
  };

  const selTs = startOfDay(sel);
  const selEvents = eventsByDay.get(selTs) ?? [];
  const selTasks = tasksByDay.get(selTs) ?? [];

  // دستور کار ۱۴ روز آینده
  const agenda = useMemo(() => {
    const out: Array<{ day: number; events: CalEvent[]; tasks: Task[] }> = [];
    for (let i = 0; i < 14; i++) {
      const d = addDays(todayTs, i);
      const ev = eventsByDay.get(d) ?? [];
      const tk = tasksByDay.get(d) ?? [];
      if (ev.length || tk.length) out.push({ day: d, events: ev, tasks: tk });
    }
    return out;
  }, [eventsByDay, tasksByDay, todayTs]);

  /** بازتاب‌های روزانه به‌صورت نقشه — برای جلوگیری از جست‌وجوی مکرر در هر خانه تقویم */
  const refByDay = useMemo(() => {
    const m = new Map<number, DayReflection>();
    for (const r of state.reflections ?? []) m.set(r.day, r);
    return m;
  }, [state.reflections]);

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
          <button onClick={() => shift(-1)} className="grid grid-cols-1 h-10 w-10 place-items-center rounded-2xl border border-line transition hover:bg-surface-2  " title="ماه قبل">
            <ChevronRight size={18} />
          </button>
          <div className="min-w-0 flex-1 text-center sm:text-right">
            <h2 className="text-lg font-black text-ink ">{J_MONTHS[jm - 1]} {toFa(jy)}</h2>
            <p className="text-[11px] text-muted">{toFa(monthEventCount)} رویداد در این ماه</p>
          </div>
          <Segmented value={mode} onChange={setMode} options={[{ v: 'month', label: 'نمای ماه' }, { v: 'agenda', label: 'دستور کار' }]} />
          <Btn variant="soft" onClick={goToday}>امروز</Btn>
          <Btn onClick={() => { setEdit(null); setShowM(true); }}><Plus size={15} /> رویداد جدید</Btn>
          <button onClick={() => shift(1)} className="grid grid-cols-1 h-10 w-10 place-items-center rounded-2xl border border-line transition hover:bg-surface-2  " title="ماه بعد">
            <ChevronLeft size={18} />
          </button>
        </div>
      </Card>

      {mode === 'month' ? (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
          {/* گرید ماه */}
          <Card className="overflow-hidden p-3 sm:p-4 xl:col-span-2">
            <div className="grid grid-cols-7 gap-1">
              {weekLabels.map((w, i) => (
                <div key={w + i} className={cx('py-2 text-center text-[11px] font-black', (weekStart === 'sat' ? i === 6 : i === 5) ? 'text-danger-ink' : 'text-muted')}>{w}</div>
              ))}
              {grid.map((cell, i) => {
                const evs = eventsByDay.get(cell.ts) ?? [];
                const tks = tasksByDay.get(cell.ts) ?? [];
                const done = tks.filter((t) => t.status === 'done').length;
                const isSel = startOfDay(sel) === cell.ts;
                const jsDay = new Date(cell.ts).getDay();
                const isWeekend = weekStart === 'sat' ? jsDay === 5 : jsDay === 4 || jsDay === 5;
                const ref = refByDay.get(cell.ts);
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
                        ? 'border-brand bg-brand/[0.07] shadow-md shadow-brand/10'
                        : cell.isToday
                          ? 'border-brand/60 bg-brand/50 '
                          : 'border-transparent hover:border-line-strong hover:bg-surface-2  ',
                      !cell.inMonth && 'opacity-35',
                      // هیت‌مپ نمره روز (سبز کم‌رنگ تا پررنگ)
                      score != null && cell.inMonth && !isSel && scoreHeatClass(score),
                    )}
                  >
                    <span className={cx(
                      'num grid h-7 w-7 place-items-center rounded-full text-[13px] font-black',
                      cell.isToday ? 'bg-brand text-white' : isWeekend && cell.inMonth ? 'text-danger-ink' : 'text-ink-2 ',
                    )}>
                      {toFa(cell.jd)}
                    </span>
                    {/* نسبت انجام تسک‌ها */}
                    {tks.length > 0 && (
                      <span className="num mt-0.5 text-[9px] font-black text-muted">
                        {done === tks.length ? `✅ ${toFa(done)}/${toFa(tks.length)}` : `${toFa(done)}/${toFa(tks.length)}`}
                      </span>
                    )}
                    {score != null && (
                      <span className="num rounded-full bg-warn/15 px-1.5 text-[9px] font-black text-warn-ink ">
                        ⭐{formatScore(score)}
                      </span>
                    )}
                    <span className="mt-1 hidden w-full space-y-1 sm:block">
                      {evs.slice(0, 2).map((e) => (
                        <span key={e.id} className="flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: e.color }}>
                          <span className="truncate">{e.title}</span>
                        </span>
                      ))}
                      {tks.slice(0, 1).map((t) => (
                        <span key={t.id} className="flex items-center gap-1 truncate rounded-md bg-sunken px-1.5 py-0.5 text-[11px] font-bold text-ink-2  ">
                          <span className="truncate">✓ {t.title}</span>
                        </span>
                      ))}
                      {(evs.length + tks.length) > 3 && (
                        <span className="num block text-center text-[11px] font-bold text-muted">+{toFa(evs.length + tks.length - 3)}</span>
                      )}
                    </span>
                    {/* نقطه‌های موبایل */}
                    <span className="mt-1 flex gap-1 sm:hidden">
                      {evs.slice(0, 3).map((e) => (
                        <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ background: e.color }} />
                      ))}
                      {tks.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-muted" />}
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
                <div key={e.id} className="group rounded-2xl border border-line p-3 transition hover:shadow-md ">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1 h-10 w-1.5 shrink-0 rounded-full" style={{ background: e.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-extrabold text-ink ">{e.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                        {e.time && <span className="num inline-flex items-center gap-1 rounded-md bg-sunken px-1.5 py-0.5 font-bold "><Clock size={10} />{e.time}</span>}
                        {e.desc && <span>{e.desc}</span>}
                      </p>
                    </div>
                    <span className="flex shrink-0 gap-0.5 transition">
                      <button onClick={() => { setEdit(e); setShowM(true); }} className="grid grid-cols-1 h-7 w-7 place-items-center rounded-lg text-muted hover:bg-info/10 hover:text-info-ink"><Pencil size={13} /></button>
                      <button onClick={() => setConfirmId(e.id)} className="grid grid-cols-1 h-7 w-7 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger-ink"><Trash2 size={13} /></button>
                    </span>
                  </div>
                </div>
              ))}
              {selTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2.5 rounded-2xl bg-surface-2 p-3 dark:bg-white/[0.03]">
                  <button
                    onClick={() => moveTask(t.id, t.status === 'done' ? 'todo' : 'done')}
                    className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition', t.status === 'done' ? 'border-brand bg-brand text-white' : 'border-line-strong ')}
                  >
                    {t.status === 'done' && <CheckCircle2 size={13} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cx('truncate text-[13px] font-bold', t.status === 'done' ? 'text-muted line-through' : 'text-ink-2 ')}>{t.title}</p>
                    <p className="text-[11px] text-muted">سررسید وظیفه {t.status !== 'done' && diffDays(t.due!, todayTs) < 0 ? '• عقب‌افتاده' : ''}</p>
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
                  <span className={cx('num grid h-11 w-11 place-items-center rounded-2xl text-base font-black', day === todayStart() ? 'bg-brand text-white shadow-md shadow-brand/30' : 'bg-sunken text-ink-2  ')}>
                    {toFa(toJalaali(new Date(day)).jd)}
                  </span>
                  <span className="mt-1 text-[11px] font-bold text-muted">{weekdayName(day)}</span>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5 border-r-2 border-dashed border-line pr-3 ">
                  <p className="text-[11px] font-bold text-muted">{formatJalali(day)} {day === todayStart() && <Badge tone="green">امروز</Badge>}</p>
                  {events.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 rounded-xl border border-line px-2.5 py-2 ">
                      <span className="h-6 w-1 rounded-full" style={{ background: e.color }} />
                      <span className="flex-1 truncate text-xs font-bold text-ink-2 ">{e.title}</span>
                      {e.time && <span className="num text-[11px] text-muted">{e.time}</span>}
                    </div>
                  ))}
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-2.5 py-2 dark:bg-white/[0.03]">
                      <ListTodo size={13} className="shrink-0 text-muted" />
                      <span className="flex-1 truncate text-xs font-bold text-ink-2 ">{t.title}</span>
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
        <div className="flex flex-wrap items-center gap-3 px-5 pb-5 text-[11px] text-muted">
          <span className="font-bold">راهنمای رنگ نمره:</span>
          {SCORE_LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className={cx('h-4 w-4 rounded-md', l.cls)} /> {l.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-md bg-sunken " /> بدون نمره</span>
          <span className="flex items-center gap-1.5">✅ نسبت انجام‌شده/کل تسک‌های آن روز زیر عدد روز</span>
          <span className="flex items-center gap-1.5">⭐ نمره ثبت‌شده روز</span>
        </div>
      </Card>
      <Converter />
    </div>
  );
}

function Converter() {
  const today = toJalaali(new Date());
  const [jy, setJy] = useState(today.jy);
  const [jm, setJm] = useState(today.jm);
  const [jd, setJd] = useState(today.jd);
  // تعداد روزهای واقعی ماه انتخابی (جلوی تاریخ نامعتبر مثل ۳۱ اسفند گرفته می‌شود)
  const monthLen = jalaaliMonthLength(jy, jm);
  const g = useMemo(() => {
    try {
      return toGregorian(jy, jm, Math.min(jd, jalaaliMonthLength(jy, jm)));
    } catch {
      return null;
    }
  }, [jy, jm, jd]);
  const pickMonth = (m: number) => {
    setJm(m);
    setJd((d) => Math.min(d, jalaaliMonthLength(jy, m)));
  };
  const pickYear = (y: number) => {
    setJy(y);
    setJd((d) => Math.min(d, jalaaliMonthLength(y, jm)));
  };
  return (
    <Card>
      <CardHead title="مبدل تاریخ شمسی به میلادی" sub="هر تاریخی را تبدیل کن" />
      <div className="flex flex-wrap items-center gap-3 px-5 pb-5">
        <select value={Math.min(jd, monthLen)} onChange={(e) => setJd(Number(e.target.value))} className="h-10 rounded-xl border border-line bg-surface-2 px-3 text-[13px]  ">
          {Array.from({ length: monthLen }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{toFa(d)}</option>)}
        </select>
        <select value={jm} onChange={(e) => pickMonth(Number(e.target.value))} className="h-10 rounded-xl border border-line bg-surface-2 px-3 text-[13px]  ">
          {J_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={jy} onChange={(e) => pickYear(Number(e.target.value))} className="h-10 rounded-xl border border-line bg-surface-2 px-3 text-[13px]  ">
          {Array.from({ length: 11 }, (_, i) => today.jy - 5 + i).map((y) => <option key={y} value={y}>{toFa(y)}</option>)}
        </select>
        <span className="text-muted">←</span>
        <span className="num rounded-xl bg-sunken px-4 py-2.5 text-[13px] font-black text-ink-2  " dir="ltr">
          {g ? `${g.getFullYear()}/${String(g.getMonth() + 1).padStart(2, '0')}/${String(g.getDate()).padStart(2, '0')}` : '—'}
        </span>
        <span className="text-xs text-muted">
          {g ? `(${weekdayName(g.getTime())} • ${formatGregorian(g.getTime())})` : ''}
        </span>
      </div>
    </Card>
  );
}
