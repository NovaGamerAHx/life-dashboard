import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Search, Sun, Moon, Monitor, X, CheckCircle2, CalendarClock,
  NotebookPen, ArrowLeft, Flame, StickyNote, MoreHorizontal,
} from 'lucide-react';
import { useApp } from '../lib/store';
import type { ViewKey } from '../lib/types';
import { cx } from '../lib/utils';
import { formatGregorian, formatJalali, formatScore, toFa, todayStart } from '../lib/jalali';
import { smartDue } from './navBadges';
import { MOBILE_NAV, NAV, TITLES } from './nav';

export type QuickKind = 'task' | 'event' | 'note' | 'habit';

function Logo() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-grad text-white shadow-glow">
        <SparkMini />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[15px] font-black leading-5 text-ink">میزکار زندگی</div>
        <div className="truncate text-xs font-bold text-muted">وظایف، عادت‌ها و روزهای بهتر</div>
      </div>
    </div>
  );
}

function SparkMini() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" opacity="0.6" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ThemeBtn() {
  const { state, setTheme } = useApp();
  const cur = state.settings.theme;
  const next = cur === 'light' ? 'dark' : cur === 'dark' ? 'system' : 'light';
  const Icon = cur === 'light' ? Sun : cur === 'dark' ? Moon : Monitor;
  const title = cur === 'light'
    ? 'تم روشن — کلیک برای تیره'
    : cur === 'dark'
      ? 'تم تیره — کلیک برای خودکار'
      : 'تم خودکار — کلیک برای روشن';
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={title}
      aria-label={title}
      className="grid size-10 shrink-0 place-items-center rounded-xl border border-line-strong bg-surface text-ink-2 transition hover:border-brand hover:text-brand-ink"
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

type SearchHit = { icon: ReactNode; title: string; sub: string; to: string; tone: string };

