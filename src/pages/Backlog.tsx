import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Search, Inbox, CalendarPlus, Check, Pencil, Trash2,
  ChevronDown, Flag, Clock, ArrowRight, LayoutGrid, List as ListIcon,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { PRIORITY_META, type Task, type TaskPriority } from '../lib/types';
import { Card, Btn, Badge, Empty, inputCls, Confirm, Segmented } from '../components/ui';
import { TaskModal, JalaliDateField, eisenColor, eisenLabel, eisenOf } from '../components/forms';
import { CheckIcon } from './Dashboard';
import { cx } from '../lib/utils';
import { toFa, formatJalali, formatJalaliShort, todayStart, addDays, startOfDay } from '../lib/jalali';

type PriF = 'all' | TaskPriority;
type SortK = 'priority' | 'newest' | 'deadline';
type ViewM = 'list' | 'matrix';

export default function Backlog() {
  const { state, moveTask, updateTask, deleteTask, addTask } = useApp();
  const [q, setQ] = useState('');
  const [priF, setPriF] = useState<PriF>('all');
  const [catF, setCatF] = useState<string>('همه');
  const [sort, setSort] = useState<SortK>('priority');
  const [view, setView] = useState<ViewM>('list');
  const [showM, setShowM] = useState(false);
  const [edit, setEdit] = useState<Task | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [schedDay, setSchedDay] = useState<number | null>(todayStart());
  const [quick, setQuick] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const quickRef = useRef<HTMLInputElement>(null);

  // N برای آیتم جدید
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) return;
      if (showM || scheduleId) return;
      if (e.key === 'n' || e.key === 'N' || e.key === 'ی') {
        e.preventDefault();
        setEdit(null); setShowM(true);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [showM, scheduleId]);

  const cats = useMemo(() => {
    const s = new Set<string>();
    for (const t of state.tasks) if (t.backlog) for (const tg of t.tags) s.add(tg);
    return ['همه', ...[...s].sort()];
  }, [state.tasks]);

  const items = useMemo(() => {
    let arr = state.tasks.filter((t) => t.backlog);
    const needle = q.trim();
    if (needle) arr = arr.filter((t) => t.title.includes(needle) || (t.desc ?? '').includes(needle) || t.tags.some((x) => x.includes(needle)));
    if (priF !== 'all') arr = arr.filter((t) => t.priority === priF);
    if (catF !== 'همه') arr = arr.filter((t) => t.tags.includes(catF));
    const pw = { high: 0, medium: 1, low: 2 };
    const by: Record<SortK, (a: Task, b: Task) => number> = {
      priority: (a, b) => pw[a.priority] - pw[b.priority] || b.createdAt - a.createdAt,
      newest: (a, b) => b.createdAt - a.createdAt,
      deadline: (a, b) => (a.deadline ?? 9e15) - (b.deadline ?? 9e15) || pw[a.priority] - pw[b.priority],
    };
    return [...arr].sort(by[sort]);
  }, [state.tasks, q, priF, catF, sort]);

  const openCount = items.filter((t) => t.status !== 'done').length;

  const quickAdd = () => {
    const title = quick.trim();
    if (!title) return;
    addTask({ title, status: 'todo', priority: 'medium', tags: [], due: null, backlog: true, subtasks: [] });
    setQuick('');
    quickRef.current?.focus();
  };

  const doSchedule = () => {
    if (!scheduleId || schedDay == null) return;
    updateTask(scheduleId, { due: startOfDay(schedDay), backlog: false });
    setScheduleId(null);
  };

  const schedTask = scheduleId ? state.tasks.find((t) => t.id === scheduleId) : null;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 bg-gradient-to-l from-slate-700 to-slate-900 px-5 py-4 text-white">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10"><Inbox size={22} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black">بک‌لاگ — صندوق ایده‌ها و کارهای آینده</h2>
            <p className="mt-0.5 text-[11px] text-slate-300">{toFa(openCount)} آیتم باز • هر وقت آماده شدی، زمان‌بندی‌اش کن</p>
          </div>
          <Btn onClick={() => { setEdit(null); setShowM(true); }} className="!bg-white !text-slate-800 hover:!bg-slate-100">
            <Plus size={15} /> آیتم جدید
          </Btn>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3.5">
          <div className="flex min-w-[220px] flex-1 gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو در بک‌لاگ…" className={cx(inputCls, 'pr-9')} />
            </div>
            <input
              ref={quickRef}
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); quickAdd(); } }}
              placeholder="ایده سریع + Enter…"
              className={cx(inputCls, 'hidden sm:block')}
            />
            <select value={catF} onChange={(e) => setCatF(e.target.value)} className={cx(inputCls, 'hidden w-auto md:block')} title="فیلتر دسته">
              {cats.map((c) => <option key={c} value={c}>{c === 'همه' ? 'همه دسته‌ها' : `#${c}`}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortK)} className={cx(inputCls, 'hidden w-auto md:block')} title="مرتب‌سازی">
              <option value="priority">اولویت</option>
              <option value="newest">جدیدترین</option>
              <option value="deadline">ددلاین</option>
            </select>
          </div>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { v: 'list', label: 'لیست', icon: <ListIcon size={13} /> },
              { v: 'matrix', label: 'ماتریس آیزنهاور', icon: <LayoutGrid size={13} /> },
            ]}
          />
          <Segmented
            value={priF}
            onChange={setPriF}
            options={[
              { v: 'all', label: 'همه' },
              { v: 'high', label: 'مهم' },
              { v: 'medium', label: 'متوسط' },
              { v: 'low', label: 'عادی' },
            ]}
          />
        </div>
      </Card>

      {view === 'matrix' ? (
        <EisenMatrix
          items={items}
          dragId={dragId}
          setDragId={setDragId}
          onToggle={(id) => { const t = items.find((x) => x.id === id); if (t) moveTask(id, t.status === 'done' ? 'todo' : 'done'); }}
          onEdit={(t) => { setEdit(t); setShowM(true); }}
          onDelete={setConfirmId}
          onSchedule={(t) => { setScheduleId(t.id); setSchedDay(todayStart()); }}
        />
      ) : items.length === 0 ? (
        <Card>
          <Empty
            icon={<Inbox size={26} />}
            title={state.tasks.some((t) => t.backlog) ? 'چیزی پیدا نشد' : 'بک‌لاگ خالی است'}
            sub="هر ایده یا کاری که «فعلاً» وقتش نیست را اینجا نگه دار تا گم نشود"
            action={<Btn onClick={() => { setEdit(null); setShowM(true); }}><Plus size={15} /> افزودن آیتم</Btn>}
          />
        </Card>
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {items.map((t) => (
              <BacklogCard
                key={t.id}
                t={t}
                draggable
                dragging={dragId === t.id}
                onDragStart={() => setDragId(t.id)}
                onDragEnd={() => setDragId(null)}
                onToggle={() => moveTask(t.id, t.status === 'done' ? 'todo' : 'done')}
                onEdit={() => { setEdit(t); setShowM(true); }}
                onDelete={() => setConfirmId(t.id)}
                onSchedule={() => { setScheduleId(t.id); setSchedDay(todayStart()); }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <TaskModal open={showM} onClose={() => setShowM(false)} edit={edit} presetBacklog={!edit} />

      {/* مودال زمان‌بندی */}
      <AnimatePresence>
        {scheduleId && schedTask && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setScheduleId(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.97 }}
              className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-slate-900"
            >
              <div className="border-b border-slate-100 px-6 py-4 dark:border-white/5">
                <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white">زمان‌بندی آیتم</h3>
                <p className="mt-0.5 truncate text-xs text-slate-500">{schedTask.title}</p>
              </div>
              <div className="space-y-3 px-6 py-5">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { l: 'امروز', d: todayStart() },
                    { l: 'فردا', d: addDays(todayStart(), 1) },
                    { l: 'پس‌فردا', d: addDays(todayStart(), 2) },
                    { l: 'هفته بعد', d: addDays(todayStart(), 7) },
                  ].map((o) => (
                    <button
                      key={o.l}
                      onClick={() => setSchedDay(o.d)}
                      className={cx(
                        'rounded-xl px-3 py-2 text-[11px] font-bold transition',
                        schedDay === o.d ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300',
                      )}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
                <JalaliDateField value={schedDay} onChange={setSchedDay} allowClear={false} />
                {schedDay != null && (
                  <p className="text-[11px] text-slate-400">منتقل می‌شود به: <b>{formatJalali(schedDay, { weekday: true })}</b></p>
                )}
                <div className="flex justify-end gap-2">
                  <Btn variant="ghost" onClick={() => setScheduleId(null)}>انصراف</Btn>
                  <Btn onClick={doSchedule}><CalendarPlus size={15} /> زمان‌بندی کن</Btn>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Confirm open={confirmId != null} onClose={() => setConfirmId(null)} onYes={() => confirmId && deleteTask(confirmId)} title="حذف آیتم؟" desc="این آیتم از بک‌لاگ حذف می‌شود." />
    </div>
  );
}

/** نمای ماتریس آیزنهاور با Drag & Drop بین ربع‌ها */
function EisenMatrix({ items, dragId, setDragId, onToggle, onEdit, onDelete, onSchedule }: {
  items: Task[];
  dragId: string | null;
  setDragId: (id: string | null) => void;
  onToggle: (id: string) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onSchedule: (t: Task) => void;
}) {
  const { updateTask } = useApp();
  const quads: Array<{ imp: boolean; urg: boolean; title: string; sub: string; color: string; bg: string }> = [
    { imp: true, urg: true, title: 'ربع ۱ • مهم و فوری', sub: 'همین حالا انجام بده', color: '#ef4444', bg: 'bg-rose-500/[0.05]' },
    { imp: true, urg: false, title: 'ربع ۲ • مهم و غیرفوری', sub: 'برنامه‌ریزی کن', color: '#3b82f6', bg: 'bg-sky-500/[0.05]' },
    { imp: false, urg: true, title: 'ربع ۳ • غیرمهم و فوری', sub: 'بسپار به دیگری', color: '#f59e0b', bg: 'bg-amber-500/[0.05]' },
    { imp: false, urg: false, title: 'ربع ۴ • غیرمهم و غیرفوری', sub: 'حذف کن', color: '#94a3b8', bg: 'bg-slate-500/[0.05]' },
  ];
  const drop = (imp: boolean, urg: boolean) => {
    if (!dragId) return;
    updateTask(dragId, { priority: imp ? 'high' : 'low', urgent: urg });
    setDragId(null);
  };
  return (
    <div>
      <p className="mb-3 text-center text-[11px] text-slate-400">💡 کارت‌ها را بین ربع‌ها بکش و رها کن تا اهمیت/فوریت عوض شود</p>
      <div className="grid items-start gap-3 md:grid-cols-2">
        {quads.map((q) => {
          const list = items.filter((t) => {
            const e = eisenOf(t);
            return e.important === q.imp && e.urgent === q.urg;
          });
          return (
            <div
              key={q.title}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(q.imp, q.urg)}
              className={cx('min-h-[180px] rounded-3xl border border-slate-200/60 p-3 dark:border-white/5', q.bg)}
            >
              <div className="mb-2.5 flex items-center gap-2 px-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: q.color }} />
                <div className="flex-1">
                  <h3 className="text-[12px] font-black text-slate-700 dark:text-slate-200">{q.title}</h3>
                  <p className="text-[10px] text-slate-400">{q.sub}</p>
                </div>
                <span className="tabular rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
                  {toFa(list.length)}
                </span>
              </div>
              <div className="space-y-2">
                {list.map((t) => (
                  <BacklogCard
                    key={t.id}
                    t={t}
                    draggable
                    dragging={dragId === t.id}
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    onToggle={() => onToggle(t.id)}
                    onEdit={() => onEdit(t)}
                    onDelete={() => onDelete(t.id)}
                    onSchedule={() => onSchedule(t)}
                  />
                ))}
                {list.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-slate-200 py-5 text-center text-[11px] text-slate-400 dark:border-white/10">خالی — کارت را اینجا رها کن</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BacklogCard({ t, onToggle, onEdit, onDelete, onSchedule, draggable, dragging, onDragStart, onDragEnd }: {
  t: Task; onToggle: () => void; onEdit: () => void; onDelete: () => void; onSchedule: () => void;
  draggable?: boolean; dragging?: boolean; onDragStart?: () => void; onDragEnd?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pri = PRIORITY_META[t.priority];
  const e = eisenOf(t);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: dragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cx(
        'rounded-2xl border bg-white p-3.5 shadow-sm dark:bg-slate-900',
        t.status === 'done' ? 'border-emerald-500/20' : 'border-slate-200/80 dark:border-white/10',
      )}
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={onToggle}
          className={cx(
            'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition active:scale-90',
            t.status === 'done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-500 dark:border-white/20',
          )}
        >
          {t.status === 'done' && <CheckIcon />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={cx('text-[13px] font-extrabold leading-6', t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100')}>{t.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ background: eisenColor(e.important, e.urgent) }}
              title={eisenLabel(e.important, e.urgent)}
            >
              {e.important ? (e.urgent ? '🔴' : '🔵') : e.urgent ? '🟡' : '⚪'} ربع {e.important ? (e.urgent ? '۱' : '۲') : e.urgent ? '۳' : '۴'}
            </span>
            <span className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', pri.bg, pri.color)}>
              <Flag size={10} />{pri.label}
            </span>
            {t.deadline != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-300" title="ددلاین">
                <Clock size={10} />ددلاین: {formatJalaliShort(t.deadline)}
              </span>
            )}
            {t.time && (
              <span className="tabular inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300" dir="ltr">
                {t.time}
              </span>
            )}
            {t.actualMin != null && (
              <span className="tabular rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                واقعی: {toFa(t.actualMin)} دقیقه
              </span>
            )}
            {t.tags.slice(0, 3).map((tg) => (
              <Badge key={tg} tone="slate">#{tg}</Badge>
            ))}
          </div>
        </div>
      </div>
      {(t.desc || t.result || t.subtasks.length > 0) && (
        <button onClick={() => setOpen((v) => !v)} className="mt-2 flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-emerald-600">
          <motion.span animate={{ rotate: open ? 180 : 0 }}><ChevronDown size={13} /></motion.span>
          {open ? 'بستن جزئیات' : 'نمایش جزئیات'}
        </button>
      )}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-1.5 pt-2">
              {t.desc && <p className="rounded-xl bg-slate-50 p-2.5 text-[11px] leading-6 text-slate-500 dark:bg-white/5 dark:text-slate-400">{t.desc}</p>}
              {t.result && <p className="rounded-xl bg-emerald-500/5 p-2.5 text-[11px] leading-6 text-emerald-700 ring-1 ring-emerald-500/15 dark:text-emerald-300">📝 نتیجه: {t.result}</p>}
              {t.subtasks.map((s) => (
                <p key={s.id} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Check size={12} className={s.done ? 'text-emerald-500' : 'text-slate-300'} />
                  <span className={s.done ? 'line-through opacity-60' : ''}>{s.title}</span>
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mt-2.5 flex items-center justify-between border-t border-slate-50 pt-2 dark:border-white/5">
        <button onClick={onSchedule} className="flex items-center gap-1 rounded-xl bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-500/15 dark:text-emerald-300">
          <CalendarPlus size={13} /> زمان‌بندی
          <ArrowRight size={11} className="rotate-180" />
        </button>
        <div className="flex gap-0.5">
          <button onClick={onEdit} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-sky-500/10 hover:text-sky-600" title="ویرایش"><Pencil size={13} /></button>
          <button onClick={onDelete} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-500" title="حذف"><Trash2 size={13} /></button>
        </div>
      </div>
    </motion.div>
  );
}
