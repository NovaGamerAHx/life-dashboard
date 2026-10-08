import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cx } from '../lib/utils';

/* ════════════════════════════════════════════════════════════════
   کامپوننت‌های پایه‌ی یکدست — همه‌ی صفحات فقط از این فایل استفاده می‌کنند
   ════════════════════════════════════════════════════════════════ */

// ── کارت و سربرگ کارت ────────────────────────────────────────────
export function Card({
  children, className, hover,
}: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div
      className={cx(
        'flex min-w-0 flex-col rounded-card border border-line bg-surface shadow-card',
        hover && 'transition duration-200 hover:-translate-y-0.5 hover:shadow-pop',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHead({
  title, sub, action, id,
}: { title: string; sub?: string; action?: ReactNode; id?: string }) {
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2.5 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
      <div className="min-w-0 flex-1 basis-48">
        <h3 id={id} className="t-h2 text-ink">{title}</h3>
        {sub && <p className="t-caption mt-0.5 text-muted">{sub}</p>}
      </div>
      {action && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-1.5">{action}</div>}
    </div>
  );
}

/** بدنهٔ کارت با فاصله‌ی یکسان در همه‌ی صفحات */
export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('min-w-0 px-4 pb-4 sm:px-5 sm:pb-5', className)}>{children}</div>;
}

// ── دکمه ────────────────────────────────────────────────────────
export type BtnVariant = 'primary' | 'soft' | 'ghost' | 'danger' | 'outline';
export type BtnSize = 'xs' | 'sm' | 'md' | 'lg';

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: 'bg-brand text-white shadow-glow hover:bg-brand-strong',
  soft: 'bg-brand-soft text-brand-ink hover:brightness-95 dark:hover:brightness-110',
  ghost: 'text-ink-2 hover:bg-sunken',
  danger: 'bg-danger text-white shadow-sm hover:brightness-110',
  outline: 'border border-line-strong bg-surface text-ink hover:bg-surface-2',
};

const BTN_SIZE: Record<BtnSize, string> = {
  xs: 'min-h-7 rounded-lg px-2.5 text-xs',
  sm: 'min-h-9 rounded-xl px-3 text-xs',
  md: 'min-h-10 rounded-xl px-4 text-sm',
  lg: 'min-h-12 rounded-2xl px-6 text-base',
};

