import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Flame, Pencil, Trash2, Trophy, Target, CalendarCheck2, Sparkles,
  Archive, ArchiveRestore, ChevronDown,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { Card, CardHead, Btn, Empty, Progress, Confirm } from '../components/ui';
import { HabitModal } from '../components/forms';
import type { Habit } from '../lib/types';
import { cx } from '../lib/utils';
import {
  toFa, todayStart, addDays, J_WEEKDAYS_SHORT, persianWeekday,
  toJalaali, formatJalali,
} from '../lib/jalali';
import { habitStreak, habitWeekCount, habitTotalCount } from '../lib/stats';

export default function Habits() {
  const { state, toggleHabit, deleteHabit, setHabitArchived } = useApp();
  const [showM, setShowM] = useState(false);
  const [edit, setEdit] = useState<Habit | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const today = todayStart();

  const activeHabits = useMemo(() => state.habits.filter((h) => !h.archived), [state.habits]);
  const archivedHabits = useMemo(() => state.habits.filter((h) => h.archived), [state.habits]);

  // ۷ روز اخیر برای هیت‌مپ (شنبه تا امروز)
  const weekDays = useMemo(() => {
    const arr: number[] = [];
    for (let i = 6; i >= 0; i--) arr.push(addDays(today, -i));
    return arr;
  }, [today]);

  const stats = useMemo(() => {
    const doneToday = activeHabits.filter((h) => state.habitLogs[`${h.id}:${today}`]).length;
    const totalChecks = Object.values(state.habitLogs).filter(Boolean).length;
    const best = activeHabits.reduce((a, h) => Math.max(a, habitStreak(h.id, state.habitLogs)), 0);
    return { doneToday, total: activeHabits.length, totalChecks, best };
  }, [activeHabits, state.habitLogs, today]);

  const sorted = useMemo(() => {
    return [...activeHabits].sort((a, b) => {
      const sa = habitStreak(a.id, state.habitLogs);
      const sb = habitStreak(b.id, state.habitLogs);
      const da = state.habitLogs[`${a.id}:${today}`] ? 0 : 1;
      const db = state.habitLogs[`${b.id}:${today}`] ? 0 : 1;
      return da - db || sb - sa;
    });
  }, [activeHabits, state.habitLogs, today]);

  // هیت‌مپ ۵ هفته اخیر
  const heatmap = useMemo(() => {
    const weeks: number[][] = [];
    // شروع از شنبه ۴ هفته پیش
    let cursor = addDays(today, -27);
    while (persianWeekday(cursor) !== 0) cursor = addDays(cursor, -1);
    for (let w = 0; w < 5; w++) {
      const row: number[] = [];
      for (let d = 0; d < 7; d++) {
        row.push(addDays(cursor, w * 7 + d));
      }
      weeks.push(row);
    }
    return weeks;
  }, [today]);

  const heatVal = (day: number) => {
    if (activeHabits.length === 0) return 0;
    const done = activeHabits.filter((h) => state.habitLogs[`${h.id}:${day}`]).length;
    return done / activeHabits.length;
  };

  return (
    <div className="space-y-5">
      {/* خلاصه */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MiniStat icon={<CalendarCheck2 size={18} />} label="انجام‌شده امروز" value={`${toFa(stats.doneToday)} از ${toFa(stats.total)}`} color="from-emerald-500 to-teal-600" />
        <MiniStat icon={<Flame size={18} />} label="بهترین استریک" value={`${toFa(stats.best)} روز`} color="from-orange-500 to-rose-500" />
        <MiniStat icon={<Target size={18} />} label="کل تیک‌ها" value={`${toFa(stats.totalChecks)} بار`} color="from-sky-500 to-blue-600" />
        <MiniStat icon={<Trophy size={18} />} label="نرخ موفقیت هفته" value={`${toFa(weekRate(state.habitLogs, activeHabits))}٪`} color="from-violet-500 to-purple-600" />
      </div>

      <Card>
        <CardHead
          title="عادت‌های من"
          sub="هر روز با یک کلیک ثبت کن — زنجیره را نشکن!"
          action={<Btn onClick={() => { setEdit(null); setShowM(true); }}><Plus size={15} /> عادت جدید</Btn>}
        />
        {activeHabits.length === 0 ? (
          <Empty
            icon={<Flame size={26} />}
            title="عادت فعالی نداری"
            sub="با یک عادت کوچک و آسان شروع کن؛ مثلاً «روزی یک لیوان آب بیشتر»"
            action={<Btn onClick={() => { setEdit(null); setShowM(true); }}><Plus size={15} /> ساخت عادت</Btn>}
          />
        ) : (
          <div className="space-y-3 px-5 pb-5">
            {sorted.map((h, i) => (
              <HabitRow
                key={h.id}
                h={h}
                index={i}
                weekDays={weekDays}
                onToggle={(d) => toggleHabit(h.id, d)}
                onEdit={() => { setEdit(h); setShowM(true); }}
                onDelete={() => setConfirmId(h.id)}
                onArchive={() => setHabitArchived(h.id, true)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* بایگانی‌شده‌ها */}
      {archivedHabits.length > 0 && (
        <Card>
          <button onClick={() => setShowArchived((v) => !v)} className="flex w-full items-center gap-2 px-5 py-4 text-right">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300">
              <Archive size={17} />
            </span>
            <span className="flex-1">
              <span className="block text-[13px] font-black text-slate-700 dark:text-slate-200">
                عادت‌های بایگانی‌شده ({toFa(archivedHabits.length)})
              </span>
              <span className="block text-[11px] text-slate-400">مخفی از ردیاب روزانه — سوابقشان حفظ شده است</span>
            </span>
            <motion.span animate={{ rotate: showArchived ? 180 : 0 }} className="text-slate-400">
              <ChevronDown size={18} />
            </motion.span>
          </button>
          {showArchived && (
            <ul className="space-y-1.5 px-5 pb-5">
              {archivedHabits.map((h) => (
                <li key={h.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2.5 opacity-70 dark:border-white/5">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: h.color }} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-600 dark:text-slate-300">{h.title}</span>
                  <button
                    onClick={() => setHabitArchived(h.id, false)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-emerald-600 transition hover:bg-emerald-500/10"
                    title="بازگرداندن به عادت‌های فعال"
                  >
                    <ArchiveRestore size={13} /> بازگردانی
                  </button>
                  <button onClick={() => setConfirmId(h.id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-500" title="حذف کامل">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* هیت‌مپ */}
      {activeHabits.length > 0 && (
        <Card>
          <CardHead title="نقشه حرارتی ۵ هفته اخیر" sub="هرچه پررنگ‌تر، روز پربارتر" />
          <div className="overflow-x-auto px-5 pb-5">
            <div className="flex min-w-[420px] gap-1.5" dir="ltr">
              {heatmap.map((week, wi) => (
                <div key={wi} className="flex flex-1 flex-col gap-1.5">
                  {week.map((day) => {
                    const v = day > today ? -1 : heatVal(day);
                    const isToday = day === today;
                    return (
                      <div
                        key={day}
                        title={`${formatJalali(day)} — ${toFa(Math.round(v * 100))}٪`}
                        className={cx(
                          'aspect-square w-full rounded-md transition',
                          v < 0 ? 'bg-transparent'
                            : v === 0 ? 'bg-slate-100 dark:bg-white/5'
                            : v < 0.4 ? 'bg-emerald-200 dark:bg-emerald-900'
                            : v < 0.7 ? 'bg-emerald-300 dark:bg-emerald-700'
                            : v < 1 ? 'bg-emerald-400 dark:bg-emerald-500'
                            : 'bg-emerald-500 dark:bg-emerald-400',
                          isToday && 'ring-2 ring-slate-800 dark:ring-white',
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex gap-3" dir="rtl">
                {J_WEEKDAYS_SHORT.map((w, i) => (
                  <span key={i} className="font-bold">{w}</span>
                ))}
              </span>
              <span className="flex items-center gap-1.5" dir="ltr">
                کمتر
                <span className="flex gap-1">
                  <span className="h-3 w-3 rounded bg-slate-100 dark:bg-white/10" />
                  <span className="h-3 w-3 rounded bg-emerald-200" />
                  <span className="h-3 w-3 rounded bg-emerald-400" />
                  <span className="h-3 w-3 rounded bg-emerald-600" />
                </span>
                بیشتر
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* انگیزشی */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 bg-gradient-to-l from-amber-500 to-orange-600 px-5 py-4 text-white">
          <Sparkles size={20} />
          <div>
            <h3 className="text-sm font-black">قانون «هرگز دو بار پشت سر هم جا نزن»</h3>
            <p className="mt-0.5 text-[11px] text-amber-100">یک روز جا انداختن اتفاق است؛ دو روز پشت سر هم، شروع یک عادت بد جدید.</p>
          </div>
        </div>
      </Card>

      <HabitModal open={showM} onClose={() => setShowM(false)} edit={edit} />
      <Confirm open={confirmId != null} onClose={() => setConfirmId(null)} onYes={() => confirmId && deleteHabit(confirmId)} title="حذف عادت؟" desc="عادت و تمام سوابق ثبت‌شده آن حذف می‌شود." />
    </div>
  );
}

function weekRate(logs: Record<string, boolean>, habits: Habit[]): number {
  if (habits.length === 0) return 0;
  const today = todayStart();
  let done = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, -i);
    done += habits.filter((h) => logs[`${h.id}:${d}`]).length;
  }
  return Math.round((done / (7 * habits.length)) * 100);
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md', color)}>{icon}</span>
      <span>
        <span className="tabular block text-base font-black text-slate-800 dark:text-white">{value}</span>
        <span className="block text-[11px] font-bold text-slate-400">{label}</span>
      </span>
    </Card>
  );
}

function HabitRow({
  h, index, weekDays, onToggle, onEdit, onDelete, onArchive,
}: {
  h: Habit;
  index: number;
  weekDays: number[];
  onToggle: (d: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
}) {
  const { state } = useApp();
  const today = todayStart();
  const streak = habitStreak(h.id, state.habitLogs);
  const week = habitWeekCount(h.id, state.habitLogs);
  const total = habitTotalCount(h.id, state.habitLogs);
  const pct = Math.min(100, Math.round((week / h.targetPerWeek) * 100));
  const doneToday = !!state.habitLogs[`${h.id}:${today}`];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
      className={cx(
        'group rounded-2xl border p-4 transition',
        doneToday ? 'border-emerald-500/25 bg-emerald-500/[0.04]' : 'border-slate-100 hover:border-slate-200 dark:border-white/5',
      )}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => onToggle(today)}
          title={doneToday ? 'برداشتن تیک امروز' : 'ثبت انجام امروز'}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-md transition active:scale-90"
          style={{ background: doneToday ? h.color : `${h.color}35`, color: doneToday ? '#fff' : h.color }}
        >
          {doneToday ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          ) : (
            <Flame size={22} />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className={cx('truncate text-sm font-black', doneToday ? 'text-slate-500' : 'text-slate-800 dark:text-slate-100')}>{h.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-400">
            {streak > 0 && <span className="inline-flex items-center gap-1 text-orange-500"><Flame size={11} />{toFa(streak)} روز پیاپی</span>}
            <span>{toFa(week)} از {toFa(h.targetPerWeek)} این هفته</span>
            <span>• مجموع {toFa(total)} بار</span>
          </p>
        </div>
        <span className="flex shrink-0 gap-0.5 transition sm:opacity-0 sm:group-hover:opacity-100">
          <button onClick={onArchive} title="بایگانی (مخفی از ردیاب روزانه، بدون حذف سوابق)" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-amber-500/10 hover:text-amber-600"><Archive size={14} /></button>
          <button onClick={onEdit} title="ویرایش" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-sky-500/10 hover:text-sky-600"><Pencil size={14} /></button>
          <button onClick={onDelete} title="حذف" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"><Trash2 size={14} /></button>
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex flex-1 gap-1.5">
          {weekDays.map((d) => {
            const done = !!state.habitLogs[`${h.id}:${d}`];
            const isToday = d === today;
            const jj = toJalaali(new Date(d));
            return (
              <button
                key={d}
                onClick={() => onToggle(d)}
                title={`${formatJalali(d)} — ${done ? 'انجام شده' : 'انجام نشده'}`}
                className={cx(
                  'flex h-11 flex-1 flex-col items-center justify-center rounded-xl border text-[10px] font-black transition active:scale-95',
                  done
                    ? 'border-transparent text-white'
                    : isToday
                      ? 'border-dashed border-slate-300 text-slate-400 hover:border-slate-400 dark:border-white/20'
                      : 'border-slate-100 text-slate-400 hover:border-slate-300 dark:border-white/5',
                )}
                style={done ? { background: h.color } : undefined}
              >
                <span>{J_WEEKDAYS_SHORT[(new Date(d).getDay() + 1) % 7]}</span>
                <span className="tabular">{toFa(jj.jd)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <Progress value={pct} color={h.color} h={6} />
        <span className="tabular shrink-0 text-[11px] font-black text-slate-400">{toFa(pct)}٪</span>
      </div>
    </motion.div>
  );
}
