import {
  addDays, parseClock, startOfDay, todayStart, weekRange, jalaliMonthRange, eachDay,
} from './jalali';
import type { DayReflection, Habit, Task } from './types';

export function inRange(ts: number, start: number, end: number): boolean {
  return ts >= start && ts <= end;
}

export function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

export function avg(nums: number[]): number | null {
  return nums.length ? sum(nums) / nums.length : null;
}

/** میانه — مقاوم‌تر از میانگین در برابر مقادیر پرت */
export function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function round1(n: number | null | undefined): number | null {
  return n == null || !Number.isFinite(n) ? null : Math.round(n * 10) / 10;
}

/** کمینه و بیشینه با روز مربوطه */
export function extremes(days: Array<{ day: number; value: number | null }>): {
  best: { day: number; value: number } | null;
  worst: { day: number; value: number } | null;
} {
  const valid = days.filter((d): d is { day: number; value: number } => d.value != null);
  if (!valid.length) return { best: null, worst: null };
  const best = valid.reduce((a, b) => (b.value > a.value ? b : a));
  const worst = valid.reduce((a, b) => (b.value < a.value ? b : a));
  return { best, worst };
}

/** هیستوگرام نمره در سبدهای نیم‌نمره‌ای/یک‌نمره‌ای */
export function scoreHistogram(
  scores: number[],
  bucket = 1,
): Array<{ from: number; to: number; count: number }> {
  const buckets: Array<{ from: number; to: number; count: number }> = [];
  for (let i = 0; i < 10 / bucket; i++) {
    buckets.push({ from: i * bucket, to: (i + 1) * bucket - 0.1, count: 0 });
  }
  for (const s of scores) {
    const idx = Math.min(buckets.length - 1, Math.max(0, Math.floor(s / bucket)));
    buckets[idx].count += 1;
  }
  return buckets;
}

// ── عادت‌ها ────────────────────────────────────────────────
/** استریک عادت: تعداد روزهای پیاپیِ انجام‌شده تا امروز/دیروز */
export function habitStreak(habitId: string, logs: Record<string, boolean>): number {
  let streak = 0;
  let cursor = todayStart();
  if (!logs[`${habitId}:${cursor}`]) cursor = addDays(cursor, -1);
  while (logs[`${habitId}:${cursor}`]) {
    streak++;
    cursor = addDays(cursor, -1);
    if (streak > 3650) break;
  }
  return streak;
}

export function habitWeekCount(habitId: string, logs: Record<string, boolean>): number {
  const today = todayStart();
  let c = 0;
  for (let i = 0; i < 7; i++) {
    if (logs[`${habitId}:${addDays(today, -i)}`]) c++;
  }
  return c;
}

export function habitTotalCount(habitId: string, logs: Record<string, boolean>): number {
  let c = 0;
  for (const k of Object.keys(logs)) {
    if (k.startsWith(habitId + ':') && logs[k]) c++;
  }
  return c;
}

/** تعداد عادت‌های انجام‌شده در یک روز مشخص (فقط عادت‌های فعال) */
export function habitsDoneOn(day: number, habits: Habit[], logs: Record<string, boolean>): number {
  let c = 0;
  for (const h of habits) if (logs[`${h.id}:${day}`]) c++;
  return c;
}

export function taskProgress(sub: Array<{ done: boolean }>): number {
  if (sub.length === 0) return 0;
  return Math.round((sub.filter((s) => s.done).length / sub.length) * 100);
}

// ── آمار روزانه ────────────────────────────────────────────
export interface DayStats {
  day: number;
  /** وظایف زمان‌بندی‌شده برای این روز */
  total: number;
  done: number;
  /** درصد انجام تسک‌ها؛ ۱- یعنی تسکی نبوده */
  pct: number;
  score: number | null;
  mood: number | null;
  sport: boolean;
  wentOut: boolean;
  habitsDone: number;
  habitsTotal: number;
  hasReflection: boolean;
  reflection?: DayReflection;
}

