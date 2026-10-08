import type {
  AppState, CalEvent, DayReflection, Habit, Note, Task, TaskCategory,
} from './types';
import { blankState } from './seed';
import { normalizeClock, roundScore } from './jalali';

// ── اعتبارسنجی ورودی (ایمپورت/بازیابی) ───────────────────────
// هر داده ذخیره‌شده یا فایل پشتیبان از این مسیر عبور می‌کند؛
// بنابراین داده‌های ناقص/خراب نمی‌توانند برنامه را از کار بیندازند.

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

/** ساعت ذخیره‌شده را به «HH:MM» ۲۴ ساعته نرمال می‌کند (مقدار نامعتبر → undefined) */
const clock = (v: unknown): string | undefined => {
  const s = str(v, 8);
  return s ? normalizeClock(s) ?? undefined : undefined;
};

export function sanitize(s: unknown): AppState | null {
  if (!s || typeof s !== 'object') return null;
  const o = s as Partial<AppState>;
  // نسخه‌های قدیمی‌تر (که بخش مالی داشتند) هم پذیرفته می‌شوند؛
  // فیلدهای ناشناخته به‌طور کامل نادیده گرفته و حذف می‌شوند.
  const ver = (s as { version?: unknown }).version;
  if (ver !== 1 && ver !== 2) return null;
  if (!Array.isArray(o.tasks) || !Array.isArray(o.events)) return null;
  if (!Array.isArray(o.habits) || !Array.isArray(o.notes)) return null;

  const base = blankState();
  const now = Date.now();

  const rst = (o.settings ?? {}) as Partial<AppState['settings']>;
  const settings: AppState['settings'] = {
    theme: rst.theme === 'dark' || rst.theme === 'light' ? rst.theme : 'system',
    weekStart: rst.weekStart === 'mon' ? 'mon' : 'sat',
    calSystem: rst.calSystem === 'gregorian' ? 'gregorian' : 'jalali',
  };

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
      time: clock(t.time),
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
      time: clock(e.time) ?? '',
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

  const reflections: DayReflection[] = [];
  const seenDays = new Set<number>();
  if (Array.isArray(o.reflections)) {
    for (const r of o.reflections as DayReflection[]) {
      const day = num(r?.day);
      if (day == null) continue;
      if (seenDays.has(day)) continue; // هر روز فقط یک بازتاب
      seenDays.add(day);
      const mood = num(r.mood);
      const score = num(r.score);
      reflections.push({
        day,
        mood: mood === 1 || mood === 2 || mood === 3 || mood === 4 || mood === 5 ? mood : 3,
        // نمره اعشاری با یک رقم، در بازه ۰ تا ۱۰
        score: score != null ? roundScore(score) : null,
        wake: clock(r.wake),
        sleep: clock(r.sleep),
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
    tasks: tasks.slice(0, 10000),
    events: events.slice(0, 10000),
    habits: habits.slice(0, 200),
    habitLogs,
    notes: notes.slice(0, 5000),
    reflections: reflections.slice(0, 4000),
    seeded: true,
    createdAt: num(o.createdAt) ?? now,
  };
}

/** اعتبارسنجی فایل پشتیبان برای پیش‌نمایش قبل از ایمپورت (null = نامعتبر) */
export function validateBackup(data: unknown): AppState | null {
  return sanitize(data);
}