export function Btn({
  children, onClick, variant = 'primary', size = 'md', className, type, disabled, title, ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  size?: BtnSize;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  title?: string;
  /** برای دکمه‌های فقط‌آیکن */
  ariaLabel?: string;
}) {
  return (
    <button
      type={type ?? 'button'}
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className={cx(
        'inline-flex max-w-full items-center justify-center gap-1.5 whitespace-normal text-center font-bold leading-snug transition duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        BTN_VARIANT[variant],
        BTN_SIZE[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

/** دکمه‌ی فقط‌آیکن مربع با ناحیه‌ی لمسی مناسب */
export function IconBtn({
  icon, label, onClick, tone = 'muted', className, disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  tone?: 'muted' | 'sky' | 'rose' | 'amber' | 'brand';
  className?: string;
  disabled?: boolean;
}) {
  const toneCls = {
    muted: 'text-muted hover:bg-sunken hover:text-ink',
    sky: 'text-muted hover:bg-info-soft hover:text-info-ink',
    rose: 'text-muted hover:bg-danger-soft hover:text-danger-ink',
    amber: 'text-muted hover:bg-warn-soft hover:text-warn-ink',
    brand: 'text-muted hover:bg-brand-soft hover:text-brand-ink',
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={cx(
        'grid size-9 shrink-0 place-items-center rounded-xl transition disabled:opacity-40',
        toneCls,
        className,
      )}
    >
      {icon}
    </button>
  );
}

// ── فیلد و ورودی ────────────────────────────────────────────────
export function Field({
  label, children, hint, error,
}: { label: string; children: ReactNode; hint?: string; error?: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-bold text-ink-2">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-bold text-danger-ink">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs leading-5 text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

/** کلاس واحد همه‌ی ورودی‌ها، سلکت‌ها و تکست‌اریا‌ها */
export const inputCls =
  'min-h-10 w-full min-w-0 rounded-xl border border-line-strong bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/80 focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/15 disabled:opacity-60';

// ── حالت خالی و لودینگ ──────────────────────────────────────────
export function Empty({
  icon, title, sub, action, compact,
}: { icon: ReactNode; title: string; sub?: string; action?: ReactNode; compact?: boolean }) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface-2/60 px-5 text-center',
        compact ? 'py-6' : 'py-10',
      )}
    >
      <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-sunken text-muted">{icon}</div>
      <p className="t-h2 text-ink">{title}</p>
      {sub && <p className="t-caption mt-1 max-w-sm text-muted">{sub}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('shimmer-line rounded-xl', className)} />;
}

/** لودینگ صفحه (Suspense) — ساختار نزدیک به چیدمان واقعی */
export function PageSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">در حال بارگذاری…</span>
      <Skeleton className="h-32 rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="hidden h-24 xl:block" />
        <Skeleton className="hidden h-24 xl:block" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

// ── سربرگ صفحه ─────────────────────────────────────────────────
export function PageHeader({
  title, desc, actions, icon,
}: { title: string; desc?: string; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1 basis-56">
        <h2 className="t-h1 text-ink">{title}</h2>
        {desc && <p className="t-caption mt-0.5 text-muted">{desc}</p>}
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── کاشی آماری و آیکن رنگی ─────────────────────────────────────
export type Tone = 'brand' | 'sky' | 'amber' | 'violet' | 'rose' | 'teal' | 'lime' | 'indigo' | 'slate';

const TONE_GRAD: Record<Tone, string> = {
  brand: 'from-emerald-700 to-teal-700',
  sky: 'from-sky-700 to-blue-700',
  amber: 'from-amber-600 to-orange-700',
  violet: 'from-violet-700 to-purple-700',
  rose: 'from-rose-700 to-pink-700',
  teal: 'from-teal-700 to-cyan-700',
  lime: 'from-lime-700 to-green-700',
  indigo: 'from-indigo-700 to-blue-800',
  slate: 'from-slate-600 to-slate-800',
};

export function IconTile({ icon, tone = 'brand', size = 'md' }: { icon: ReactNode; tone?: Tone; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm',
        size === 'md' ? 'size-10' : 'size-8 rounded-lg',
        TONE_GRAD[tone],
      )}
    >
      {icon}
    </span>
  );
}

/**
 * کاشی آمار: آیکن + برچسب + مقدار + توضیح. در همه‌ی صفحات یک قالب دارد.
 * `subTone` رنگ توضیح را مشخص می‌کند (خنثی/مثبت/منفی).
 */
export function StatTile({
  icon, label, value, sub, tone = 'brand', subTone = 'muted', delta,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  subTone?: 'muted' | 'good' | 'bad';
  delta?: ReactNode;
}) {
  const subCls = { muted: 'text-muted', good: 'text-brand-ink', bad: 'text-danger-ink' }[subTone];
  return (
    <Card className="h-full min-w-0 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <IconTile icon={icon} tone={tone} />
        {delta}
      </div>
      <p className="t-caption font-bold text-muted">{label}</p>
      <p className="num mt-0.5 break-words text-lg font-black leading-tight text-ink sm:text-xl">{value}</p>
      {sub && <p className={cx('t-caption mt-1 font-bold', subCls)}>{sub}</p>}
    </Card>
  );
}

// ── Progress (نوار پیشرفت با ARIA) ──────────────────────────────
export function Progress({
  value, color = 'var(--c-brand)', h = 8, label,
}: { value: number; color?: string; h?: number; label?: string }) {
  const v = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      aria-label={label}
      className="w-full overflow-hidden rounded-full bg-sunken"
      style={{ height: h }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${v}%` }}
        transition={{ type: 'spring', damping: 25, stiffness: 160 }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

// ── برچسب وضعیت ─────────────────────────────────────────────────
export type BadgeTone = 'slate' | 'green' | 'red' | 'amber' | 'blue' | 'violet' | 'pink';

const BADGE: Record<BadgeTone, string> = {
  slate: 'bg-sunken text-ink-2',
  green: 'bg-brand-soft text-brand-ink',
  red: 'bg-danger-soft text-danger-ink',
  amber: 'bg-warn-soft text-warn-ink',
  blue: 'bg-info-soft text-info-ink',
  violet: 'bg-violet-soft text-violet-ink',
  pink: 'bg-danger-soft text-danger-ink',
};

export function Badge({ children, tone = 'slate', className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span className={cx('inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold leading-5', BADGE[tone], className)}>
      {children}
    </span>
  );
}

/** تیک کوچک برای چک‌باکس‌ها و وضعیت «انجام شد» */
export function CheckIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// ── Segmented (فیلتر پیل‌شکل با radiogroup) ─────────────────────
export function Segmented<T extends string>({
  options, value, onChange, label,
}: {
  options: Array<{ v: T; label: string; icon?: ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (from: number, dir: 1 | -1) => {
    const next = (from + dir + options.length) % options.length;
    onChange(options[next].v);
    refs.current[next]?.focus();
  };
  const onKey = (i: number) => (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    // در RTL، فلش چپ به گزینهٔ بعدی (بصری) می‌رود
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); move(i, 1); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); move(i, -1); }
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-2xl border border-line bg-surface-2 p-1"
    >
      {options.map((o, i) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onKeyDown={onKey(i)}
            onClick={() => onChange(o.v)}
            className={cx(
              'flex min-h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition',
              on
                ? 'bg-surface text-ink shadow-sm ring-1 ring-line'
                : 'text-muted hover:text-ink',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Tabs (تب زیرخطی با ARIA و کیبورد) ──────────────────────────
export function Tabs<T extends string>({
  items, value, onChange, label, className,
}: {
  items: Array<{ v: T; label: string; icon?: ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKey = (i: number) => (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    let next = -1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = (i + 1) % items.length;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = (i - 1 + items.length) % items.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = items.length - 1;
    if (next >= 0) {
      e.preventDefault();
      onChange(items[next].v);
      refs.current[next]?.focus();
    }
  };
  return (
    <div role="tablist" aria-label={label} className={cx('flex max-w-full gap-1 overflow-x-auto', className)}>
      {items.map((it, i) => {
        const on = it.v === value;
        return (
          <button
            key={it.v}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            type="button"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onKeyDown={onKey(i)}
            onClick={() => onChange(it.v)}
            className={cx(
              'flex min-h-9 shrink-0 items-center gap-1.5 border-b-2 px-3 text-xs font-bold transition',
              on ? 'border-brand text-brand-ink' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {it.icon}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Switch ─────────────────────────────────────────────────────
export function Switch({
  checked, onChange, label, size = 'md',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const dims = size === 'sm' ? { track: 'h-6 w-10', knob: 'size-4', pos: '-translate-x-[18px]' } : { track: 'h-7 w-12', knob: 'size-5', pos: '-translate-x-[22px]' };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex shrink-0 items-center rounded-full border p-0.5 transition-colors',
        dims.track,
        checked ? 'border-brand bg-brand' : 'border-line-strong bg-sunken',
      )}
    >
      <span
        className={cx(
          'block rounded-full bg-white shadow transition-transform',
          dims.knob,
          checked ? dims.pos : 'translate-x-0',
        )}
      />
    </button>
  );
}

// ── Chip (فیلتر/گزینهٔ انتخابی) ────────────────────────────────
export function Chip({
  active, onClick, children, tone = 'brand', title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  tone?: 'brand' | 'slate' | 'amber' | 'violet';
  title?: string;
}) {
  const on = {
    brand: 'border-brand bg-brand-soft text-brand-ink',
    slate: 'border-ink-2 bg-sunken text-ink',
    amber: 'border-warn bg-warn-soft text-warn-ink',
    violet: 'border-violet bg-violet-soft text-violet-ink',
  }[tone];
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active ?? false}
      onClick={onClick}
      className={cx(
        'inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition active:scale-[0.97]',
        active ? on : 'border-line-strong text-ink-2 hover:bg-surface-2',
      )}
    >
      {children}
    </button>
  );
}

// ── مودال (فوکوس، Esc، قفل اسکرول، بازگرداندن فوکوس) ───────────
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({
  open, onClose, title, sub, children, wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  sub?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = panelRef.current;
    // فوکوس روی خود پنل (نه ورودی اول) تا کیبورد موبایل ناگهان باز نشود
    panel?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-scrim p-3 backdrop-blur-sm sm:p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={cx(
              'flex max-h-[calc(100dvh-1.5rem)] w-full min-w-0 flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-pop outline-none',
              wide ? 'max-w-2xl' : 'max-w-lg',
            )}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <h3 id={titleId} className="t-h2 text-ink">{title}</h3>
                {sub && <p className="t-caption mt-0.5 text-muted">{sub}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="بستن"
                className="grid size-9 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-sunken hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Confirm({
  open, onClose, onYes, title, desc,
}: { open: boolean; onClose: () => void; onYes: () => void; title: string; desc?: string }) {
  return (
    <Modal open={open} onClose={onClose} title={title} sub={desc}>
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <Btn variant="ghost" onClick={onClose}>انصراف</Btn>
        <Btn variant="danger" onClick={() => { onYes(); onClose(); }}>حذف شود</Btn>
      </div>
    </Modal>
  );
}

// ── جدول واکنش‌گرا: در موبایل اسکرول افقی داخلی دارد، صفحه نه ─────
export function TableWrap({ children, minWidth = 640, label }: { children: ReactNode; minWidth?: number; label?: string }) {
  return (
    <div className="-mx-1 overflow-x-auto rounded-xl" role="region" aria-label={label} tabIndex={0}>
      <div className="px-1" style={{ minWidth }}>{children}</div>
    </div>
  );
}

/** کلاس‌های یکدست جدول */
export const thCls = 'border-b border-line px-3 py-2.5 text-start text-xs font-bold text-muted whitespace-nowrap';
export const tdCls = 'border-b border-line/70 px-3 py-2.5 align-middle text-ink-2 last:border-0';
