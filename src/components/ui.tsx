import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cx } from '../lib/utils';

export function Card({ children, className, hover }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.05)] dark:border-white/10 dark:bg-slate-900',
        hover && 'transition-all hover:shadow-lg hover:-translate-y-0.5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div>
        <h3 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100">{title}</h3>
        {sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Btn({
  children, onClick, variant = 'primary', size = 'md', className, type, disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'soft' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xs';
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const v = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20',
    soft: 'bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/15 dark:text-emerald-300 dark:bg-emerald-400/10',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/20',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5',
  }[variant];
  const s = {
    xs: 'h-7 px-2.5 text-[11px] rounded-lg',
    sm: 'h-8 px-3 text-xs rounded-xl',
    md: 'h-10 px-4 text-[13px] rounded-xl',
    lg: 'h-12 px-6 text-sm rounded-2xl',
  }[size];
  return (
    <button
      type={type ?? 'button'}
      disabled={disabled}
      onClick={onClick}
      className={cx('inline-flex items-center justify-center gap-1.5 font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none', v, s, className)}
    >
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full h-10 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-[13px] text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:bg-slate-900';

export function Empty({ icon, title, sub, action }: { icon: ReactNode; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
        {icon}
      </div>
      <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{title}</p>
      {sub && <p className="mt-1 max-w-xs text-xs leading-6 text-slate-500 dark:text-slate-400">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

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
  // بستن با Escape + قفل اسکرول پس‌زمینه هنگام باز بودن مودال
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={cx(
              'w-full rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-slate-900',
              wide ? 'max-w-2xl' : 'max-w-lg',
            )}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/5">
              <div>
                <h3 className="text-[15px] font-extrabold text-slate-900 dark:text-white">{title}</h3>
                {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
              </div>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white">
                <X size={17} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Progress({ value, color = '#10b981', h = 8 }: { value: number; color?: string; h?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" style={{ height: h }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ type: 'spring', damping: 25, stiffness: 160 }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'red' | 'amber' | 'blue' | 'violet' | 'pink' }) {
  const map: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
    green: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    red: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    blue: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    pink: 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
  };
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold', map[tone])}>{children}</span>;
}

export function Segmented<T extends string>({
  options, value, onChange,
}: {
  options: Array<{ v: T; label: string; icon?: ReactNode }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cx(
            'flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all',
            value === o.v
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Confirm({ open, onClose, onYes, title, desc }: { open: boolean; onClose: () => void; onYes: () => void; title: string; desc?: string }) {
  return (
    <Modal open={open} onClose={onClose} title={title} sub={desc}>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Btn variant="ghost" onClick={onClose}>انصراف</Btn>
        <Btn variant="danger" onClick={() => { onYes(); onClose(); }}>حذف شود</Btn>
      </div>
    </Modal>
  );
}
