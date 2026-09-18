import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  AppState, Budget, CalEvent, DayReflection, Habit, MoneyUnit, Note, Task,
  TaskCategory, TaskStatus, ThemeMode, Transaction,
} from './types';
import { blankState, loadState, seedState, STORAGE_KEY } from './seed';
import { uid } from './utils';
import { getAutoBackup, listAutoBackups, maybeAutoSnapshot, type AutoBackupMeta } from './backup';

interface AppContextValue {
  state: AppState;
  // تراکنش
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  // وظیفه
  addTask: (t: Omit<Task, 'id' | 'createdAt' | 'completedAt'>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  // رویداد
  addEvent: (e: Omit<CalEvent, 'id' | 'createdAt'>) => void;
  updateEvent: (id: string, patch: Partial<CalEvent>) => void;
  deleteEvent: (id: string) => void;
  // عادت
  addHabit: (h: Omit<Habit, 'id' | 'createdAt'>) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabit: (habitId: string, dayTs: number) => void;
  // یادداشت
  addNote: (n: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  // بازتاب روز
  saveReflection: (r: Omit<DayReflection, 'updatedAt'>) => void;
  deleteReflection: (day: number) => void;
  // دسته‌بندی وظایف
  addTaskCat: (name: string, color: string) => void;
  updateTaskCat: (id: string, patch: Partial<TaskCategory>) => void;
  deleteTaskCat: (id: string) => void;
  // بودجه و دسته
  setBudget: (b: Budget) => void;
  deleteBudget: (category: string) => void;
  addCategory: (kind: 'expense' | 'income', name: string) => boolean;
  deleteCategory: (kind: 'expense' | 'income', name: string) => void;
  // تنظیمات
  setTheme: (t: ThemeMode) => void;
  setUnit: (u: MoneyUnit) => void;
  setName: (name: string) => void;
  setFinanceEnabled: (v: boolean) => void;
  setWeekStart: (v: 'sat' | 'mon') => void;
  setCalSystem: (v: 'jalali' | 'gregorian') => void;
  setHabitArchived: (id: string, archived: boolean) => void;
  // داده
  importState: (s: AppState) => boolean;
  resetDemo: () => void;
  clearAll: () => void;
  // حافظه و پشتیبان خودکار
  storageBytes: number;
  storageWarn: string | null;
  dismissWarn: () => void;
  autoBackups: AutoBackupMeta[];
  restoreAutoBackup: (ts: number) => boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

// ── اعتبارسنجی ورودی (ایمپورت/بازیابی) ───────────────────────
const str = (v: unknown, max = 500): string | undefined =>
  typeof v === 'string' ? v.slice(0, max) : undefined;
const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const clampN = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, Math.round(v)));

function strArr(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === 'string' && x.trim()) {
      out.push(x.trim().slice(0, maxLen));
      if (out.length >= maxItems) break;
    }
  }
  return [...new Set(out)];
}

