import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  AppSettings, AppState, Budget, CalEvent, DayReflection, Habit, MoneyUnit, Note, Task,
  TaskCategory, TaskStatus, ThemeMode, Transaction,
} from './types';
import { blankState, loadState, seedState, STORAGE_KEY } from './seed';
import { uid } from './utils';

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
}

const AppContext = createContext<AppContextValue | null>(null);

function sanitize(s: unknown): AppState | null {
  if (!s || typeof s !== 'object') return null;
  const o = s as Partial<AppState>;
  if (o.version !== 1) return null;
  if (!Array.isArray(o.transactions) || !Array.isArray(o.tasks) || !Array.isArray(o.events)) return null;
  if (!Array.isArray(o.habits) || !Array.isArray(o.notes) || !Array.isArray(o.budgets)) return null;
  const base = blankState();
  const merged: AppState = {
    ...base,
    ...(o as AppState),
    // سازگاری با داده‌های قدیمی ذخیره‌شده (قبل از افزودن فیلدهای جدید)
    taskCats: Array.isArray(o.taskCats) && o.taskCats.length > 0 ? o.taskCats as TaskCategory[] : base.taskCats,
    reflections: Array.isArray(o.reflections) ? (o.reflections as DayReflection[]) : [],
    tasks: (o.tasks as Task[] ?? []).map((t) => ({
      ...t,
      backlog: t.backlog ?? t.due == null,
      time: t.time ?? '',
      durationMin: t.durationMin ?? 60,
      urgent: t.urgent ?? t.priority === 'high',
      deadline: t.deadline ?? null,
      actualMin: t.actualMin ?? undefined,
      result: t.result ?? undefined,
    })),
  };
  return merged;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadState();
    if (loaded) {
      // مهاجرت داده‌های قدیمی: فیلدهای جدید را با پیش‌فرض پر کن
      const base = blankState();
      return {
        ...base,
        ...loaded,
        settings: {
          ...base.settings,
          ...(loaded.settings ?? {}),
          financeEnabled: (loaded.settings as Partial<AppSettings>)?.financeEnabled ?? false,
          weekStart: (loaded.settings as Partial<AppSettings>)?.weekStart ?? 'sat',
          calSystem: (loaded.settings as Partial<AppSettings>)?.calSystem ?? 'jalali',
        },
        taskCats: Array.isArray(loaded.taskCats) && loaded.taskCats.length > 0 ? loaded.taskCats : base.taskCats,
        reflections: Array.isArray(loaded.reflections) ? loaded.reflections : [],
        tasks: (loaded.tasks ?? []).map((t) => ({
          ...t,
          backlog: t.backlog ?? t.due == null,
          time: t.time ?? '',
          durationMin: t.durationMin ?? 60,
          urgent: t.urgent ?? t.priority === 'high',
          deadline: t.deadline ?? null,
        })),
      };
    }
    return seedState();
  });
  const [storageWarn, setStorageWarn] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = JSON.stringify(state);
      // هشدار تکمیل حافظه (آستانه ~۴.۵ مگابایت از سقف رایج ۵ مگابایت)
      if (raw.length > 4_500_000) {
        setStorageWarn('حافظه مرورگر رو به اتمام است؛ لطفاً از داده‌ها پشتیبان بگیرید و موارد قدیمی را پاک کنید.');
      } else {
        setStorageWarn(null);
      }
      localStorage.setItem(STORAGE_KEY, raw);
    } catch {
      setStorageWarn('ذخیره‌سازی ناموفق بود (حافظه مرورگر پر است). از داده‌ها پشتیبان بگیرید.');
    }
  }, [state]);

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
    addCategory: (kind, name) => {
      const n = name.trim();
      if (!n) return false;
      let ok = false;
      setState((s) => {
        const key = kind === 'expense' ? 'expenseCats' : 'incomeCats';
        if (s[key].includes(n)) return s;
        ok = true;
        return { ...s, [key]: [...s[key], n] };
      });
      return ok;
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
      setState((s) => ({ ...s, habits: s.habits.map((h) => (h.id === id ? { ...h, archived } : h)) })),

    importState: (ns) => {
      const clean = sanitize(ns);
      if (!clean) return false;
      setState(clean);
      return true;
    },
    resetDemo: () => setState(seedState()),
    clearAll: () => setState((s) => ({ ...blankState(), settings: s.settings, profile: s.profile })),
     
  }), [state]);

  return (
    <AppContext.Provider value={value}>
      {storageWarn && (
        <div className="fixed bottom-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-xs font-bold leading-6 text-amber-800 shadow-2xl dark:bg-amber-950 dark:text-amber-200">
          ⚠️ {storageWarn}
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
