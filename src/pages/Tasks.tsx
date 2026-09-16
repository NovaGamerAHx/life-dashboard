import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Search, Pencil, Trash2, Check, ChevronDown, Flag,
  CalendarClock, Tag, ListTodo, GripVertical,
} from 'lucide-react';
import { useApp } from '../lib/store';
import { PRIORITY_META, STATUS_META, type Task, type TaskPriority, type TaskStatus } from '../lib/types';
import { Card, Btn, Empty, Progress, inputCls, Confirm } from '../components/ui';
import { TaskModal } from '../components/forms';
import { cx } from '../lib/utils';
import { toFa, diffDays, smartDate } from '../lib/jalali';
import { taskProgress } from '../lib/stats';
import { dueTone } from '../components/navBadges';

const COLS: Array<{ k: TaskStatus; tint: string; dot: string }> = [
  { k: 'todo', tint: 'bg-slate-500/5', dot: 'bg-slate-400' },
  { k: 'doing', tint: 'bg-sky-500/5', dot: 'bg-sky-500' },
  { k: 'done', tint: 'bg-emerald-500/5', dot: 'bg-emerald-500' },
];

type SortK = 'due' | 'priority' | 'newest';

export default function Tasks() {
  const { state, moveTask, deleteTask, updateTask } = useApp();
  const [q, setQ] = useState('');
  const [priF, setPriF] = useState<'all' | TaskPriority>('all');
  const [sort, setSort] = useState<SortK>('due');
  const [showM, setShowM] = useState(false);
  const [edit, setEdit] = useState<Task | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  // ویرایش درجا
  const [inlineId, setInlineId] = useState<string | null>(null);
  const [inlineTxt, setInlineTxt] = useState('');

  // کلید N برای تسک جدید
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) return;
      if (showM) return;
      if (e.key === 'n' || e.key === 'N' || e.key === 'ی') {
        e.preventDefault();
        setEdit(null); setShowM(true);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [showM]);

  const commitInline = (t: Task) => {
    const v = inlineTxt.trim();
    if (v && v !== t.title) updateTask(t.id, { title: v });
    setInlineId(null);
  };

  const filtered = useMemo(() => {
    // بک‌لاگ اینجا نمایش داده نمی‌شود (صفحه خودش را دارد)
    let arr = [...state.tasks].filter((t) => !t.backlog);
    const needle = q.trim();
    if (needle) {
      arr = arr.filter(
        (t) => t.title.includes(needle) || (t.desc ?? '').includes(needle) || t.tags.some((x) => x.includes(needle)),
      );
    }
    if (priF !== 'all') arr = arr.filter((t) => t.priority === priF);
    const pw = { high: 0, medium: 1, low: 2 };
    const by: Record<SortK, (a: Task, b: Task) => number> = {
      due: (a, b) => (a.due ?? 9e15) - (b.due ?? 9e15) || pw[a.priority] - pw[b.priority],
      priority: (a, b) => pw[a.priority] - pw[b.priority] || (a.due ?? 9e15) - (b.due ?? 9e15),
      newest: (a, b) => b.createdAt - a.createdAt,
    };
    return arr.sort(by[sort]);
  }, [state.tasks, q, priF, sort]);

  const byStatus = useMemo(() => {
    const m: Record<TaskStatus, Task[]> = { todo: [], doing: [], done: [] };
    for (const t of filtered) m[t.status].push(t);
    return m;
  }, [filtered]);

  const total = state.tasks.filter((t) => !t.backlog).length;
  const doneList = state.tasks.filter((t) => !t.backlog && t.status === 'done');
  const done = doneList.length;
  const overdue = state.tasks.filter((t) => !t.backlog && t.status !== 'done' && t.due != null && diffDays(t.due, Date.now()) < 0).length;

  const toggleExpand = (id: string) =>
    setExpanded((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const onDrop = (status: TaskStatus) => {
    if (dragId) {
      moveTask(dragId, status);
      setDragId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* نوار خلاصه */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="tabular text-xl font-black text-slate-800 dark:text-white">{toFa(total)}</p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-400">کل وظایف</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="tabular text-xl font-black text-emerald-600">{total ? toFa(Math.round((done / total) * 100)) : toFa(0)}٪</p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-400">نرخ انجام</p>
          <div className="mx-auto mt-2 max-w-[140px]"><Progress value={total ? (done / total) * 100 : 0} h={6} /></div>
        </Card>
        <Card className="p-4 text-center">
          <p className={cx('tabular text-xl font-black', overdue > 0 ? 'text-rose-500' : 'text-slate-800 dark:text-white')}>{toFa(overdue)}</p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-400">عقب‌افتاده</p>
        </Card>
      </div>

      {/* فیلترها */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو در وظایف…" className={cx(inputCls, 'pr-9')} />
          </div>
          <select value={priF} onChange={(e) => setPriF(e.target.value as typeof priF)} className={cx(inputCls, 'w-auto')}>
            <option value="all">همه اولویت‌ها</option>
            <option value="high">مهم</option>
            <option value="medium">متوسط</option>
            <option value="low">عادی</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortK)} className={cx(inputCls, 'w-auto')}>
            <option value="due">مرتب: سررسید</option>
            <option value="priority">مرتب: اولویت</option>
            <option value="newest">مرتب: جدیدترین</option>
          </select>
          <Btn onClick={() => { setEdit(null); setShowM(true); }}>
            <Plus size={15} /> وظیفه جدید
          </Btn>
        </div>
      </Card>

      {/* ستون‌ها */}
      {filtered.length === 0 ? (
        <Card>
          <Empty
            icon={<ListTodo size={26} />}
            title={total === 0 ? 'هنوز وظیفه زمان‌بندی‌شده‌ای نداری' : 'چیزی پیدا نشد'}
            sub={total === 0 ? 'از بک‌لاگ زمان‌بندی کن یا وظیفه جدید بساز (کلید N)' : 'فیلترها را تغییر بده'}
            action={<Btn onClick={() => { setEdit(null); setShowM(true); }}><Plus size={15} /> وظیفه جدید</Btn>}
          />
        </Card>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-3">
          {COLS.map((c) => (
            <div
              key={c.k}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(c.k)}
              className={cx('min-h-[300px] rounded-3xl border border-slate-200/60 p-3 dark:border-white/5', c.tint)}
            >
              <div className="mb-3 flex items-center gap-2 px-1.5">
                <span className={cx('h-2.5 w-2.5 rounded-full', c.dot)} />
                <h3 className="text-[13px] font-black text-slate-700 dark:text-slate-200">{STATUS_META[c.k].label}</h3>
                <span className="tabular rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
                  {toFa(byStatus[c.k].length)}
                </span>
              </div>
              <div className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {byStatus[c.k].map((t) => (
                    <TaskCard
                      key={t.id}
                      t={t}
                      expanded={expanded.has(t.id)}
                      onToggleExpand={() => toggleExpand(t.id)}
                      onEdit={() => { setEdit(t); setShowM(true); }}
                      onDelete={() => setConfirmId(t.id)}
                      dragging={dragId === t.id}
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      inlineEditing={inlineId === t.id}
                      inlineTxt={inlineTxt}
                      setInlineTxt={setInlineTxt}
                      onStartInline={() => { setInlineId(t.id); setInlineTxt(t.title); }}
                      onCommitInline={() => commitInline(t)}
                      onCancelInline={() => setInlineId(null)}
                    />
                  ))}
                </AnimatePresence>
                {byStatus[c.k].length === 0 && (
                  <p className="rounded-2xl border border-dashed border-slate-200 py-6 text-center text-[11px] text-slate-400 dark:border-white/10">
                    {c.k === 'done' ? 'هنوز کاری تمام نشده — بجنب! 💪' : 'خالی — وظیفه را اینجا رها کن'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="hidden text-center text-[11px] text-slate-400 md:block">💡 راهنما: کارت‌ها را بین ستون‌ها بکش و رها کن • دابل‌کلیک روی عنوان = ویرایش درجا • کلید N = تسک جدید</p>

      <TaskModal open={showM} onClose={() => setShowM(false)} edit={edit} />
      <Confirm open={confirmId != null} onClose={() => setConfirmId(null)} onYes={() => confirmId && deleteTask(confirmId)} title="حذف وظیفه؟" desc="وظیفه و زیروظایف آن حذف می‌شوند." />
    </div>
  );
}

function TaskCard({
  t, expanded, onToggleExpand, onEdit, onDelete, dragging, onDragStart, onDragEnd,
  inlineEditing, inlineTxt, setInlineTxt, onStartInline, onCommitInline, onCancelInline,
}: {
  t: Task;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  inlineEditing: boolean;
  inlineTxt: string;
  setInlineTxt: (v: string) => void;
  onStartInline: () => void;
  onCommitInline: () => void;
  onCancelInline: () => void;
}) {
  const { moveTask, updateTask } = useApp();
  const pct = taskProgress(t.subtasks);
  const tone = dueTone(t.due, t.status);
  const dueLabel = t.due == null ? 'بدون سررسید' : t.status === 'done' ? smartDate(t.due) : smartDueFull(t);
  const toneCls: Record<string, string> = {
    red: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
    slate: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  };
  const pri = PRIORITY_META[t.priority];

  const cycle = () => {
    const next: TaskStatus = t.status === 'todo' ? 'doing' : t.status === 'doing' ? 'done' : 'todo';
    moveTask(t.id, next);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: dragging ? 0.5 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cx(
        'rounded-2xl border bg-white p-3.5 shadow-sm dark:bg-slate-900',
        t.status === 'done' ? 'border-emerald-500/20' : tone === 'red' ? 'border-rose-500/25' : 'border-slate-200/80 dark:border-white/10',
      )}
    >
      <div className="flex items-start gap-2">
        <button onClick={cycle} title="تغییر وضعیت" className={cx(
          'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition',
          t.status === 'done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-500 dark:border-white/20',
        )}>
          {t.status === 'done' && <Check size={13} strokeWidth={3.5} />}
        </button>
        <div className="min-w-0 flex-1">
          {inlineEditing ? (
            <input
              autoFocus
              value={inlineTxt}
              onChange={(e) => setInlineTxt(e.target.value)}
              onBlur={onCommitInline}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); onCommitInline(); }
                if (e.key === 'Escape') onCancelInline();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={cx(inputCls, 'h-8 text-[13px]')}
            />
          ) : (
            <p
              onDoubleClick={onStartInline}
              title="دابل‌کلیک برای ویرایش درجا"
              className={cx('cursor-text text-[13px] font-extrabold leading-6', t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100')}
            >
              {t.title}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold', toneCls[tone])}>
              <CalendarClock size={10} />
              {dueLabel}
            </span>
            {t.time && (
              <span className="tabular inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300" dir="ltr">
                {t.time}
              </span>
            )}
            <span className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', pri.bg, pri.color)}>
              <Flag size={10} />
              {pri.label}
            </span>
          </div>
        </div>
        <span className="cursor-grab text-slate-300 active:cursor-grabbing" title="بکش و رها کن"><GripVertical size={15} /></span>
      </div>

      {t.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {t.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">
              <Tag size={9} />{tag}
            </span>
          ))}
        </div>
      )}

      {t.subtasks.length > 0 && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>پیشرفت زیروظایف</span>
            <span className="tabular">{toFa(pct)}٪</span>
          </div>
          <div className="mt-1"><Progress value={pct} h={5} color={t.status === 'done' ? '#10b981' : '#0ea5e9'} /></div>
        </div>
      )}

      {(t.desc || t.subtasks.length > 0) && (
        <button onClick={onToggleExpand} className="mt-2 flex items-center gap-1 text-[11px] font-bold text-slate-400 transition hover:text-emerald-600">
          <motion.span animate={{ rotate: expanded ? 180 : 0 }}><ChevronDown size={13} /></motion.span>
          {expanded ? 'بستن جزئیات' : 'نمایش جزئیات'}
        </button>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 pt-2">
              {t.desc && <p className="rounded-xl bg-slate-50 p-2.5 text-[11px] leading-6 text-slate-500 dark:bg-white/5 dark:text-slate-400">{t.desc}</p>}
              {t.subtasks.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={s.done}
                    onChange={() => updateTask(t.id, { subtasks: t.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className={cx('flex-1 font-bold', s.done ? 'text-slate-400 line-through' : 'text-slate-600 dark:text-slate-300')}>{s.title}</span>
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-2.5 flex items-center justify-between border-t border-slate-50 pt-2 dark:border-white/5">
        <div className="flex gap-0.5">
          {t.status !== 'todo' && <QuickMove label="→ نشده" onClick={() => moveTask(t.id, 'todo')} />}
          {t.status !== 'doing' && <QuickMove label="→ در حال انجام" onClick={() => moveTask(t.id, 'doing')} />}
          {t.status !== 'done' && <QuickMove label="✓ تمام" onClick={() => moveTask(t.id, 'done')} />}
          {t.due != null && (
            <QuickMove label="📥 بک‌لاگ" onClick={() => updateTask(t.id, { backlog: true, due: null })} />
          )}
        </div>
        <div className="flex gap-0.5">
          <button onClick={onEdit} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-sky-500/10 hover:text-sky-600" title="ویرایش">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500" title="حذف">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function QuickMove({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-lg px-1.5 py-1 text-[10px] font-bold text-slate-400 transition hover:bg-emerald-500/10 hover:text-emerald-600">
      {label}
    </button>
  );
}

export function smartDueFull(t: Task): string {
  if (t.due == null) return 'بدون سررسید';
  const d = diffDays(t.due, Date.now());
  if (d === 0) return 'امروز';
  if (d === 1) return 'فردا';
  if (d === -1) return 'دیروز — عقب‌افتاده';
  if (d < -1) return `${toFa(Math.abs(d))} روز عقب`;
  return smartDate(t.due);
}