function sanitize(s: unknown): AppState | null {
  if (!s || typeof s !== 'object') return null;
  const o = s as Partial<AppState>;
  if (o.version !== 1) return null;
  if (!Array.isArray(o.transactions) || !Array.isArray(o.tasks) || !Array.isArray(o.events)) return null;
  if (!Array.isArray(o.habits) || !Array.isArray(o.notes) || !Array.isArray(o.budgets)) return null;
  const base = blankState();
  const now = Date.now();

  // تنظیمات (فقط مقادیر مجاز)
  const rst = (o.settings ?? {}) as Partial<AppState['settings']>;
  const settings: AppState['settings'] = {
    theme: rst.theme === 'dark' || rst.theme === 'light' ? rst.theme : 'system',
    unit: rst.unit === 'heazar' ? 'heazar' : 'toman',
    financeEnabled: rst.financeEnabled === true,
    weekStart: rst.weekStart === 'mon' ? 'mon' : 'sat',
    calSystem: rst.calSystem === 'gregorian' ? 'gregorian' : 'jalali',
  };

  const transactions: Transaction[] = [];
  for (const t of o.transactions as Transaction[]) {
    if (!t || typeof t.id !== 'string' || typeof t.title !== 'string') continue;
    const amount = num(t.amount);
    const date = num(t.date);
    if (amount == null || amount < 0 || date == null) continue;
    transactions.push({
      id: t.id.slice(0, 60),
      type: t.type === 'income' ? 'income' : 'expense',
      amount: Math.round(amount),
      category: str(t.category, 40) || 'سایر',
      title: t.title.slice(0, 200),
      note: str(t.note, 1000),
      date,
      createdAt: num(t.createdAt) ?? now,
    });
  }

  const tasks: Task[] = [];
  for (const t of o.tasks as Task[]) {
    if (!t || typeof t.id !== 'string' || typeof t.title !== 'string') continue;
    const priority = t.priority === 'high' || t.priority === 'low' ? t.priority : 'medium';
    const due = num(t.due);
    const subs = Array.isArray(t.subtasks)
      ? t.subtasks
          .filter((x) => x && typeof x.id === 'string')
          .slice(0, 60)
          .map((x) => ({ id: x.id.slice(0, 60), title: str(x.title, 200) ?? '', done: x.done === true }))
      : [];
    tasks.push({
      id: t.id.slice(0, 60),
      title: t.title.slice(0, 300),
      desc: str(t.desc, 2000),
      status: t.status === 'doing' || t.status === 'done' ? t.status : 'todo',
      priority,
      tags: strArr(t.tags, 12, 40),
      due,
      time: str(t.time, 8),
      durationMin: num(t.durationMin) != null ? clampN(t.durationMin as number, 5, 1440) : 60,
      backlog: typeof t.backlog === 'boolean' ? t.backlog : due == null,
      urgent: typeof t.urgent === 'boolean' ? t.urgent : priority === 'high',
      deadline: num(t.deadline),
      actualMin: num(t.actualMin) ?? undefined,
      result: str(t.result, 1000),
      subtasks: subs,
      createdAt: num(t.createdAt) ?? now,
      completedAt: num(t.completedAt),
    });
  }

  const events: CalEvent[] = [];
  for (const e of o.events as CalEvent[]) {
    if (!e || typeof e.id !== 'string' || typeof e.title !== 'string') continue;
    const day = num(e.day);
    if (day == null) continue;
    events.push({
      id: e.id.slice(0, 60),
      title: e.title.slice(0, 200),
      day,
      time: str(e.time, 8) ?? '',
      color: str(e.color, 20) ?? '#10b981',
      desc: str(e.desc, 1000),
      createdAt: num(e.createdAt) ?? now,
    });
  }

  const habits: Habit[] = [];
  for (const h of o.habits as Habit[]) {
    if (!h || typeof h.id !== 'string' || typeof h.title !== 'string') continue;
    habits.push({
      id: h.id.slice(0, 60),
      title: h.title.slice(0, 200),
      color: str(h.color, 20) ?? '#10b981',
      targetPerWeek: num(h.targetPerWeek) != null ? clampN(h.targetPerWeek as number, 1, 7) : 5,
      archived: h.archived === true ? true : undefined,
      createdAt: num(h.createdAt) ?? now,
    });
  }

  // لاگ عادت‌ها: فقط کلیدهای رشته‌ای با مقدار truthy
  const habitLogs: Record<string, boolean> = {};
  if (o.habitLogs && typeof o.habitLogs === 'object') {
    let c = 0;
    for (const [k, v] of Object.entries(o.habitLogs)) {
      if (v && typeof k === 'string' && k.length < 80) {
        habitLogs[k] = true;
        if (++c > 30000) break;
      }
    }
  }

  const notes: Note[] = [];
  for (const n of o.notes as Note[]) {
    if (!n || typeof n.id !== 'string') continue;
    notes.push({
      id: n.id.slice(0, 60),
      title: str(n.title, 200) ?? '',
      body: str(n.body, 20000) ?? '',
      color: str(n.color, 20) ?? '#fef3c7',
      pinned: n.pinned === true,
      tags: strArr(n.tags, 10, 40),
      createdAt: num(n.createdAt) ?? now,
      updatedAt: num(n.updatedAt) ?? now,
    });
  }

  const budgets: Budget[] = [];
  for (const b of o.budgets as Budget[]) {
    if (!b || typeof b.category !== 'string') continue;
    const limit = num(b.limit);
    if (limit == null || limit <= 0) continue;
    budgets.push({ category: b.category.slice(0, 40), limit: Math.round(limit) });
  }

  const reflections: DayReflection[] = [];
  if (Array.isArray(o.reflections)) {
    for (const r of o.reflections as DayReflection[]) {
      if (!r || num(r.day) == null) continue;
      const mood = num(r.mood);
      const score = num(r.score);
      reflections.push({
        day: r.day as number,
        mood: mood === 1 || mood === 2 || mood === 3 || mood === 4 || mood === 5 ? mood : 3,
        score: score != null ? clampN(score, 0, 10) : null,
        wake: str(r.wake, 8),
        sleep: str(r.sleep, 8),
        sport: r.sport === true ? true : undefined,
        sportType: str(r.sportType, 60),
        wentOut: r.wentOut === true ? true : undefined,
        outPlace: str(r.outPlace, 100),
        dayNote: str(r.dayNote, 2000),
        wins: str(r.wins, 3000) ?? '',
        improve: str(r.improve, 1000),
        lessons: str(r.lessons, 3000) ?? '',
        gratitude: str(r.gratitude, 1000) ?? '',
        updatedAt: num(r.updatedAt) ?? now,
      });
    }
  }

  const taskCatsRaw = Array.isArray(o.taskCats) ? (o.taskCats as TaskCategory[]) : [];
  const taskCats: TaskCategory[] = taskCatsRaw
    .filter((c) => c && typeof c.id === 'string' && typeof c.name === 'string' && c.name.trim())
    .slice(0, 40)
    .map((c) => ({
      id: c.id.slice(0, 60),
      name: c.name.trim().slice(0, 40),
      color: str(c.color, 20) ?? '#10b981',
      icon: str(c.icon, 10),
    }));

  return {
    version: 1,
    profile: { name: str((o.profile as { name?: unknown } | undefined)?.name, 60) ?? '' },
    settings,
    taskCats: taskCats.length > 0 ? taskCats : base.taskCats,
    transactions: transactions.slice(0, 20000),
    tasks: tasks.slice(0, 10000),
    events: events.slice(0, 10000),
    habits: habits.slice(0, 200),
    habitLogs,
    notes: notes.slice(0, 5000),
    budgets: budgets.slice(0, 100),
    reflections: reflections.slice(0, 4000),
    expenseCats: strArr(o.expenseCats, 60, 40),
    incomeCats: strArr(o.incomeCats, 60, 40),
    seeded: true,
    createdAt: num(o.createdAt) ?? now,
  };
}