function GlobalSearch() {
  const { state } = useApp();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  // بستن با Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setQ(''); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const results = useMemo(() => {
    const needle = q.trim();
    if (needle.length < 2) return null;
    const out: SearchHit[] = [];
    for (const t of state.tasks) {
      if (out.length >= 10) break;
      if (t.title.includes(needle) || (t.desc ?? '').includes(needle) || t.tags.some((x) => x.includes(needle))) {
        out.push({
          icon: <CheckCircle2 size={15} />,
          title: t.title,
          sub: `وظیفه • ${smartDue(t.due)}`,
          to: t.backlog ? '/backlog' : '/tasks',
          tone: 'bg-info-soft text-info-ink',
        });
      }
    }
    for (const e of state.events) {
      if (out.length >= 10) break;
      if (e.title.includes(needle) || (e.desc ?? '').includes(needle)) {
        out.push({
          icon: <CalendarClock size={15} />,
          title: e.title,
          sub: `رویداد • ${formatJalali(e.day)}`,
          to: '/calendar',
          tone: 'bg-violet-soft text-violet-ink',
        });
      }
    }
    for (const n of state.notes) {
      if (out.length >= 10) break;
      if (n.title.includes(needle) || n.body.includes(needle)) {
        out.push({
          icon: <NotebookPen size={15} />,
          title: n.title || 'بدون عنوان',
          sub: 'یادداشت',
          to: '/notes',
          tone: 'bg-warn-soft text-warn-ink',
        });
      }
    }
    for (const h of state.habits) {
      if (out.length >= 10) break;
      if (h.title.includes(needle)) {
        out.push({
          icon: <Flame size={15} />,
          title: h.title,
          sub: 'عادت',
          to: '/habits',
          tone: 'bg-brand-soft text-brand-ink',
        });
      }
    }
    for (const r of state.reflections ?? []) {
      if (out.length >= 10) break;
      const hay = `${r.dayNote ?? ''} ${r.wins} ${r.lessons} ${r.gratitude} ${r.improve ?? ''}`;
      if (hay.includes(needle)) {
        out.push({
          icon: <StickyNote size={15} />,
          title: formatJalali(r.day, { weekday: true }),
          sub: `بازتاب روز${r.score != null ? ` • نمره ${formatScore(r.score)}` : ' • نمره ثبت نشده'}`,
          to: `/today?day=${r.day}`,
          tone: 'bg-danger-soft text-danger-ink',
        });
      }
    }
    return out;
  }, [q, state]);

  const close = () => { setOpen(false); setQ(''); };
  const go = (to: string) => {
    nav(to);
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="جست‌وجو"
        className="flex h-10 min-w-0 shrink-0 items-center gap-2 rounded-xl border border-line-strong bg-surface px-2.5 text-xs font-bold text-muted transition hover:border-brand sm:w-auto sm:flex-1 sm:max-w-xs sm:shrink"
      >
        <Search size={17} aria-hidden="true" className="shrink-0" />
        <span className="hidden truncate sm:inline">جست‌وجوی همه‌چیز…</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] overflow-y-auto bg-scrim p-3 backdrop-blur-sm sm:p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="جست‌وجو"
              initial={{ opacity: 0, y: -18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.98 }}
              className="mx-auto mt-12 flex max-h-[calc(100dvh-6rem)] w-full max-w-xl min-w-0 flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-pop sm:mt-16"
            >
              <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 sm:px-4">
                <Search size={18} aria-hidden="true" className="shrink-0 text-muted" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="متن جست‌وجو"
                  placeholder="وظیفه، رویداد، یادداشت، عادت یا متن بازتاب…"
                  className="h-14 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/80"
                />
                <button
                  type="button"
                  onClick={close}
                  aria-label="بستن جست‌وجو"
                  className="grid size-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-sunken hover:text-ink"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {!results ? (
                  <p className="px-3 py-8 text-center text-xs text-muted">حداقل ۲ حرف بنویسید تا در همه بخش‌ها جست‌وجو شود</p>
                ) : results.length === 0 ? (
                  <p className="px-3 py-8 text-center text-xs text-muted">چیزی پیدا نشد</p>
                ) : (
                  results.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => go(r.to)}
                      className="flex w-full min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition hover:bg-surface-2"
                    >
                      <span className={cx('grid size-9 shrink-0 place-items-center rounded-xl', r.tone)} aria-hidden="true">{r.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold text-ink">{r.title}</span>
                        <span className="block truncate text-xs text-muted">{r.sub}</span>
                      </span>
                      <ArrowLeft size={15} aria-hidden="true" className="shrink-0 text-muted" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function QuickAdd({ onPick }: { onPick: (k: QuickKind) => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const items = [
    { k: 'task' as const, label: 'وظیفه', icon: <CheckCircle2 size={17} />, c: 'from-sky-700 to-blue-700' },
    { k: 'event' as const, label: 'رویداد', icon: <CalendarClock size={17} />, c: 'from-violet-700 to-purple-700' },
    { k: 'habit' as const, label: 'عادت', icon: <Flame size={17} />, c: 'from-amber-600 to-orange-700' },
    { k: 'note' as const, label: 'یادداشت', icon: <StickyNote size={17} />, c: 'from-emerald-700 to-teal-700' },
  ];

  return (
    <div className="relative shrink-0">
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} aria-hidden="true" />
            <motion.div
              role="menu"
              aria-label="افزودن سریع"
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              className="absolute end-0 top-full z-[61] mt-2 w-52 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-pop"
            >
              {items.map((it) => (
                <button
                  key={it.k}
                  type="button"
                  role="menuitem"
                  onClick={() => { setOpen(false); onPick(it.k); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-bold text-ink-2 transition hover:bg-surface-2 hover:text-ink"
                >
                  <span className={cx('grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white', it.c)} aria-hidden="true">{it.icon}</span>
                  {it.label} جدید
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="افزودن سریع"
        className="flex h-10 items-center gap-2 rounded-xl bg-brand px-3 text-sm font-black text-white shadow-glow transition hover:bg-brand-strong sm:px-4"
      >
        <motion.span animate={{ rotate: open ? 45 : 0 }} className="grid place-items-center"><Plus size={18} strokeWidth={2.8} aria-hidden="true" /></motion.span>
        <span className="hidden sm:inline">افزودن سریع</span>
      </motion.button>
    </div>
  );
}

/** صفحهٔ «بیشتر» در موبایل: همه‌ی بخش‌ها را نشان می‌دهد */
function MoreSheet({ open, onClose, badges }: { open: boolean; onClose: () => void; badges: Partial<Record<ViewKey, number>> }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="no-print fixed inset-0 z-[70] flex items-end bg-scrim lg:hidden"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="همه‌ی بخش‌ها"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl border-t border-line bg-surface px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-pop outline-none"
          >
            <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-line-strong" aria-hidden="true" />
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="t-h2 text-ink">همه‌ی بخش‌ها</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="بستن"
                className="grid size-9 place-items-center rounded-xl text-muted hover:bg-sunken hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <nav aria-label="همه‌ی بخش‌ها" className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3">
              {NAV.map((n) => {
                const count = badges[n.key];
                return (
                  <NavLink
                    key={n.key}
                    to={n.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cx(
                        'relative flex min-w-0 flex-col items-start gap-2 rounded-2xl border p-3 transition',
                        isActive ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface-2 text-ink-2 hover:border-line-strong',
                      )
                    }
                  >
                    <span className="flex w-full items-center justify-between">
                      <span className="grid size-9 place-items-center rounded-xl bg-surface text-current shadow-sm" aria-hidden="true">{n.icon}</span>
                      {count != null && count > 0 && (
                        <span className="num grid min-h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[11px] font-black text-white">
                          {toFa(count > 99 ? '۹۹+' : count)}
                        </span>
                      )}
                    </span>
                    <span className="block w-full truncate text-[13px] font-bold">{n.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Shell({
  children, onQuickAdd,
}: {
  children: ReactNode;
  onQuickAdd: (k: QuickKind) => void;
}) {
  const loc = useLocation();
  const { state } = useApp();
  const gregFirst = state.settings.calSystem === 'gregorian';
  const meta = TITLES[loc.pathname] ?? TITLES['/'];
  const badges = useNavBadges();
  const today = todayStart();
  const scoreToday = (state.reflections ?? []).find((r) => r.day === today)?.score;
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = () => setMoreOpen(false);

  return (
    <div className="min-h-dvh bg-bg text-ink">
      {/* دکور پس‌زمینه (فقط تزئینی) */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 size-96 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute top-1/3 -left-32 size-80 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      {/* سایدبار دسکتاپ (سمت راست) */}
      <aside className="no-print fixed inset-y-0 right-0 z-40 hidden w-[264px] flex-col border-l border-line bg-surface/90 px-4 py-5 backdrop-blur-xl lg:flex">
        <div className="px-1.5"><Logo /></div>
        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto overscroll-contain pb-2" aria-label="منوی اصلی">
          {NAV.map((n) => {
            const count = badges[n.key];
            return (
              <NavLink
                key={n.key}
                to={n.to}
                title={n.hint}
                className={({ isActive }) =>
                  cx(
                    'group flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2 text-[13px] font-bold transition-colors',
                    isActive
                      ? 'bg-brand text-white shadow-glow'
                      : 'text-ink-2 hover:bg-sunken hover:text-ink',
                  )
                }
              >
                <span className="shrink-0" aria-hidden="true">{n.icon}</span>
                <span className="min-w-0 flex-1 truncate">{n.label}</span>
                {count != null && count > 0 && (
                  <span className="num grid min-h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[11px] font-black text-white">
                    {toFa(count > 99 ? '۹۹+' : count)}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-4 rounded-2xl bg-brand-grad p-4 text-white">
          <p className="text-xs font-black">امروز {formatJalali(today, { weekday: true })}</p>
          <p className="t-caption mt-1 text-white/90">
            {scoreToday != null
              ? `نمره امروزت ${formatScore(scoreToday)} از ۱۰ ثبت شده — فردا هم بهترش کن.`
              : 'قدم‌های کوچکِ هر روز، تغییرهای بزرگ می‌سازند.'}
          </p>
        </div>
      </aside>

      {/* ستون اصلی */}
      <div className="flex min-h-dvh min-w-0 flex-col lg:pr-[264px]">
        {/* هدر واحد و چسبان */}
        <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1200px] min-w-0 items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-grad text-white lg:hidden" aria-hidden="true">
              <SparkMini />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-black leading-6 text-ink sm:text-base">{meta.t}</h1>
              <p className="t-caption hidden truncate text-muted sm:block">
                {gregFirst ? (
                  <>
                    <span dir="ltr" className="num">{formatGregorian(today)}</span>
                    <span className="mx-1.5 text-line-strong" aria-hidden="true">•</span>
                    {formatJalali(today, { weekday: true })}
                  </>
                ) : (
                  <>
                    {formatJalali(today, { weekday: true })}
                    <span className="mx-1.5 text-line-strong" aria-hidden="true">•</span>
                    <span dir="ltr" className="num">{formatGregorian(today)}</span>
                  </>
                )}
              </p>
            </div>
            <GlobalSearch />
            <ThemeBtn />
            <QuickAdd onPick={onQuickAdd} />
          </div>
        </header>

        {/* محتوا */}
        <main
          id="main"
          tabIndex={-1}
          className="relative mx-auto w-full max-w-[1200px] min-w-0 flex-1 px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 outline-none sm:px-6 sm:pt-6 lg:pb-14"
        >
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-brand focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white"
          >
            پرش به محتوای اصلی
          </a>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={loc.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="min-w-0"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ناو پایینی موبایل: ۵ بخش اصلی + بیشتر */}
        <nav
          aria-label="منوی پایین"
          className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        >
          <div className="mx-auto grid max-w-md grid-cols-6">
            {MOBILE_NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={closeMore}
                className={({ isActive }) =>
                  cx(
                    'relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-center text-[11px] font-bold leading-4 transition',
                    isActive ? 'text-brand-ink' : 'text-muted',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cx('grid h-7 w-12 place-items-center rounded-full transition', isActive && 'bg-brand-soft')} aria-hidden="true">{n.icon}</span>
                    <span className="line-clamp-1 max-w-full">{n.label}</span>
                  </>
                )}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cx(
                'relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-center text-[11px] font-bold leading-4 transition',
                moreOpen ? 'text-brand-ink' : 'text-muted',
              )}
            >
              <span className={cx('grid h-7 w-12 place-items-center rounded-full transition', moreOpen && 'bg-brand-soft')} aria-hidden="true">
                <MoreHorizontal size={20} />
              </span>
              <span className="line-clamp-1 max-w-full">بیشتر</span>
            </button>
          </div>
        </nav>
        <MoreSheet open={moreOpen} onClose={closeMore} badges={badges} />
      </div>
    </div>
  );
}

function useNavBadges(): Partial<Record<ViewKey, number>> {
  const { state } = useApp();
  return useMemo(() => {
    const today = todayStart();
    const openTasks = state.tasks.filter((t) => t.status !== 'done').length;
    const todayEvents = state.events.filter((e) => e.day === today).length;
    const backlogCount = state.tasks.filter((t) => t.backlog && t.status !== 'done').length;
    const todayTasks = state.tasks.filter((t) => !t.backlog && t.due === today && t.status !== 'done').length;
    return {
      today: todayTasks + todayEvents || undefined,
      backlog: backlogCount || undefined,
      tasks: openTasks || undefined,
      calendar: todayEvents || undefined,
    } as Partial<Record<ViewKey, number>>;
  }, [state]);
}
