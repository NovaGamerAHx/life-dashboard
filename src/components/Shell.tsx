import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus, Search, Sun, Moon, Monitor, X, CheckCircle2, CalendarClock,
  NotebookPen, ArrowLeft, Flame, StickyNote,
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
    <div className="flex items-center gap-2.5">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-lg shadow-emerald-600/25">
        <SparkMini />
      </div>
      <div>
        <div className="text-[15px] font-black leading-5 text-slate-900 dark:text-white">میزکار زندگی</div>
        <div className="text-[10px] font-bold text-slate-400">وظایف، عادت‌ها و روزهای بهتر</div>
      </div>
    </div>
  );
}

function SparkMini() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" opacity="0.55" />
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
      onClick={() => setTheme(next)}
      title={title}
      aria-label={title}
      className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-emerald-300"
    >
      <Icon size={18} />
    </button>
  );
}

type SearchHit = { icon: React.ReactNode; title: string; sub: string; to: string; tone: string };

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
          tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
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
          tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
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
          tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
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
          tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
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
          tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
        });
      }
    }
    return out;
  }, [q, state]);

  const go = (to: string) => {
    nav(to);
    setOpen(false);
    setQ('');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs text-slate-400 transition hover:border-emerald-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-500 sm:max-w-xs"
      >
        <Search size={16} />
        <span className="hidden sm:inline">جست‌وجوی همه‌چیز…</span>
        <span className="sm:hidden">جست‌وجو…</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(e) => { if (e.target === e.currentTarget) { setOpen(false); setQ(''); } }}
          >
            <motion.div
              initial={{ opacity: 0, y: -18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.98 }}
              className="mx-auto mt-16 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 dark:border-white/5">
                <Search size={18} className="text-slate-400" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="وظیفه، رویداد، یادداشت، عادت یا متن بازتاب…"
                  className="h-14 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
                />
                <button onClick={() => { setOpen(false); setQ(''); }} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto p-2">
                {!results ? (
                  <p className="px-3 py-8 text-center text-xs text-slate-400">حداقل ۲ حرف بنویسید تا در همه بخش‌ها جست‌وجو شود</p>
                ) : results.length === 0 ? (
                  <p className="px-3 py-8 text-center text-xs text-slate-400">چیزی پیدا نشد</p>
                ) : (
                  results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => go(r.to)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-right transition hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', r.tone)}>{r.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{r.title}</span>
                        <span className="block text-[11px] text-slate-400">{r.sub}</span>
                      </span>
                      <ArrowLeft size={15} className="shrink-0 text-slate-300" />
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
    { k: 'task' as const, label: 'وظیفه', icon: <CheckCircle2 size={17} />, c: 'from-sky-400 to-sky-600' },
    { k: 'event' as const, label: 'رویداد', icon: <CalendarClock size={17} />, c: 'from-violet-400 to-violet-600' },
    { k: 'habit' as const, label: 'عادت', icon: <Flame size={17} />, c: 'from-amber-400 to-orange-600' },
    { k: 'note' as const, label: 'یادداشت', icon: <StickyNote size={17} />, c: 'from-emerald-400 to-teal-600' },
  ];

  return (
    <div className="relative">
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              className="absolute bottom-14 left-0 z-[61] w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-slate-900"
            >
              {items.map((it) => (
                <button
                  key={it.k}
                  onClick={() => { setOpen(false); onPick(it.k); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] font-bold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  <span className={cx('grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br text-white', it.c)}>{it.icon}</span>
                  {it.label} جدید
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-l from-emerald-500 to-teal-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-600/30 transition hover:shadow-xl hover:brightness-105"
      >
        <motion.span animate={{ rotate: open ? 45 : 0 }}><Plus size={19} strokeWidth={2.8} /></motion.span>
        <span className="hidden sm:inline">افزودن سریع</span>
      </motion.button>
    </div>
  );
}

export function Shell({
  children, onQuickAdd,
}: {
  children: React.ReactNode;
  onQuickAdd: (k: QuickKind) => void;
}) {
  const loc = useLocation();
  const { state } = useApp();
  const gregFirst = state.settings.calSystem === 'gregorian';
  const meta = TITLES[loc.pathname] ?? TITLES['/'];
  const badges = useNavBadges();
  const today = todayStart();
  const scoreToday = (state.reflections ?? []).find((r) => r.day === today)?.score;

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-slate-800 dark:bg-slate-950 dark:text-slate-200">
      {/* دکور پس‌زمینه */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />
      </div>

      {/* سایدبار دسکتاپ */}
      <aside className="no-print fixed inset-y-0 right-0 z-40 hidden w-[252px] flex-col border-l border-slate-200/70 bg-white/85 px-4 py-5 backdrop-blur-xl lg:flex dark:border-white/5 dark:bg-slate-900/80">
        <div className="px-2"><Logo /></div>
        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto pb-2" aria-label="منوی اصلی">
          {NAV.map((n) => (
            <NavLink
              key={n.key}
              to={n.to}
              title={n.hint}
              className={({ isActive }) =>
                cx(
                  'group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-bold transition-all',
                  isActive
                    ? 'bg-gradient-to-l from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/25'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white',
                )
              }
            >
              <span className="shrink-0">{n.icon}</span>
              <span className="flex-1">{n.label}</span>
              {badges[n.key] != null && (badges[n.key] as number) > 0 && (
                <span className="tabular grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">
                  {toFa((badges[n.key] as number) > 99 ? '۹۹+' : (badges[n.key] as number))}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white">
          <p className="text-xs font-black">امروز {formatJalali(today, { weekday: true })}</p>
          <p className="mt-1 text-[11px] leading-5 text-emerald-100/90">
            {scoreToday != null
              ? `نمره امروزت ${formatScore(scoreToday)} از ۱۰ ثبت شده — فردا هم بهترش کن.`
              : 'قدم‌های کوچکِ هر روز، تغییرهای بزرگ می‌سازند.'}
          </p>
        </div>
      </aside>

      {/* ستون اصلی */}
      <div className="relative lg:pr-[252px]">
        {/* تاپ‌بار */}
        <header className="no-print sticky top-0 z-30 border-b border-slate-200/70 bg-[#f4f6f8]/85 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/85">
          <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-white">
                <SparkMini />
              </div>
            </div>
            <div className="hidden min-w-0 sm:block">
              <h1 className="truncate text-[15px] font-black text-slate-900 dark:text-white">{meta.t}</h1>
              <p className="truncate text-[11px] text-slate-400">
                {gregFirst ? (
                  <>
                    <span dir="ltr" className="tabular">{formatGregorian(today)}</span>
                    <span className="mx-1.5 text-slate-300 dark:text-slate-600">•</span>
                    {formatJalali(today, { weekday: true })}
                  </>
                ) : (
                  <>
                    {formatJalali(today, { weekday: true })}
                    <span className="mx-1.5 text-slate-300 dark:text-slate-600">•</span>
                    <span dir="ltr" className="tabular">{formatGregorian(today)}</span>
                  </>
                )}
              </p>
            </div>
            <div className="flex-1" />
            <GlobalSearch />
            <ThemeBtn />
            <QuickAdd onPick={onQuickAdd} />
          </div>
          {/* ناو موبایل — اسکرول افقی */}
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2.5 lg:hidden" aria-label="منوی موبایل">
            {NAV.map((n) => (
              <NavLink
                key={n.key}
                to={n.to}
                className={({ isActive }) =>
                  cx(
                    'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition',
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-emerald-600'
                      : 'bg-white text-slate-500 dark:bg-white/5 dark:text-slate-400',
                  )
                }
              >
                {n.icon}
                {n.label}
              </NavLink>
            ))}
          </nav>
        </header>

        {/* محتوا */}
        <main id="main" className="relative mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-12">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:right-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-emerald-600 focus:px-3 focus:py-2 focus:text-xs focus:font-bold focus:text-white"
          >
            پرش به محتوای اصلی
          </a>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={loc.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ناو پایینی موبایل */}
        <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden dark:border-white/10 dark:bg-slate-900/95">
          <div className="grid grid-cols-5 px-1">
            {MOBILE_NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cx(
                    'flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition',
                    isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400',
                  )
                }
              >
                {n.icon}
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
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