export function buildDayStats(
  days: number[],
  state: {
    tasks: Task[];
    habits: Habit[];
    habitLogs: Record<string, boolean>;
    reflections: DayReflection[];
  },
): DayStats[] {
  const refMap = reflectionMap(state.reflections);
  const activeHabits = state.habits.filter((h) => !h.archived);
  // یک بار وظایف را بر اساس روز گروه می‌کنیم (به جای فیلتر تکرارشونده)
  const byDue = new Map<number, { total: number; done: number }>();
  for (const t of state.tasks) {
    if (t.backlog || t.due == null) continue;
    const e = byDue.get(t.due) ?? { total: 0, done: 0 };
    e.total += 1;
    if (t.status === 'done') e.done += 1;
    byDue.set(t.due, e);
  }
  return days.map((day) => {
    const agg = byDue.get(day) ?? { total: 0, done: 0 };
    const ref = refMap.get(day);
    return {
      day,
      total: agg.total,
      done: agg.done,
      pct: agg.total ? Math.round((agg.done / agg.total) * 100) : -1,
      score: ref?.score ?? null,
      mood: ref?.mood ?? null,
      sport: !!ref?.sport,
      wentOut: !!ref?.wentOut,
      habitsDone: habitsDoneOn(day, activeHabits, state.habitLogs),
      habitsTotal: activeHabits.length,
      hasReflection: !!ref,
      reflection: ref,
    };
  });
}

/** نگاشت روز → بازتاب، برای جست‌وجوی سریع O(1) */
export function reflectionMap(reflections: DayReflection[] | undefined): Map<number, DayReflection> {
  const m = new Map<number, DayReflection>();
  for (const r of reflections ?? []) {
    const key = startOfDay(r.day);
    const prev = m.get(key);
    // اگر چند رکورد برای یک روز باشد، تازه‌ترین برنده است
    if (!prev || (r.updatedAt ?? 0) >= (prev.updatedAt ?? 0)) m.set(key, r);
  }
  return m;
}

export function sleepDurationMin(wake?: string, sleep?: string): number | null {
  if (!wake || !sleep) return null;
  const wm = parseClock(wake);
  const sm = parseClock(sleep);
  if (wm == null || sm == null) return null;
  let diff = wm - sm;
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

/** میانگین ساعت بیداری/خواب به‌صورت متنی */
export function formatDurationFa(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  const fa = (n: number) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  return `${fa(h)} ساعت${m ? ` و ${fa(m)} دقیقه` : ''}`;
}

// ── بازه‌ها ────────────────────────────────────────────────
export interface Range {
  start: number;
  end: number;
}

export function rangeDays(range: Range): number[] {
  return eachDay(range.start, range.end);
}

export function rangeLength(range: Range): number {
  return Math.max(0, Math.round((startOfDay(range.end) - startOfDay(range.start)) / 86400000) + 1);
}

/** بازه قبلی با همان طول (برای مقایسه روند) */
export function previousRange(range: Range): Range {
  const len = rangeLength(range);
  const end = addDays(startOfDay(range.start), -1);
  return { start: addDays(end, -(len - 1)), end };
}

export function thisWeekRange(ts: number, weekStart: 'sat' | 'mon'): Range {
  return weekRange(ts, weekStart);
}

export function thisMonthRange(ts: number): Range {
  const m = jalaliMonthRange(ts);
  return { start: m.start, end: m.end };
}

export function lastNDaysRange(n: number, endTs = todayStart()): Range {
  const end = startOfDay(endTs);
  return { start: addDays(end, -(Math.max(1, n) - 1)), end };
}

/** برچسب‌های روز هفته (شنبه…جمعه) با نمره میانگین */
export function weekdayAverages(
  stats: DayStats[],
  persianWeekday: (ts: number) => number,
): Array<{ wd: number; avgScore: number | null; count: number }> {
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  for (const s of stats) {
    if (s.score == null) continue;
    buckets[persianWeekday(s.day)].push(s.score);
  }
  return buckets.map((b, wd) => ({ wd, avgScore: round1(avg(b)), count: b.length }));
}

// ── خروجی گرفتن ────────────────────────────────────────────
export function exportRowsCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return '';
  const head = Object.keys(rows[0]);
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [head.map(esc).join(',')];
  for (const r of rows) lines.push(head.map((h) => esc(r[h])).join(','));
  // BOM برای نمایش صحیح فارسی در اکسل
  return '\ufeff' + lines.join('\n');
}

export function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
