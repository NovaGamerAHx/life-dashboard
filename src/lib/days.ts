import type { AppState, CalEvent, Task } from './types';
import {
  addDays, addMonthsJalali, jalaliMonthRange, J_MONTHS, J_WEEKDAYS, parseClock,
  persianWeekday, roundScore, startOfDay, startOfWeek, toFa, toGregorian,
  toJalaali, todayStart,
} from './jalali';

/** آمار کامل یک روز؛ همه فیلدهای اختیاری در صورت نبود مقدار، خالی/صفر می‌مانند */
export interface DayStat {
  day: number;
  /** آیا در این روز چیزی ثبت شده است؟ (بازتاب، تسک، عادت، رویداد، نمره) */
  hasAny: boolean;
  hasReflection: boolean;
  tasksTotal: number;
  tasksDone: number;
  /** درصد انجام تسک‌ها؛ ‎-1 یعنی تسکی برای آن روز نبوده */
  tasksPct: number;
  tasks: Task[];
  events: CalEvent[];
  mood: number | null;
  score: number | null;
  wake?: string;
  sleep?: string;
  sleepMin: number | null;
  sport: boolean;
  sportType?: string;
  wentOut: boolean;
  outPlace?: string;
  dayNote?: string;
  wins: string;
  improve?: string;
  lessons: string;
  gratitude: string;
  habitsDone: number;
  habitsTotal: number;
  habitsDoneTitles: string[];
  habitsMissedTitles: string[];
  updatedAt: number;
}

