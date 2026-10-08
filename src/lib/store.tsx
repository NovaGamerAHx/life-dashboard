import {
  createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import type {
  AppState, CalEvent, DayReflection, Habit, Note, Task, TaskCategory, TaskStatus, ThemeMode,
} from './types';
import { blankState, loadState, seedState, STORAGE_KEY } from './seed';
import { sanitize } from './sanitize';
import { uid } from './utils';
import { getAutoBackup, listAutoBackups, maybeAutoSnapshot, type AutoBackupMeta } from './backup';

interface AppContextValue {
  state: AppState;
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
  /** وصله‌کردن بخشی از بازتاب روز (ذخیره خودکار کارت «اطلاعات پایه روز») */
  patchReflection: (day: number, patch: Partial<Omit<DayReflection, 'day' | 'updatedAt'>>) => void;
  deleteReflection: (day: number) => void;
  // دسته‌بندی وظایف
  addTaskCat: (name: string, color: string) => void;
  updateTaskCat: (id: string, patch: Partial<TaskCategory>) => void;
  deleteTaskCat: (id: string) => void;
  // تنظیمات
  setTheme: (t: ThemeMode) => void;
  setName: (name: string) => void;
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
          setStorageWarn('ذخیره‌سازی ناموفق بود (حجم داده از سقف مرورگر بیشتر است). از داده‌ها پشتیبان بگیرید.');
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
        return { ...s, reflections: [...rest, { ...r, updatedAt: Date.now() }].sort((a, b) => a.day - b.day) };
      }),
    patchReflection: (day, patch) =>
      setState((s) => {
        const list = s.reflections ?? [];
        const existing = list.find((x) => x.day === day);
        const base: DayReflection = existing ?? {
          day, mood: 3, score: null, wins: '', lessons: '', gratitude: '', updatedAt: Date.now(),
        };
        const next: DayReflection = { ...base, ...patch, day, updatedAt: Date.now() };
        // اگر بعد از تغییرات هیچ داده معناداری نماند، رکورد خالی ساخته/نگه‌داشته نمی‌شود
        const meaningful =
          next.score != null ||
          next.mood !== 3 ||
          !!next.sport || !!next.wentOut ||
          !!(next.wake || next.sleep || next.sportType?.trim() || next.outPlace?.trim() ||
             next.dayNote?.trim() || next.wins.trim() || next.improve?.trim() ||
             next.lessons.trim() || next.gratitude.trim());
        const rest = list.filter((x) => x.day !== day);
        if (!meaningful) return { ...s, reflections: rest };
        return { ...s, reflections: [...rest, next].sort((a, b) => a.day - b.day) };
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

    setTheme: (theme) => setState((s) => ({ ...s, settings: { ...s.settings, theme } })),
    setName: (name) => setState((s) => ({ ...s, profile: { name } })),
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
