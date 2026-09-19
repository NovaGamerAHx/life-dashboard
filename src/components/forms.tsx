import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Trash2, Check, Eraser } from 'lucide-react';
import { Modal, Field, Btn, inputCls, Segmented, TimeField } from './ui';
import { cx, uid } from '../lib/utils';
import {
  toJalaali, toGregorian, jalaaliMonthLength, J_MONTHS, toFa,
  formatJalali, todayStart, startOfDay, normalizeClockText,
} from '../lib/jalali';
import { useApp } from '../lib/store';
import { EVENT_COLORS, HABIT_COLORS, NOTE_COLORS, PRIORITY_META, type CalEvent, type Habit, type Note, type Task, type TaskPriority, type TaskStatus } from '../lib/types';

/** نام ربع ماتریس آیزنهاور */
export function eisenLabel(important: boolean, urgent: boolean): string {
  if (important && urgent) return '۱ • مهم و فوری (انجام بده)';
  if (important && !urgent) return '۲ • مهم و غیرفوری (برنامه‌ریزی کن)';
  if (!important && urgent) return '۳ • غیرمهم و فوری (بسپار)';
  return '۴ • غیرمهم و غیرفوری (حذف کن)';
}

/** رنگ ربع آیزنهاور */
export function eisenColor(important: boolean, urgent: boolean): string {
  if (important && urgent) return '#ef4444';
  if (important && !urgent) return '#3b82f6';
  if (!important && urgent) return '#f59e0b';
  return '#94a3b8';
}

/** تعیین مهم/فوری بودن تسک */
export function eisenOf(t: Task): { important: boolean; urgent: boolean } {
  return { important: t.priority === 'high', urgent: t.urgent ?? t.priority === 'high' };
}

// ── فیلد تاریخ شمسی ─────────────────────────────────────────
export function JalaliDateField({
  value, onChange, allowClear = true,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  allowClear?: boolean;
}) {
  const cur = value != null ? toJalaali(new Date(value)) : toJalaali(new Date());
  const [jy, setJy] = useState(cur.jy);
  const [jm, setJm] = useState(cur.jm);
  const [jd, setJd] = useState(cur.jd);

  useEffect(() => {
    if (value != null) {
      const j = toJalaali(new Date(value));
      setJy(j.jy); setJm(j.jm); setJd(j.jd);
    }
     
  }, [value]);

  const monthLen = jalaaliMonthLength(jy, jm);
  const years = useMemo(() => {
    const base = toJalaali(new Date()).jy;
    const arr: number[] = [];
    for (let y = base - 5; y <= base + 5; y++) arr.push(y);
    return arr;
  }, []);

  const commit = (y: number, m: number, d: number) => {
    const dd = Math.min(d, jalaaliMonthLength(y, m));
    try {
      const g = toGregorian(y, m, dd).getTime();
      onChange(startOfDay(g));
    } catch { /* نامعتبر */ }
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <select value={jd} onChange={(e) => { const d = Number(e.target.value); setJd(d); commit(jy, jm, d); }} className={inputCls}>
          {Array.from({ length: monthLen }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{toFa(d)}</option>
          ))}
        </select>
        <select value={jm} onChange={(e) => { const m = Number(e.target.value); setJm(m); commit(jy, m, jd); }} className={inputCls}>
          {J_MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select value={jy} onChange={(e) => { const y = Number(e.target.value); setJy(y); commit(y, jm, jd); }} className={inputCls}>
          {years.map((y) => (
            <option key={y} value={y}>{toFa(y)}</option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
          <CalendarDays size={13} />
          {value != null ? formatJalali(value, { weekday: true }) : 'تاریخ انتخاب نشده'}
        </span>
        <span className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              const t = todayStart();
              const j = toJalaali(new Date(t));
              setJy(j.jy); setJm(j.jm); setJd(j.jd);
              onChange(t);
            }}
            className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
          >
            امروز
          </button>
          {allowClear && value != null && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300"
            >
              <Eraser size={12} /> پاک
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

export function ColorDots({ colors, value, onChange }: { colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`رنگ ${c}`}
          className={cx(
            'grid h-9 w-9 place-items-center rounded-full transition-all',
            value === c ? 'scale-110 ring-2 ring-slate-400 ring-offset-2 dark:ring-offset-slate-900' : 'opacity-80 hover:scale-105',
          )}
          style={{ background: c }}
        >
          {value === c && <Check size={16} className="text-white drop-shadow" />}
        </button>
      ))}
    </div>
  );
}