/** مدت خواب (دقیقه) از ساعت بیداری و خواب — اگر ناقص باشد null */
export function sleepDurationMin(wake?: string | null, sleep?: string | null): number | null {
  const wm = wake ? parseClock(wake) : null;
  const sm = sleep ? parseClock(sleep) : null;
  if (wm == null || sm == null) return null;
  let diff = wm - sm;
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

/** «۷ ساعت و ۳۰ دقیقه» */
export function formatDurationFa(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${toFa(m)} دقیقه`;
  return `${toFa(h)} ساعت${m ? ` و ${toFa(m)} دقیقه` : ''}`;
}

/** آمار یک روز مشخص را از وضعیت برنامه می‌سازد */
export function buildDayStat(state: AppState, day: number, habitCache?: Map<number, number>): DayStat {
  const ts = startOfDay(day);
  const reflection = (state.reflections ?? []).find((r) => r.day === ts);
  const tasks = state.tasks.filter((t) => !t.backlog && t.due === ts);
  const done = tasks.filter((t) => t.status === 'done').length;
  const events = state.events.filter((e) => e.day === ts);
  const habits = state.habits.filter((h) => !h.archived);

  let habitsDone = 0;
  if (habitCache && habitCache.has(ts)) {
    habitsDone = habitCache.get(ts) as number;
  } else {
    habitsDone = habits.filter((h) => state.habitLogs[`${h.id}:${ts}`]).length;
    habitCache?.set(ts, habitsDone);
  }

  const doneTitles = habits.filter((h) => state.habitLogs[`${h.id}:${ts}`]).map((h) => h.title);
  const missedTitles = habits.filter((h) => !state.habitLogs[`${h.id}:${ts}`]).map((h) => h.title);
  const score = reflection?.score != null ? roundScore(reflection.score) : null;

  return {
    day: ts,
    hasAny: !!reflection || tasks.length > 0 || events.length > 0 || habitsDone > 0,
    hasReflection: !!reflection,
    tasksTotal: tasks.length,
    tasksDone: done,
    tasksPct: tasks.length ? Math.round((done / tasks.length) * 100) : -1,
    tasks: [...tasks].sort(taskOrder),
    events: [...events].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')),
    mood: reflection?.mood ?? null,
    score,
    wake: reflection?.wake,
    sleep: reflection?.sleep,
    sleepMin: sleepDurationMin(reflection?.wake, reflection?.sleep),
    sport: !!reflection?.sport,
    sportType: reflection?.sportType,
    wentOut: !!reflection?.wentOut,
    outPlace: reflection?.outPlace,
    dayNote: reflection?.dayNote,
    wins: reflection?.wins ?? '',
    improve: reflection?.improve,
    lessons: reflection?.lessons ?? '',
    gratitude: reflection?.gratitude ?? '',
    habitsDone,
    habitsTotal: habits.length,
    habitsDoneTitles: doneTitles,
    habitsMissedTitles: missedTitles,
    updatedAt: reflection?.updatedAt ?? 0,
  };
}

function taskOrder(a: Task, b: Task): number {
  const ta = a.time ? parseClock(a.time) ?? 9999 : 9999;
  const tb = b.time ? parseClock(b.time) ?? 9999 : 9999;
  const pw = { high: 0, medium: 1, low: 2 };
  return ta - tb || pw[a.priority] - pw[b.priority];
}

/** آمار چند روز (به ترتیب صعودی) */
export function buildDayStats(state: AppState, days: number[]): DayStat[] {
  const cache = new Map<number, number>();
  return days.map((d) => buildDayStat(state, d, cache));
}

/** فهرست پیوسته روزها از «from» تا «to» (شامل هر دو سر) */
export function dayListBetween(from: number, to: number, maxDays = 400): number[] {
  const start = startOfDay(Math.min(from, to));
  const end = startOfDay(Math.max(from, to));
  const out: number[] = [];
  let cur = start;
  while (cur <= end && out.length < maxDays) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

// ── خلاصه‌های آماری ─────────────────────────────────────────
export interface ScoreStats {
  count: number;
  sum: number;
  avg: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  std: number | null;
  best: DayStat | null;
  worst: DayStat | null;
  greatDays: number; // نمره ۸ و بالاتر
  lowDays: number; // نمره کمتر از ۵
}

export function scoreStats(list: DayStat[]): ScoreStats {
  const scored = list.filter((d) => d.score != null) as Array<DayStat & { score: number }>;
  const values = scored.map((d) => d.score).sort((a, b) => a - b);
  const count = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = count ? roundScore(sum / count) : null;
  const median = count
    ? roundScore(count % 2 ? values[(count - 1) / 2] : (values[count / 2 - 1] + values[count / 2]) / 2)
    : null;
  const std = count
    ? Math.round(Math.sqrt(values.reduce((a, v) => a + (v - sum / count) ** 2, 0) / count) * 10) / 10
    : null;
  const best = scored.reduce<DayStat | null>((a, d) => (!a || d.score > (a.score ?? -1) ? d : a), null);
  const worst = scored.reduce<DayStat | null>((a, d) => (!a || d.score < (a.score ?? 99) ? d : a), null);
  return {
    count,
    sum,
    avg,
    median,
    min: count ? values[0] : null,
    max: count ? values[count - 1] : null,
    std,
    best,
    worst,
    greatDays: values.filter((v) => v >= 8).length,
    lowDays: values.filter((v) => v < 5).length,
  };
}

export interface DayRollup {
  avgMood: number | null;
  moodCount: number;
  avgTasksPct: number | null;
  taskDays: number;
  totalTasks: number;
  doneTasks: number;
  sportDays: number;
  outDays: number;
  avgSleepMin: number | null;
  sleepCount: number;
  habitChecks: number;
  habitPossible: number;
  reflectionDays: number;
  eventCount: number;
}

/** میانگین‌های عمومی بازه (حال، تسک، خواب، ورزش، عادت) */
export function rollupDays(list: DayStat[]): DayRollup {
  const moods = list.filter((d) => d.mood != null);
  const taskDays = list.filter((d) => d.tasksPct >= 0);
  const sleeps = list.filter((d) => d.sleepMin != null);
  const habitPossible = list.reduce((a, d) => a + d.habitsTotal, 0);
  const habitChecks = list.reduce((a, d) => a + d.habitsDone, 0);
  return {
    avgMood: moods.length ? Math.round((moods.reduce((a, d) => a + (d.mood ?? 0), 0) / moods.length) * 10) / 10 : null,
    moodCount: moods.length,
    avgTasksPct: taskDays.length ? Math.round(taskDays.reduce((a, d) => a + d.tasksPct, 0) / taskDays.length) : null,
    taskDays: taskDays.length,
    totalTasks: list.reduce((a, d) => a + d.tasksTotal, 0),
    doneTasks: list.reduce((a, d) => a + d.tasksDone, 0),
    sportDays: list.filter((d) => d.sport).length,
    outDays: list.filter((d) => d.wentOut).length,
    avgSleepMin: sleeps.length ? sleeps.reduce((a, d) => a + (d.sleepMin ?? 0), 0) / sleeps.length : null,
    sleepCount: sleeps.length,
    habitChecks,
    habitPossible,
    reflectionDays: list.filter((d) => d.hasReflection).length,
    eventCount: list.reduce((a, d) => a + d.events.length, 0),
  };
}

/** روند: تفاضل میانگین نیمه دوم و نیمه اول بازه (مثبت = بهبود) */
export function trendDelta(list: DayStat[]): number | null {
  const scored = list.filter((d) => d.score != null) as Array<DayStat & { score: number }>;
  if (scored.length < 4) return null;
  const half = Math.floor(scored.length / 2);
  const first = scored.slice(0, half);
  const second = scored.slice(scored.length - half);
  const a = first.reduce((x, d) => x + d.score, 0) / first.length;
  const b = second.reduce((x, d) => x + d.score, 0) / second.length;
  return Math.round((b - a) * 10) / 10;
}

/** توزیع نمره‌ها در ۵ سبد */
export function scoreDistribution(list: DayStat[]): Array<{ label: string; value: number; color: string }> {
  const buckets = [
    { label: '۰–۲', min: 0, max: 2, color: '#f43f5e' },
    { label: '۲–۴', min: 2, max: 4, color: '#fb923c' },
    { label: '۴–۶', min: 4, max: 6, color: '#f59e0b' },
    { label: '۶–۸', min: 6, max: 8, color: '#84cc16' },
    { label: '۸–۱۰', min: 8, max: 10.01, color: '#10b981' },
  ];
  return buckets.map((b) => ({
    label: b.label,
    color: b.color,
    value: list.filter((d) => d.score != null && d.score >= b.min && d.score < b.max).length,
  }));
}

/** توزیع حال روزها (۱ تا ۵) */
export function moodDistribution(list: DayStat[]): Array<{ label: string; value: number; color: string }> {
  const colors = ['#f43f5e', '#f59e0b', '#84cc16', '#10b981', '#06b6d4'];
  const emojis = ['😞', '😐', '🙂', '😄', '🤩'];
  return [1, 2, 3, 4, 5].map((v, i) => ({
    label: `${emojis[i]} ${toFa(v)}`,
    value: list.filter((d) => d.mood === v).length,
    color: colors[i],
  }));
}

export interface PeriodBucket {
  key: string;
  label: string;
  sub: string;
  start: number;
  end: number;
  days: DayStat[];
  avgScore: number | null;
  scored: number;
  avgTasksPct: number | null;
  habitRate: number | null;
}

/** تقسیم روزها به هفته‌های شمسی */
export function weekBuckets(list: DayStat[], weekStart: 'sat' | 'mon' = 'sat'): PeriodBucket[] {
  const map = new Map<number, DayStat[]>();
  for (const d of list) {
    const k = startOfWeek(d.day, weekStart);
    const arr = map.get(k) ?? [];
    arr.push(d);
    map.set(k, arr);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([start, days]) => {
      const end = days[days.length - 1].day;
      const s = scoreStats(days);
      const r = rollupDays(days);
      const habitRate = r.habitPossible ? Math.round((r.habitChecks / r.habitPossible) * 100) : null;
      return {
        key: `w${start}`,
        label: `هفته ${toFa(toJalaali(new Date(start)).jd)} ${J_MONTHS[toJalaali(new Date(start)).jm - 1]}`,
        sub: `${J_WEEKDAYS[persianWeekday(start)]} تا ${J_WEEKDAYS[persianWeekday(end)]} • ${toFa(s.count)} روز نمره‌دار`,
        start,
        end,
        days,
        avgScore: s.avg,
        scored: s.count,
        avgTasksPct: r.avgTasksPct,
        habitRate,
      };
    });
}

/** تقسیم روزها به ماه‌های شمسی */
export function monthBuckets(list: DayStat[]): PeriodBucket[] {
  const map = new Map<string, DayStat[]>();
  for (const d of list) {
    const j = toJalaali(new Date(d.day));
    const k = `${j.jy}-${j.jm}`;
    const arr = map.get(k) ?? [];
    arr.push(d);
    map.set(k, arr);
  }
  return [...map.entries()]
    .sort((a, b) => {
      const [ay, am] = a[0].split('-').map(Number);
      const [by, bm] = b[0].split('-').map(Number);
      return by * 12 + bm - (ay * 12 + am);
    })
    .map(([key, days]) => {
      const j = toJalaali(new Date(days[0].day));
      const s = scoreStats(days);
      const r = rollupDays(days);
      return {
        key,
        label: `${J_MONTHS[j.jm - 1]} ${toFa(j.jy)}`,
        sub: `${toFa(days.length)} روز در بازه • ${toFa(s.count)} روز نمره‌دار`,
        start: days[0].day,
        end: days[days.length - 1].day,
        days,
        avgScore: s.avg,
        scored: s.count,
        avgTasksPct: r.avgTasksPct,
        habitRate: r.habitPossible ? Math.round((r.habitChecks / r.habitPossible) * 100) : null,
      };
    });
}

// ── انتخاب تصادفی ───────────────────────────────────────────
/** انتخاب n عضو تصادفی غیرتکراری از آرایه (بدون تغییر آرایه ورودی) */
export function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.max(0, Math.min(n, copy.length)));
}

/** شناسه بازه‌های آماده برای صفحه تحلیل روزها */
export type RangePreset = '7d' | '14d' | '30d' | '90d' | 'thisMonth' | 'lastMonth' | 'custom';

export interface RangeInfo {
  days: number[];
  label: string;
  from: number;
  to: number;
}

/** بازه روزهای یک پریست را می‌سازد */
export function resolveRange(
  preset: RangePreset,
  customFrom: number,
  customTo: number,
): RangeInfo {
  const today = todayStart();
  if (preset === 'thisMonth') {
    const r = jalaliMonthRange(today);
    const days = dayListBetween(r.start, Math.min(today, r.end));
    return { days, label: `این ماه (${J_MONTHS[r.jm - 1]} ${toFa(r.jy)})`, from: days[0] ?? today, to: today };
  }
  if (preset === 'lastMonth') {
    const cur = toJalaali(new Date(today));
    const prev = addMonthsJalali(cur.jy, cur.jm, -1);
    const start = startOfDay(toGregorian(prev.jy, prev.jm, 1).getTime());
    const end = jalaliMonthRange(today).start - 86400000;
    const days = dayListBetween(start, end);
    return {
      days,
      label: `ماه گذشته (${J_MONTHS[prev.jm - 1]} ${toFa(prev.jy)})`,
      from: days[0] ?? today,
      to: days[days.length - 1] ?? today,
    };
  }
  if (preset === 'custom') {
    const days = dayListBetween(customFrom, customTo);
    return { days, label: 'بازه دلخواه', from: days[0] ?? today, to: days[days.length - 1] ?? today };
  }
  const n = preset === '7d' ? 7 : preset === '14d' ? 14 : preset === '30d' ? 30 : 90;
  const days = dayListBetween(addDays(today, -(n - 1)), today);
  return { days, label: `${toFa(n)} روز اخیر`, from: days[0], to: today };
}