/** اعتبارسنجی فایل پشتیبان برای پیش‌نمایش قبل از ایمپورت (null = نامعتبر) */
export function validateBackup(data: unknown): AppState | null {
  return sanitize(data);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadState();
    if (loaded) {
      // همه داده‌های ذخیره‌شده از مسیر sanitize عبور می‌کنند (مهاجرت + پاک‌سازی)
      return sanitize(loaded) ?? seedState();
    }
    return seedState();
  });
  const [storageWarn, setStorageWarn] = useState<string | null>(null);
  const [storageBytes, setStorageBytes] = useState(0);
  const [autoBackups, setAutoBackups] = useState<AutoBackupMeta[]>(() => {
    try {
      return listAutoBackups();
    } catch {
      return [];
    }
  });
  const dismissedRef = useRef(false);
  const stateRef = useRef(state);
  // سینک ref داخل effect تا قانون «عدم لمس ref در رندر» رعایت شود
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ذخیره‌سازی debounceشده: تایپ سریع باعث write پیاپی در localStorage نمی‌شود
  useEffect(() => {
    dismissedRef.current = false;
    const h = window.setTimeout(() => {
      try {
        const raw = JSON.stringify(stateRef.current);
        setStorageBytes(raw.length);
        if (raw.length > 4_500_000) {
          if (!dismissedRef.current) {
            setStorageWarn('حافظه مرورگر رو به اتمام است؛ لطفاً از داده‌ها پشتیبان بگیرید و موارد قدیمی را پاک کنید.');
          }
        } else {
          setStorageWarn(null);
        }
        localStorage.setItem(STORAGE_KEY, raw);
        try {
          setAutoBackups(maybeAutoSnapshot(stateRef.current));
        } catch {
          /* اسنپ‌شات خودکار اختیاری است */
        }
      } catch {
        if (!dismissedRef.current) {
          setStorageWarn('ذخیره‌سازی ناموفق بود (حافظه مرورگر پر است). از داده‌ها پشتیبان بگیرید.');
        }
      }
    }, 300);
    return () => window.clearTimeout(h);
  }, [state]);

  // ذخیره فوری هنگام بستن/ترک صفحه تا چیزی گم نشود
  useEffect(() => {
    const flush = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  // تم
  useEffect(() => {
    const root = document.documentElement;
    const mode = state.settings.theme;
    const apply = (dark: boolean) => root.classList.toggle('dark', dark);
    if (mode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches);
      const fn = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener('change', fn);
      return () => mq.removeEventListener('change', fn);
    }
    apply(mode === 'dark');
  }, [state.settings.theme]);

  const value = useMemo<AppContextValue>(() => ({
    state,
    addTransaction: (t) =>
      setState((s) => ({ ...s, transactions: [{ ...t, id: uid('tx'), createdAt: Date.now() }, ...s.transactions] })),
    updateTransaction: (id, patch) =>
      setState((s) => ({ ...s, transactions: s.transactions.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    deleteTransaction: (id) =>
      setState((s) => ({ ...s, transactions: s.transactions.filter((x) => x.id !== id) })),

    addTask: (t) =>
      setState((s) => ({
        ...s,
        tasks: [{ ...t, id: uid('task'), createdAt: Date.now(), completedAt: null }, ...s.tasks],
      })),
    updateTask: (id, patch) =>
      setState((s) => ({
        ...s,
        tasks: s.tasks.map((x) => {
          if (x.id !== id) return x;
          const next = { ...x, ...patch };
          if (patch.status && patch.status !== x.status) {
            next.completedAt = patch.status === 'done' ? Date.now() : null;
          }
          return next;
        }),
      })),
    deleteTask: (id) => setState((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== id) })),
    moveTask: (id, status) =>
      setState((s) => ({
        ...s,
        tasks: s.tasks.map((x) =>
          x.id === id ? { ...x, status, completedAt: status === 'done' ? Date.now() : null } : x,
        ),
      })),

    addEvent: (e) =>
      setState((s) => ({ ...s, events: [...s.events, { ...e, id: uid('ev'), createdAt: Date.now() }] })),
    updateEvent: (id, patch) =>
      setState((s) => ({ ...s, events: s.events.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    deleteEvent: (id) => setState((s) => ({ ...s, events: s.events.filter((x) => x.id !== id) })),

    addHabit: (h) =>
      setState((s) => ({ ...s, habits: [...s.habits, { ...h, id: uid('h'), createdAt: Date.now() }] })),
    updateHabit: (id, patch) =>
      setState((s) => ({ ...s, habits: s.habits.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    deleteHabit: (id) =>
      setState((s) => {
        const logs = { ...s.habitLogs };
        for (const k of Object.keys(logs)) if (k.startsWith(id + ':')) delete logs[k];
        return { ...s, habits: s.habits.filter((x) => x.id !== id), habitLogs: logs };
      }),
    toggleHabit: (habitId, day) =>
      setState((s) => {
        const key = `${habitId}:${day}`;
        const logs = { ...s.habitLogs };
        if (logs[key]) delete logs[key];
        else logs[key] = true;
        return { ...s, habitLogs: logs };
      }),

    addNote: (n) =>
      setState((s) => {
        const now = Date.now();
        return { ...s, notes: [{ ...n, id: uid('n'), createdAt: now, updatedAt: now }, ...s.notes] };
      }),
    updateNote: (id, patch) =>
      setState((s) => ({
        ...s,
        notes: s.notes.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x)),
      })),
    deleteNote: (id) => setState((s) => ({ ...s, notes: s.notes.filter((x) => x.id !== id) })),

    saveReflection: (r) =>
      setState((s) => {
        const rest = (s.reflections ?? []).filter((x) => x.day !== r.day);
        return { ...s, reflections: [...rest, { ...r, updatedAt: Date.now() }] };
      }),
    deleteReflection: (day) =>
      setState((s) => ({ ...s, reflections: (s.reflections ?? []).filter((x) => x.day !== day) })),

    addTaskCat: (name, color) =>
      setState((s) => ({
        ...s,
        taskCats: [...(s.taskCats ?? []), { id: uid('tc'), name: name.trim(), color }],
      })),
    updateTaskCat: (id, patch) =>
      setState((s) => {
        const old = (s.taskCats ?? []).find((c) => c.id === id);
        const nextCats = (s.taskCats ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c));
        // اگر نام دسته عوض شد، برچسب تسک‌ها را هم به‌روز کن
        let tasks = s.tasks;
        if (old && patch.name && patch.name.trim() && patch.name.trim() !== old.name) {
          tasks = s.tasks.map((t) => ({
            ...t,
            tags: t.tags.map((tg) => (tg === old.name ? patch.name!.trim() : tg)),
          }));
        }
        return { ...s, taskCats: nextCats, tasks };
      }),
    deleteTaskCat: (id) =>
      setState((s) => {
        const gone = (s.taskCats ?? []).find((c) => c.id === id);
        return {
          ...s,
          taskCats: (s.taskCats ?? []).filter((c) => c.id !== id),
          tasks: gone ? s.tasks.map((t) => ({ ...t, tags: t.tags.filter((tg) => tg !== gone.name) })) : s.tasks,
        };
      }),

    setBudget: (b) =>
      setState((s) => {
        const rest = s.budgets.filter((x) => x.category !== b.category);
        return { ...s, budgets: [...rest, b] };
      }),
    deleteBudget: (category) =>
      setState((s) => ({ ...s, budgets: s.budgets.filter((x) => x.category !== category) })),
    // بررسی تکراری‌بودن به‌صورت همگام از روی state تازه انجام می‌شود
    // (خواندن نتیجه از داخل setState نادرست بود چون updater دیر اجرا می‌شود)
    addCategory: (kind, name) => {
      const n = name.trim();
      if (!n) return false;
      const key = kind === 'expense' ? 'expenseCats' : 'incomeCats';
      if ((state[key] ?? []).includes(n)) return false;
      setState((s) => ({ ...s, [key]: [...s[key], n] }));
      return true;
    },
    deleteCategory: (kind, name) =>
      setState((s) => {
        const key = kind === 'expense' ? 'expenseCats' : 'incomeCats';
        return { ...s, [key]: s[key].filter((c) => c !== name) };
      }),

    setTheme: (theme) => setState((s) => ({ ...s, settings: { ...s.settings, theme } })),
    setUnit: (unit) => setState((s) => ({ ...s, settings: { ...s.settings, unit } })),
    setName: (name) => setState((s) => ({ ...s, profile: { name } })),
    setFinanceEnabled: (v) => setState((s) => ({ ...s, settings: { ...s.settings, financeEnabled: v } })),
    setWeekStart: (v) => setState((s) => ({ ...s, settings: { ...s.settings, weekStart: v } })),
    setCalSystem: (v) => setState((s) => ({ ...s, settings: { ...s.settings, calSystem: v } })),
    setHabitArchived: (id, archived) =>
      setState((s) => ({
        ...s,
        habits: s.habits.map((h) => (h.id === id ? { ...h, archived: archived ? true : undefined } : h)),
      })),

    importState: (ns) => {
      const clean = sanitize(ns);
      if (!clean) return false;
      setState(clean);
      return true;
    },
    resetDemo: () => setState(seedState()),
    clearAll: () => setState((s) => ({ ...blankState(), settings: s.settings, profile: s.profile })),

    storageBytes,
    storageWarn,
    dismissWarn: () => {
      dismissedRef.current = true;
      setStorageWarn(null);
    },
    autoBackups,
    restoreAutoBackup: (ts) => {
      const raw = getAutoBackup(ts);
      const clean = sanitize(raw);
      if (!clean) return false;
      setState(clean);
      return true;
    },
  }), [state, storageBytes, storageWarn, autoBackups]);

  return (
    <AppContext.Provider value={value}>
      {storageWarn && (
        <div className="fixed bottom-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-xs font-bold leading-6 text-amber-800 shadow-2xl dark:bg-amber-950 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <span className="flex-1">⚠️ {storageWarn}</span>
            <button
              onClick={() => {
                dismissedRef.current = true;
                setStorageWarn(null);
              }}
              className="shrink-0 rounded-lg px-2 py-0.5 transition hover:bg-amber-500/15"
            >
              بستن
            </button>
          </div>
        </div>
      )}
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp باید داخل AppProvider استفاده شود');
  return ctx;
}