// ── مودال وظیفه ─────────────────────────────────────────────
export function TaskModal({
  open, onClose, edit, presetDue, presetBacklog,
}: {
  open: boolean; onClose: () => void; edit?: Task | null;
  presetDue?: number | null; presetBacklog?: boolean;
}) {
  const { state, addTask, updateTask } = useApp();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [tagsTxt, setTagsTxt] = useState('');
  const [due, setDue] = useState<number | null>(null);
  const [backlog, setBacklog] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [time, setTime] = useState('');
  const [durationMin, setDurationMin] = useState(60);
  const [actualTxt, setActualTxt] = useState('');
  const [result, setResult] = useState('');
  const [subs, setSubs] = useState<Array<{ id: string; title: string; done: boolean }>>([]);
  const [newSub, setNewSub] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(edit?.title ?? '');
      setDesc(edit?.desc ?? '');
      setStatus(edit?.status ?? 'todo');
      setPriority(edit?.priority ?? 'medium');
      setTagsTxt(edit?.tags.join('، ') ?? '');
      setDue(edit ? edit.due : (presetDue !== undefined ? presetDue : null));
      setBacklog(edit ? !!edit.backlog : !!presetBacklog);
      setUrgent(edit ? (edit.urgent ?? edit.priority === 'high') : false);
      setDeadline(edit?.deadline ?? null);
      setTime(edit?.time ?? '');
      setDurationMin(edit?.durationMin ?? 60);
      setActualTxt(edit?.actualMin != null ? String(edit.actualMin) : '');
      setResult(edit?.result ?? '');
      setSubs(edit?.subtasks.map((s) => ({ ...s })) ?? []);
      setNewSub('');
      setErr('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  const save = () => {
    if (!title.trim()) { setErr('عنوان وظیفه را بنویسید'); return; }
    const timeNorm = time.trim() ? normalizeClockText(time) : null;
    if (time.trim() && !timeNorm) { setErr('ساعت را ۲۴ساعته و به شکل ۰۹:۳۰ یا ۲۲:۱۵ بنویسید'); return; }
    const tags = tagsTxt.split(/[،,]/).map((t) => t.trim()).filter(Boolean).slice(0, 8);
    const actual = actualTxt.trim() === '' ? undefined : Math.min(10080, Math.max(1, Number(actualTxt.replace(/[^0-9]/g, '')) || 0)) || undefined;
    const payload = {
      title: title.trim(), desc: desc.trim() || undefined, status, priority, tags,
      due: backlog ? null : due,
      backlog,
      urgent,
      deadline,
      time: timeNorm ?? undefined,
      durationMin: Math.min(1440, Math.max(5, durationMin || 60)),
      actualMin: actual,
      result: result.trim() || undefined,
      subtasks: subs.filter((s) => s.title.trim()).map((s) => ({ ...s, title: s.title.trim() })),
    };
    if (edit) updateTask(edit.id, payload);
    else addTask(payload);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'ویرایش وظیفه' : 'وظیفه جدید'} wide>
      <div className="space-y-4">
        <Field label="عنوان وظیفه">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="مثلاً تحویل گزارش ماهانه" />
        </Field>
        <Field label="توضیح (اختیاری)">
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className={cx(inputCls, 'h-auto py-2.5')} placeholder="جزئیات بیشتر…" />
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="وضعیت">
            <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className={inputCls}>
              <option value="todo">برای انجام</option>
              <option value="doing">در حال انجام</option>
              <option value="done">انجام‌شده</option>
            </select>
          </Field>
          <Field label="اهمیت (ماتریس آیزنهاور)">
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputCls}>
              {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
                <option key={p} value={p}>{PRIORITY_META[p].label}</option>
              ))}
            </select>
          </Field>
          <Field label="فوریت (ماتریس آیزنهاور)">
            <Segmented
              value={urgent ? 'urgent' : 'not'}
              onChange={(v) => setUrgent(v === 'urgent')}
              options={[{ v: 'urgent', label: '🔥 فوری' }, { v: 'not', label: 'غیرفوری' }]}
            />
          </Field>
        </div>
        <div className="rounded-2xl bg-slate-50/70 px-3.5 py-2.5 text-[11px] font-bold text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
          ربع آیزنهاور: <b>{eisenLabel(priority === 'high', urgent)}</b>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="برچسب‌ها (با ویرگول جدا کنید)">
            <input value={tagsTxt} onChange={(e) => setTagsTxt(e.target.value)} className={inputCls} placeholder="کاری، مهم" />
          </Field>
          <Field label="ددلاین (اختیاری — مستقل از روز انجام)">
            <JalaliDateField value={deadline} onChange={setDeadline} />
          </Field>
        </div>
        <Field label="سررسید (اختیاری)">
          <JalaliDateField value={due} onChange={setDue} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ساعت شروع (اختیاری — ۲۴ساعته)" hint="برای تایم‌لاین روز استفاده می‌شود">
            <TimeField value={time} onChange={setTime} ariaLabel="ساعت شروع وظیفه" />
          </Field>
          <Field label="مدت برنامه‌ریزی‌شده (دقیقه)">
            <input
              value={String(durationMin)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9]/g, ''));
                if (!Number.isNaN(n)) setDurationMin(Math.min(1440, Math.max(0, n)));
              }}
              inputMode="numeric"
              dir="ltr"
              className={cx(inputCls, 'tabular text-center')}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="زمان واقعی صرف‌شده (دقیقه — اختیاری)">
            <input value={actualTxt} onChange={(e) => setActualTxt(e.target.value.replace(/[^۰-۹۰-۹0-9]/g, ''))} inputMode="numeric" placeholder="مثلاً ۹۰" className={cx(inputCls, 'tabular')} />
          </Field>
          <Field label="یادداشت / نتیجه (اختیاری)">
            <input value={result} onChange={(e) => setResult(e.target.value)} placeholder="نتیجه انجام…" className={inputCls} />
          </Field>
        </div>
        {(state.taskCats ?? []).length > 0 && (
          <div>
            <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">دسته (اختیاری)</span>
            <div className="flex flex-wrap gap-1.5">
              {(state.taskCats ?? []).map((c) => {
                const on = tagsTxt.split(/[،,]/).map((t) => t.trim()).includes(c.name);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      const cur = tagsTxt.split(/[،,]/).map((t) => t.trim()).filter(Boolean);
                      setTagsTxt(on ? cur.filter((t) => t !== c.name).join('، ') : [...cur, c.name].join('، '));
                    }}
                    className={cx(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition',
                      on ? 'border-transparent text-white' : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-white/10 dark:text-slate-300',
                    )}
                    style={on ? { background: c.color } : undefined}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: on ? '#fff' : c.color }} />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-slate-200 px-3.5 py-3 text-xs font-bold text-slate-500 dark:border-white/10 dark:text-slate-400">
          <input type="checkbox" checked={backlog} onChange={(e) => setBacklog(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
          <span>
            نگه داشتن در بک‌لاگ
            <span className="block text-[11px] font-normal text-slate-400">کار بدون روز مشخص؛ بعداً با یک کلیک زمان‌بندی‌اش کن</span>
          </span>
        </label>
        <div>
          <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">زیروظایف</span>
          <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 dark:border-white/5 dark:bg-white/[0.02]">
            {subs.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSubs((p) => p.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
                  className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition', s.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white dark:border-white/20 dark:bg-transparent')}
                >
                  {s.done && <Check size={14} />}
                </button>
                <input
                  value={s.title}
                  onChange={(e) => setSubs((p) => p.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
                  className={cx(inputCls, 'h-9', s.done && 'line-through opacity-60')}
                  placeholder="عنوان زیروظیفه"
                />
                <button type="button" onClick={() => setSubs((p) => p.filter((x) => x.id !== s.id))} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-500">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSub.trim()) {
                    e.preventDefault();
                    setSubs((p) => [...p, { id: uid('st'), title: newSub.trim(), done: false }]);
                    setNewSub('');
                  }
                }}
                className={inputCls}
                placeholder="زیروظیفه جدید + Enter"
              />
              <Btn variant="soft" onClick={() => { if (newSub.trim()) { setSubs((p) => [...p, { id: uid('st'), title: newSub.trim(), done: false }]); setNewSub(''); } }}>
                <Plus size={15} />
              </Btn>
            </div>
          </div>
        </div>
        {err && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300">{err}</p>}
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>انصراف</Btn>
          <Btn onClick={save}>{edit ? 'ذخیره تغییرات' : 'افزودن وظیفه'}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── مودال رویداد ────────────────────────────────────────────
export function EventModal({ open, onClose, edit, presetDay }: { open: boolean; onClose: () => void; edit?: CalEvent | null; presetDay?: number | null }) {
  const { addEvent, updateEvent } = useApp();
  const [title, setTitle] = useState('');
  const [day, setDay] = useState<number | null>(null);
  const [time, setTime] = useState('');
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [desc, setDesc] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(edit?.title ?? '');
      setDay(edit?.day ?? presetDay ?? todayStart());
      setTime(edit?.time ?? '');
      setColor(edit?.color ?? EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)]);
      setDesc(edit?.desc ?? '');
      setErr('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = () => {
    if (!title.trim()) { setErr('عنوان رویداد را بنویسید'); return; }
    if (day == null) { setErr('روز رویداد را انتخاب کنید'); return; }
    const timeNorm = time.trim() ? (normalizeClockText(time) ?? '') : '';
    if (time.trim() && !timeNorm) { setErr('ساعت را ۲۴ساعته و به شکل ۱۰:۰۰ یا ۱۸:۳۰ بنویسید'); return; }
    if (edit) updateEvent(edit.id, { title: title.trim(), day, time: timeNorm, color, desc: desc.trim() || undefined });
    else addEvent({ title: title.trim(), day, time: timeNorm, color, desc: desc.trim() || undefined });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'ویرایش رویداد' : 'رویداد جدید'}>
      <div className="space-y-4">
        <Field label="عنوان رویداد">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="مثلاً جلسه تیم طراحی" />
        </Field>
        <Field label="روز">
          <JalaliDateField value={day} onChange={setDay} allowClear={false} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ساعت (اختیاری — ۲۴ساعته)">
            <TimeField value={time} onChange={setTime} ariaLabel="ساعت رویداد" placeholder="۱۸:۳۰" />
          </Field>
          <Field label="یادداشت">
            <input value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} placeholder="مکان یا توضیح…" />
          </Field>
        </div>
        <Field label="رنگ">
          <ColorDots colors={EVENT_COLORS} value={color} onChange={setColor} />
        </Field>
        {err && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300">{err}</p>}
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>انصراف</Btn>
          <Btn onClick={save}>{edit ? 'ذخیره تغییرات' : 'افزودن رویداد'}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── مودال عادت ──────────────────────────────────────────────
export function HabitModal({ open, onClose, edit }: { open: boolean; onClose: () => void; edit?: Habit | null }) {
  const { addHabit, updateHabit } = useApp();
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(HABIT_COLORS[0]);
  const [target, setTarget] = useState(5);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(edit?.title ?? '');
      setColor(edit?.color ?? HABIT_COLORS[0]);
      setTarget(edit?.targetPerWeek ?? 5);
      setErr('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = () => {
    if (!title.trim()) { setErr('نام عادت را بنویسید'); return; }
    if (edit) updateHabit(edit.id, { title: title.trim(), color, targetPerWeek: target });
    else addHabit({ title: title.trim(), color, targetPerWeek: target });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'ویرایش عادت' : 'عادت جدید'} sub="کوچک شروع کن، مداوم ادامه بده">
      <div className="space-y-4">
        <Field label="نام عادت">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="مثلاً ۲۰ دقیقه مطالعه" />
        </Field>
        <Field label="رنگ">
          <ColorDots colors={HABIT_COLORS} value={color} onChange={setColor} />
        </Field>
        <Field label="هدف هفتگی (روز در هفته)">
          <div className="flex items-center gap-3">
            <div className="flex flex-1 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTarget(n)}
                  className={cx(
                    'tabular grid h-10 flex-1 place-items-center rounded-xl text-sm font-black transition',
                    target === n ? 'text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300',
                  )}
                  style={target === n ? { background: color } : undefined}
                >
                  {toFa(n)}
                </button>
              ))}
            </div>
          </div>
        </Field>
        {err && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300">{err}</p>}
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>انصراف</Btn>
          <Btn onClick={save}>{edit ? 'ذخیره تغییرات' : 'افزودن عادت'}</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ── مودال یادداشت ───────────────────────────────────────────
export function NoteModal({ open, onClose, edit }: { open: boolean; onClose: () => void; edit?: Note | null }) {
  const { addNote, updateNote } = useApp();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [tagsTxt, setTagsTxt] = useState('');
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(edit?.title ?? '');
      setBody(edit?.body ?? '');
      setColor(edit?.color ?? NOTE_COLORS[0]);
      setTagsTxt(edit?.tags.join('، ') ?? '');
      setPinned(edit?.pinned ?? false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = () => {
    if (!title.trim() && !body.trim()) { onClose(); return; }
    const tags = tagsTxt.split(/[،,]/).map((t) => t.trim()).filter(Boolean).slice(0, 6);
    if (edit) updateNote(edit.id, { title: title.trim(), body, color, tags, pinned });
    else addNote({ title: title.trim() || 'بدون عنوان', body, color, tags, pinned });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={edit ? 'ویرایش یادداشت' : 'یادداشت جدید'} wide>
      <div className="space-y-4">
        <Field label="عنوان">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="عنوان یادداشت…" />
        </Field>
        <Field label="متن">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} className={cx(inputCls, 'h-auto py-3 leading-7')} placeholder="هرچه در ذهن داری بنویس…" />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="برچسب‌ها">
            <input value={tagsTxt} onChange={(e) => setTagsTxt(e.target.value)} className={inputCls} placeholder="ایده، کاری" />
          </Field>
          <Field label="رنگ">
            <div className="flex flex-wrap gap-2">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cx('h-9 w-9 rounded-full border transition-all', color === c ? 'scale-110 border-slate-500 ring-2 ring-slate-300' : 'border-slate-200 hover:scale-105')}
                  style={{ background: c }}
                />
              ))}
            </div>
          </Field>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
          سنجاق شود (بالای لیست بماند)
        </label>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>انصراف</Btn>
          <Btn onClick={save}>{edit ? 'ذخیره تغییرات' : 'ذخیره یادداشت'}</Btn>
        </div>
      </div>
    </Modal>
  );
}
