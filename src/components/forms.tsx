import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Plus, Trash2, Check, Eraser, Clock } from 'lucide-react';
import { Modal, Field, Btn, inputCls, Segmented, CheckIcon } from './ui';
import { cx, uid } from '../lib/utils';
import {
  toJalaali, toGregorian, jalaaliMonthLength, J_MONTHS, toFa,
  formatJalali, todayStart, startOfDay, normalizeClock, parseScoreInput,
  formatScore, roundScore,
} from '../lib/jalali';
import { useApp } from '../lib/store';
import {
  EVENT_COLORS, HABIT_COLORS, NOTE_COLORS, PRIORITY_META, SCORE_STEP,
  type CalEvent, type Habit, type Note, type Task, type TaskPriority, type TaskStatus,
} from '../lib/types';

// ── فیلد تاریخ شمسی ─────────────────────────────────────────
export function JalaliDateField({
  value, onChange, allowClear = true,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  allowClear?: boolean;
}) {
  const derived = toJalaali(new Date(value ?? todayStart()));
  // تا وقتی کاربر انتخاب دستی نکرده، مقدار نمایش‌داده‌شده از پراپ `value` می‌آید
  const [draft, setDraft] = useState<{ jy: number; jm: number; jd: number } | null>(null);
  const cur = draft ?? { jy: derived.jy, jm: derived.jm, jd: derived.jd };
  const { jy, jm, jd } = cur;
  const pick = (next: { jy: number; jm: number; jd: number }) => setDraft(next);

  const monthLen = jalaaliMonthLength(jy, jm);
  const years = useMemo(() => {
    const base = toJalaali(new Date()).jy;
    const arr: number[] = [];
    for (let y = base - 5; y <= base + 5; y++) arr.push(y);
    return arr;
  }, []);

  const commit = (y: number, m: number, d: number) => {
    const dd = Math.min(d, jalaaliMonthLength(y, m));
    pick({ jy: y, jm: m, jd: dd });
    try {
      onChange(startOfDay(toGregorian(y, m, dd).getTime()));
    } catch { /* تاریخ نامعتبر نادیده گرفته می‌شود */ }
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <select value={Math.min(jd, monthLen)} onChange={(e) => commit(jy, jm, Number(e.target.value))} className={inputCls}>
          {Array.from({ length: monthLen }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{toFa(d)}</option>
          ))}
        </select>
        <select value={jm} onChange={(e) => commit(jy, Number(e.target.value), jd)} className={inputCls}>
          {J_MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <select value={jy} onChange={(e) => commit(Number(e.target.value), jm, jd)} className={inputCls}>
          {years.map((y) => (
            <option key={y} value={y}>{toFa(y)}</option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[11px] text-muted">
          <CalendarDays size={13} />
          {value != null ? formatJalali(value, { weekday: true }) : 'تاریخ انتخاب نشده'}
        </span>
        <span className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              const t = todayStart();
              setDraft(null);
              onChange(t);
            }}
            className="rounded-lg bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand-ink hover:bg-brand/15 "
          >
            امروز
          </button>
          {allowClear && value != null && (
            <button
              type="button"
              onClick={() => { setDraft(null); onChange(null); }}
              className="inline-flex items-center gap-1 rounded-lg bg-sunken px-2.5 py-1 text-[11px] font-bold text-muted hover:bg-sunken  "
            >
              <Eraser size={12} /> پاک
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

// ── فیلد ساعت (همیشه ۲۴ ساعته — بدون AM/PM) ─────────────────
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

export function TimeField({
  value, onChange, allowClear = true, placeholder = '۰۰:۰۰', className,
}: {
  /** مقدار به شکل «HH:MM» و ۲۴ ساعته؛ رشته خالی یعنی ثبت نشده */
  value: string;
  onChange: (v: string) => void;
  allowClear?: boolean;
  placeholder?: string;
  className?: string;
}) {
  // متن ورودی تا وقتی کاربر در حال تایپ است «پیش‌نویس» می‌ماند، پس افکت هم‌گام‌سازی لازم نیست
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const txt = draft ?? (value ? toFa(value) : '');

  // بستن پنل با کلیک بیرون / Escape
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const commitText = (raw: string) => {
    setDraft(raw);
    if (!raw.trim()) {
      setErr(false);
      onChange('');
      return;
    }
    const norm = normalizeClock(raw);
    if (norm) {
      setErr(false);
      onChange(norm);
    } else {
      setErr(true);
    }
  };

  const [hh, mm] = value ? value.split(':') : ['', ''];
  const setPart = (h: string, m: string) => {
    const next = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
    onChange(normalizeClock(next) ?? '');
  };

  return (
    <div ref={boxRef} className={cx('relative', className)}>
      <div className="flex gap-2">
        <input
          value={txt}
          onChange={(e) => commitText(e.target.value)}
          onBlur={() => {
            // با پایان تایپ، متن به مقدار استاندارد ذخیره‌شده برمی‌گردد
            setDraft(null);
            setErr(false);
          }}
          inputMode="numeric"
          dir="ltr"
          placeholder={placeholder}
          aria-label="ساعت (۲۴ ساعته)"
          className={cx(inputCls, 'num text-center', err && 'border-danger focus:border-danger')}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title="انتخاب ساعت از فهرست (۰ تا ۲۳)"
          className="grid grid-cols-1 h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-muted transition hover:border-brand hover:text-brand-ink   "
        >
          <Clock size={16} />
        </button>
        {allowClear && value && (
          <button
            type="button"
            onClick={() => { setDraft(null); onChange(''); }}
            title="پاک کردن ساعت"
            className="grid grid-cols-1 h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-muted transition hover:border-danger hover:text-danger-ink "
          >
            <Eraser size={15} />
          </button>
        )}
      </div>

      {err && (
        <p className="mt-1 text-[11px] font-bold text-danger-ink">
          ساعت معتبر نیست — قالب ۲۴ ساعته مثل ۰۷:۳۰ یا ۲۳:۵۹ بنویسید
        </p>
      )}

      {open && (
        <div className="absolute z-40 mt-1 w-full min-w-[210px] rounded-2xl border border-line bg-surface p-2 shadow-2xl  ">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-bold text-muted">
              ساعت
              <select
                value={hh}
                onChange={(e) => setPart(e.target.value, mm || '00')}
                className={cx(inputCls, 'num mt-1 h-9')}
              >
                <option value="">—</option>
                {HOURS.map((h) => <option key={h} value={h}>{toFa(h)}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-bold text-muted">
              دقیقه
              <select
                value={mm}
                onChange={(e) => setPart(hh || '00', e.target.value)}
                className={cx(inputCls, 'num mt-1 h-9')}
              >
                <option value="">—</option>
                {MINUTES.map((m) => <option key={m} value={m}>{toFa(m)}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-2 flex gap-1.5">
            <Btn size="xs" variant="soft" onClick={() => { setPart(String(new Date().getHours()), String(new Date().getMinutes())); }}>
              الان
            </Btn>
            <Btn size="xs" variant="ghost" onClick={() => setOpen(false)}>بستن</Btn>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-muted">
            همه ساعت‌ها در برنامه ۲۴ ساعته‌اند: از ۰۰:۰۰ تا ۲۳:۵۹ (بدون AM/PM).
          </p>
        </div>
      )}
    </div>
  );
}

// ── فیلد نمره روز: نوار لغزان + ورود دستی عدد ───────────────
export function ScoreField({
  value, onChange, compact,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  compact?: boolean;
}) {
  // متن جعبه عدد تا پایان تایپ «پیش‌نویس» است؛ در غیر این صورت از خود نمره ساخته می‌شود
  const [draft, setDraft] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const txt = draft ?? (value != null ? formatScore(value) : '');

  const commit = (raw: string) => {
    setDraft(raw);
    if (!raw.trim()) {
      setErr(false);
      onChange(null);
      return;
    }
    const n = parseScoreInput(raw);
    if (n == null) {
      setErr(true);
      return;
    }
    setErr(false);
    onChange(n);
  };

  const slider = value ?? 5;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5">
        <input
          type="range"
          min={0}
          max={10}
          step={SCORE_STEP}
          value={slider}
          onChange={(e) => onChange(roundScore(Number(e.target.value)))}
          dir="ltr"
          aria-label="نمره روز (نوار لغزان)"
          className="h-2 min-w-0 flex-1 cursor-pointer accent-warn"
        />
        <input
          value={txt}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => { setDraft(null); setErr(false); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'ArrowUp' && value != null) { e.preventDefault(); onChange(roundScore(value + SCORE_STEP)); }
            if (e.key === 'ArrowDown' && value != null) { e.preventDefault(); onChange(roundScore(value - SCORE_STEP)); }
          }}
          inputMode="decimal"
          dir="ltr"
          placeholder="۸٫۵"
          title="ورود دستی نمره (۰ تا ۱۰ با یک رقم اعشار)"
          className={cx(
            inputCls,
            'num !w-20 shrink-0 text-center text-base font-black',
            err ? 'border-danger' : value != null ? 'border-warn/60 bg-warn/5' : '',
          )}
        />
        <button
          type="button"
          onClick={() => onChange(value == null ? 5 : null)}
          title={value == null ? 'ثبت نمره' : 'پاک کردن نمره'}
          className={cx(
            'grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[11px] font-black transition',
            value != null ? 'bg-warn/10 text-warn-ink ' : 'bg-sunken text-muted ',
          )}
        >
          {value != null ? <Eraser size={15} /> : <CheckIcon size={15} />}
        </button>
      </div>
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-bold text-muted">
          <span>۰ افتضاح</span>
          <span className="text-muted ">|</span>
          <span>۵ متوسط</span>
          <span className="text-muted ">|</span>
          <span>۱۰ عالی</span>
          <span className="ms-auto flex gap-1">
            {[0, 5, 7.5, 10].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onChange(v)}
                className="rounded-md bg-sunken px-1.5 py-0.5 text-[11px] font-black text-muted transition hover:bg-warn/15 hover:text-warn-ink  "
              >
                {formatScore(v)}
              </button>
            ))}
          </span>
        </div>
      )}
      {err && (
        <p className="text-[11px] font-bold text-danger-ink">
          عدد نمره معتبر نیست — بین ۰ تا ۱۰ (مثلاً ۷٫۵) وارد کنید
        </p>
      )}
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
            value === c ? 'scale-110 ring-2 ring-line-strong ring-offset-2 ' : 'opacity-80 hover:scale-105',
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
interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  edit?: Task | null;
  presetDue?: number | null;
  presetBacklog?: boolean;
}

export function TaskModal(props: TaskModalProps) {
  const { open, edit } = props;
  return (
    <Modal open={open} onClose={props.onClose} title={edit ? 'ویرایش وظیفه' : 'وظیفه جدید'} wide>
      {open && <TaskForm {...props} />}
    </Modal>
  );
}

/** فرم وظیفه — با هر بار باز شدن مودال از نو ساخته می‌شود، پس نیازی به هم‌گام‌سازی با افکت نیست */
function TaskForm({ onClose, edit, presetDue, presetBacklog }: Omit<TaskModalProps, 'open'>) {
  const { state, addTask, updateTask } = useApp();
  const [title, setTitle] = useState(edit?.title ?? '');
  const [desc, setDesc] = useState(edit?.desc ?? '');
  const [status, setStatus] = useState<TaskStatus>(edit?.status ?? 'todo');
  const [priority, setPriority] = useState<TaskPriority>(edit?.priority ?? 'medium');
  const [tagsTxt, setTagsTxt] = useState(edit?.tags.join('، ') ?? '');
  const [due, setDue] = useState<number | null>(edit ? edit.due : (presetDue !== undefined ? presetDue : null));
  const [backlog, setBacklog] = useState(edit ? !!edit.backlog : !!presetBacklog);
  const [urgent, setUrgent] = useState(edit ? (edit.urgent ?? edit.priority === 'high') : false);
  const [deadline, setDeadline] = useState<number | null>(edit?.deadline ?? null);
  const [time, setTime] = useState(edit?.time ?? '');
  const [durationMin, setDurationMin] = useState(edit?.durationMin ?? 60);
  const [actualTxt, setActualTxt] = useState(edit?.actualMin != null ? String(edit.actualMin) : '');
  const [result, setResult] = useState(edit?.result ?? '');
  const [subs, setSubs] = useState<Array<{ id: string; title: string; done: boolean }>>(edit?.subtasks.map((s) => ({ ...s })) ?? []);
  const [newSub, setNewSub] = useState('');
  const [err, setErr] = useState('');

  const save = () => {
    if (!title.trim()) { setErr('عنوان وظیفه را بنویسید'); return; }
    if (time && !normalizeClock(time)) { setErr('ساعت معتبر نیست (قالب ۲۴ ساعته مثل ۱۴:۳۰)'); return; }
    const tags = tagsTxt.split(/[،,]/).map((t) => t.trim()).filter(Boolean).slice(0, 8);
    const actualNum = Number(actualTxt.replace(/[^0-9]/g, ''));
    const actual = actualTxt.trim() === '' || !actualNum ? undefined : Math.min(10080, Math.max(1, actualNum));
    const payload = {
      title: title.trim(), desc: desc.trim() || undefined, status, priority, tags,
      due: backlog ? null : due,
      backlog,
      urgent,
      deadline,
      time: time ? normalizeClock(time) ?? undefined : undefined,
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
        <Field label="اهمیت (آیزنهاور)">
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputCls}>
            {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
              <option key={p} value={p}>{PRIORITY_META[p].label}</option>
            ))}
          </select>
        </Field>
        <Field label="فوریت (آیزنهاور)">
          <Segmented
            value={urgent ? 'urgent' : 'not'}
            onChange={(v) => setUrgent(v === 'urgent')}
            options={[{ v: 'urgent', label: '🔥 فوری' }, { v: 'not', label: 'غیرفوری' }]}
          />
        </Field>
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
        <Field label="ساعت شروع (۲۴ ساعته — برای تایم‌لاین)">
          <TimeField value={time} onChange={setTime} placeholder="۰۹:۳۰" />
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
            className={cx(inputCls, 'num text-center')}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="زمان واقعی صرف‌شده (دقیقه — اختیاری)">
          <input value={actualTxt} onChange={(e) => setActualTxt(e.target.value.replace(/[^0-9۰-۹]/g, ''))} inputMode="numeric" placeholder="مثلاً ۹۰" className={cx(inputCls, 'num')} />
        </Field>
        <Field label="یادداشت / نتیجه (اختیاری)">
          <input value={result} onChange={(e) => setResult(e.target.value)} placeholder="نتیجه انجام…" className={inputCls} />
        </Field>
      </div>
      {(state.taskCats ?? []).length > 0 && (
        <div>
          <span className="mb-1.5 block text-xs font-bold text-ink-2 ">دسته (اختیاری)</span>
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
                    on ? 'border-transparent text-white' : 'border-line text-muted hover:border-line-strong  ',
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
      <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-line px-3.5 py-3 text-xs font-bold text-muted  ">
        <input type="checkbox" checked={backlog} onChange={(e) => setBacklog(e.target.checked)} className="h-4 w-4 accent-brand" />
        <span>
          نگه داشتن در بک‌لاگ
          <span className="block text-[11px] font-normal text-muted">کار بدون روز مشخص؛ بعداً با یک کلیک زمان‌بندی‌اش کن</span>
        </span>
      </label>
      <div>
        <span className="mb-1.5 block text-xs font-bold text-ink-2 ">زیروظایف</span>
        <div className="space-y-2 rounded-2xl border border-line bg-surface-2 p-3  dark:bg-white/[0.02]">
          {subs.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSubs((p) => p.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
                className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition', s.done ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface  dark:bg-transparent')}
              >
                {s.done && <Check size={14} />}
              </button>
              <input
                value={s.title}
                onChange={(e) => setSubs((p) => p.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
                className={cx(inputCls, 'h-9', s.done && 'line-through opacity-60')}
                placeholder="عنوان زیروظیفه"
              />
              <button type="button" onClick={() => setSubs((p) => p.filter((x) => x.id !== s.id))} className="grid grid-cols-1 h-9 w-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-danger/10 hover:text-danger-ink">
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
      {err && <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs font-bold text-danger-ink ">{err}</p>}
      <div className="flex justify-end gap-2">
      <Btn variant="ghost" onClick={onClose}>انصراف</Btn>
      <Btn onClick={save}>{edit ? 'ذخیره تغییرات' : 'افزودن وظیفه'}</Btn>
      </div>
    </div>
  );
}

// ── مودال رویداد ────────────────────────────────────────────
interface EventModalProps {
  open: boolean;
  onClose: () => void;
  edit?: CalEvent | null;
  presetDay?: number | null;
}

export function EventModal(props: EventModalProps) {
  const { open, edit } = props;
  return (
    <Modal open={open} onClose={props.onClose} title={edit ? 'ویرایش رویداد' : 'رویداد جدید'}>
      {open && <EventForm {...props} />}
    </Modal>
  );
}

/** فرم رویداد — با هر باز شدن از نو ساخته می‌شود */
function EventForm({ onClose, edit, presetDay }: Omit<EventModalProps, 'open'>) {
  const { addEvent, updateEvent } = useApp();
  const [title, setTitle] = useState(edit?.title ?? '');
  const [day, setDay] = useState<number | null>(edit?.day ?? presetDay ?? todayStart());
  const [time, setTime] = useState(edit?.time ?? '');
  const [color, setColor] = useState(edit?.color ?? EVENT_COLORS[0]);
  const [desc, setDesc] = useState(edit?.desc ?? '');
  const [err, setErr] = useState('');

  const save = () => {
    if (!title.trim()) { setErr('عنوان رویداد را بنویسید'); return; }
    if (day == null) { setErr('روز رویداد را انتخاب کنید'); return; }
    const t = time ? normalizeClock(time) : '';
    if (time && !t) { setErr('ساعت معتبر نیست (قالب ۲۴ ساعته مثل ۱۴:۳۰)'); return; }
    if (edit) updateEvent(edit.id, { title: title.trim(), day, time: t ?? '', color, desc: desc.trim() || undefined });
    else addEvent({ title: title.trim(), day, time: t ?? '', color, desc: desc.trim() || undefined });
    onClose();
  };

  return (
    <div className="space-y-4">
      <Field label="عنوان رویداد">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="مثلاً جلسه تیم طراحی" />
      </Field>
      <Field label="روز">
        <JalaliDateField value={day} onChange={setDay} allowClear={false} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="ساعت (۲۴ ساعته — اختیاری)">
          <TimeField value={time} onChange={setTime} placeholder="۱۰:۰۰" />
        </Field>
        <Field label="یادداشت">
          <input value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} placeholder="مکان یا توضیح…" />
        </Field>
      </div>
      <Field label="رنگ">
        <ColorDots colors={EVENT_COLORS} value={color} onChange={setColor} />
      </Field>
      {err && <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs font-bold text-danger-ink ">{err}</p>}
      <div className="flex justify-end gap-2">
      <Btn variant="ghost" onClick={onClose}>انصراف</Btn>
      <Btn onClick={save}>{edit ? 'ذخیره تغییرات' : 'افزودن رویداد'}</Btn>
      </div>
    </div>
  );
}

// ── مودال عادت ──────────────────────────────────────────────
interface HabitModalProps {
  open: boolean;
  onClose: () => void;
  edit?: Habit | null;
}

export function HabitModal(props: HabitModalProps) {
  const { open, edit } = props;
  return (
    <Modal open={open} onClose={props.onClose} title={edit ? 'ویرایش عادت' : 'عادت جدید'} sub="کوچک شروع کن، مداوم ادامه بده">
      {open && <HabitForm {...props} />}
    </Modal>
  );
}

/** فرم عادت — با هر باز شدن از نو ساخته می‌شود */
function HabitForm({ onClose, edit }: Omit<HabitModalProps, 'open'>) {
  const { addHabit, updateHabit } = useApp();
  const [title, setTitle] = useState(edit?.title ?? '');
  const [color, setColor] = useState(edit?.color ?? HABIT_COLORS[0]);
  const [target, setTarget] = useState(edit?.targetPerWeek ?? 5);
  const [err, setErr] = useState('');

  const save = () => {
    if (!title.trim()) { setErr('نام عادت را بنویسید'); return; }
    if (edit) updateHabit(edit.id, { title: title.trim(), color, targetPerWeek: target });
    else addHabit({ title: title.trim(), color, targetPerWeek: target });
    onClose();
  };

  return (
    <div className="space-y-4">
      <Field label="نام عادت">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="مثلاً ۲۰ دقیقه مطالعه" />
      </Field>
      <Field label="رنگ">
        <ColorDots colors={HABIT_COLORS} value={color} onChange={setColor} />
      </Field>
      <Field label="هدف هفتگی (روز در هفته)">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setTarget(n)}
              className={cx(
                'num grid h-10 flex-1 place-items-center rounded-xl text-sm font-black transition',
                target === n ? 'text-white shadow-md' : 'bg-sunken text-muted hover:bg-sunken  ',
              )}
              style={target === n ? { background: color } : undefined}
            >
              {toFa(n)}
            </button>
          ))}
        </div>
      </Field>
      {err && <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs font-bold text-danger-ink ">{err}</p>}
      <div className="flex justify-end gap-2">
      <Btn variant="ghost" onClick={onClose}>انصراف</Btn>
      <Btn onClick={save}>{edit ? 'ذخیره تغییرات' : 'افزودن عادت'}</Btn>
      </div>
    </div>
  );
}

// ── مودال یادداشت ───────────────────────────────────────────
interface NoteModalProps {
  open: boolean;
  onClose: () => void;
  edit?: Note | null;
}

export function NoteModal(props: NoteModalProps) {
  const { open, edit } = props;
  return (
    <Modal open={open} onClose={props.onClose} title={edit ? 'ویرایش یادداشت' : 'یادداشت جدید'} wide>
      {open && <NoteForm {...props} />}
    </Modal>
  );
}

/** فرم یادداشت — با هر باز شدن از نو ساخته می‌شود */
function NoteForm({ onClose, edit }: Omit<NoteModalProps, 'open'>) {
  const { addNote, updateNote } = useApp();
  const [title, setTitle] = useState(edit?.title ?? '');
  const [body, setBody] = useState(edit?.body ?? '');
  const [color, setColor] = useState(edit?.color ?? NOTE_COLORS[0]);
  const [tagsTxt, setTagsTxt] = useState(edit?.tags.join('، ') ?? '');
  const [pinned, setPinned] = useState(edit?.pinned ?? false);

  const save = () => {
    if (!title.trim() && !body.trim()) { onClose(); return; }
    const tags = tagsTxt.split(/[،,]/).map((t) => t.trim()).filter(Boolean).slice(0, 6);
    if (edit) updateNote(edit.id, { title: title.trim(), body, color, tags, pinned });
    else addNote({ title: title.trim() || 'بدون عنوان', body, color, tags, pinned });
    onClose();
  };

  return (
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
                aria-label={`رنگ ${c}`}
                onClick={() => setColor(c)}
                className={cx('h-9 w-9 rounded-full border transition-all', color === c ? 'scale-110 border-line-strong ring-2 ring-line-strong' : 'border-line hover:scale-105')}
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-ink-2 ">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 accent-brand" />
        سنجاق شود (بالای لیست بماند)
      </label>
      <div className="flex justify-end gap-2">
      <Btn variant="ghost" onClick={onClose}>انصراف</Btn>
      <Btn onClick={save}>{edit ? 'ذخیره تغییرات' : 'ذخیره یادداشت'}</Btn>
      </div>
    </div>
  );
}
