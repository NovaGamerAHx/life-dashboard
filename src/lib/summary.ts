import {
  clockToFa, formatJalali, formatJalaliShort, formatScore, parseClock, toFa, weekdayName,
} from './jalali';
import { formatDurationFa, habitsDoneOn, inRange, reflectionMap, sleepDurationMin } from './stats';
import { moodFace, moodLabel, type DayReflection, type Habit, type Task } from './types';

/** متن جانشین برای داده‌های ثبت‌نشده — همه‌جای خروجی متنی صریح است */
export const NOT_RECORDED = 'ثبت نشده';
export const EMPTY_TEXT = 'خالی';

export interface SummaryOptions {
  /** نمره روز در خروجی باشد یا نه */
  includeScore: boolean;
  mood: boolean;
  /** خواب/بیداری، ورزش و بیرون رفتن */
  basics: boolean;
  /** وضعیت تسک‌ها و عادت‌های آن روز */
  progress: boolean;
  dayNote: boolean;
  wins: boolean;
  improve: boolean;
  lessons: boolean;
  gratitude: boolean;
  style: 'plain' | 'markdown';
  /** سرصفحه (تاریخ و نشانه‌گذاری) */
  header: boolean;
}

export const DEFAULT_SUMMARY_OPTIONS: SummaryOptions = {
  includeScore: true,
  mood: true,
  basics: true,
  progress: true,
  dayNote: true,
  wins: true,
  improve: true,
  lessons: true,
  gratitude: true,
  style: 'plain',
  header: true,
};

export interface SummaryContext {
  reflections: DayReflection[];
  tasks: Task[];
  habits: Habit[];
  habitLogs: Record<string, boolean>;
}

function emptyText(v?: string | null): string {
  const t = (v ?? '').trim();
  return t ? t : EMPTY_TEXT;
}

function boolText(v: boolean | undefined, extra?: string): string {
  if (v !== true) return NOT_RECORDED;
  const e = (extra ?? '').trim();
  return e ? `بله — ${e}` : 'بله';
}

function line(style: SummaryOptions['style'], icon: string, title: string, value: string): string {
  return style === 'markdown' ? `- ${icon} **${title}:** ${value}` : `${icon} ${title}: ${value}`;
}

/** جمع‌بندی وضعیت تسک‌های یک روز */
function taskLine(day: number, tasks: Task[]): string {
  const list = tasks.filter((t) => !t.backlog && t.due === day);
  if (list.length === 0) return `${NOT_RECORDED} — تسکی برای این روز زمان‌بندی نشده بود`;
  const done = list.filter((t) => t.status === 'done').length;
  const pct = Math.round((done / list.length) * 100);
  const doneTitles = list.filter((t) => t.status === 'done').map((t) => t.title);
  const openTitles = list.filter((t) => t.status !== 'done').map((t) => t.title);
  const parts = [`${toFa(done)} از ${toFa(list.length)} انجام شد (${toFa(pct)}٪)`];
  if (doneTitles.length) parts.push(`انجام‌شده: ${doneTitles.join(' / ')}`);
  if (openTitles.length) parts.push(`باقی‌مانده: ${openTitles.join(' / ')}`);
  return parts.join(' • ');
}

function habitLine(day: number, habits: Habit[], logs: Record<string, boolean>): string {
  const active = habits.filter((h) => !h.archived);
  if (active.length === 0) return `${NOT_RECORDED} — عادت فعالی تعریف نشده است`;
  const done = active.filter((h) => logs[`${h.id}:${day}`]);
  const rest = active.filter((h) => !logs[`${h.id}:${day}`]);
  const parts = [`${toFa(done.length)} از ${toFa(active.length)} انجام شد`];
  if (done.length) parts.push(`انجام‌شده: ${done.map((h) => h.title).join(' / ')}`);
  if (rest.length) parts.push(`انجام‌نشده: ${rest.map((h) => h.title).join(' / ')}`);
  return parts.join(' • ');
}

function sleepLine(r: DayReflection | undefined): string {
  const wake = r?.wake?.trim();
  const sleep = r?.sleep?.trim();
  if (!wake && !sleep) return `${NOT_RECORDED} — ساعت خواب و بیداری وارد نشده است`;
  const dur = sleepDurationMin(wake, sleep);
  const parts: string[] = [];
  parts.push(wake ? `بیداری ${clockToFa(wake)}` : `بیداری ${NOT_RECORDED}`);
  parts.push(sleep ? `خواب ${clockToFa(sleep)}` : `خواب ${NOT_RECORDED}`);
  if (dur != null) parts.push(`مدت خواب ${formatDurationFa(dur)}`);
  return parts.join(' • ');
}

export interface DaySummaryExtras {
  /** خلاصه یک روز کامل (متن چندخطی) */
  day: number;
  withScore: boolean;
}

/** خلاصه متنی یک روز — همه بخش‌ها صریح، شامل موارد خالی */
export function buildDaySummary(
  day: number,
  ctx: SummaryContext,
  opts: SummaryOptions,
  /** نگاشت آماده روز→بازتاب؛ برای خروجی چندروزه یک بار ساخته می‌شود */
  presetMap?: Map<number, DayReflection>,
): string {
  const r = (presetMap ?? reflectionMap(ctx.reflections)).get(day);
  const style = opts.style;
  const useMarkdown = style === 'markdown';
  const lines: string[] = [];

  if (opts.header) {
    const dateTitle = `${weekdayName(day)} ${formatJalali(day)}`;
    lines.push(useMarkdown ? `### 📅 ${dateTitle}` : `📅 ${dateTitle}`);
    lines.push(useMarkdown ? `*کد روز: ${formatJalaliShort(day)}*` : `   کد روز: ${formatJalaliShort(day)}`);
  }

  if (opts.includeScore) {
    lines.push(line(style, '⭐', 'نمره روز', r?.score != null ? `${formatScore(r.score)} از ۱۰` : NOT_RECORDED));
  }

  if (opts.mood) {
    lines.push(
      line(
        style,
        '😊',
        'حال روز',
        r?.mood != null ? `${moodFace(r.mood)} ${moodLabel(r.mood)}` : NOT_RECORDED,
      ),
    );
  }

  if (opts.progress) {
    lines.push(line(style, '✅', 'تسک‌ها', taskLine(day, ctx.tasks)));
    lines.push(line(style, '🔥', 'عادت‌ها', habitLine(day, ctx.habits, ctx.habitLogs)));
  }

  if (opts.basics) {
    lines.push(line(style, '😴', 'خواب', sleepLine(r)));
    lines.push(line(style, '🏃', 'ورزش', boolText(r?.sport, r?.sportType)));
    lines.push(
      line(
        style,
        '🚶',
        'بیرون رفتن',
        r?.wentOut === true ? boolText(true, r?.outPlace) : r?.wentOut === false ? 'خیر — بیرون نرفتم' : NOT_RECORDED,
      ),
    );
  }

  if (opts.dayNote) lines.push(line(style, '📝', 'یادداشت روز', emptyText(r?.dayNote)));
  if (opts.wins) lines.push(line(style, '🏆', 'دستاوردها', emptyText(r?.wins)));
  if (opts.improve) lines.push(line(style, '🔧', 'قابل بهبود', emptyText(r?.improve)));
  if (opts.lessons) lines.push(line(style, '💡', 'درس آموخته‌شده', emptyText(r?.lessons)));
  if (opts.gratitude) lines.push(line(style, '🙏', 'قدردانی', emptyText(r?.gratitude)));

  if (!r) {
    lines.push(line(style, 'ℹ️', 'وضعیت بازتاب', 'برای این روز هیچ بازتابی ثبت نشده است'));
  }

  return lines.join('\n');
}

export interface MultiSummaryOptions extends SummaryOptions {
  /** سرصفحه کلی (تعداد روزها + آمار کلی) */
  groupHeader?: boolean;
  /** چیدمان روزها */
  sort?: 'asc' | 'desc' | 'scoreDesc' | 'scoreAsc';
  title?: string;
}

function sortDays(days: number[], refs: Map<number, DayReflection>, sort: MultiSummaryOptions['sort']): number[] {
  const arr = [...days];
  switch (sort) {
    case 'desc':
      return arr.sort((a, b) => b - a);
    case 'scoreDesc':
      return arr.sort((a, b) => (refs.get(b)?.score ?? -1) - (refs.get(a)?.score ?? -1) || b - a);
    case 'scoreAsc':
      return arr.sort((a, b) => (refs.get(a)?.score ?? 11) - (refs.get(b)?.score ?? 11) || b - a);
    case 'asc':
    default:
      return arr.sort((a, b) => a - b);
  }
}

/** خلاصه متنی چند روز انتخاب‌شده (خروجی آمادهٔ کپی) */
export function buildMultiDaySummary(
  days: number[],
  ctx: SummaryContext,
  opts: MultiSummaryOptions,
): string {
  const refs = reflectionMap(ctx.reflections);
  const ordered = sortDays(days, refs, opts.sort ?? 'asc');
  const blocks = ordered.map((d) => buildDaySummary(d, ctx, opts, refs));
  const sep = opts.style === 'markdown' ? '\n\n---\n\n' : '\n\n────────────────────────\n\n';

  if (opts.groupHeader === false) return blocks.join(sep);

  const scored = ordered.map((d) => refs.get(d)?.score).filter((s): s is number => s != null);
  const avgScore = scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10 : null;
  const title = opts.title ?? `خلاصه ${toFa(ordered.length)} روز`;
  const head: string[] = [];
  head.push(opts.style === 'markdown' ? `## ${title}` : `━━━━ ${title} ━━━━`);
  head.push(
    `بازه: ${formatJalali(ordered[0])} تا ${formatJalali(ordered[ordered.length - 1])}` +
      ` • روزهای انتخاب‌شده: ${toFa(ordered.length)}` +
      (opts.includeScore
        ? ` • روزهای با نمره: ${toFa(scored.length)}` +
          (avgScore != null ? ` • میانگین نمره: ${formatScore(avgScore)} از ۱۰` : ` • میانگین نمره: ${NOT_RECORDED}`)
        : ' • نمره‌ها در این خروجی حذف شده‌اند'),
  );
  return `${head.join('\n')}\n\n${sep.trimStart()}\n${blocks.join(sep)}`;
}

/** آمار خلاصه یک مجموعه روز (برای نمایش در کارت‌های آماری) */
export function scoreSummary(numbers: number[]): {
  count: number;
  avg: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
} {
  const s = numbers.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!s.length) return { count: 0, avg: null, median: null, min: null, max: null };
  const mid = Math.floor(s.length / 2);
  return {
    count: s.length,
    avg: Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 10) / 10,
    median: s.length % 2 ? s[mid] : Math.round(((s[mid - 1] + s[mid]) / 2) * 10) / 10,
    min: s[0],
    max: s[s.length - 1],
  };
}

/** ورودی‌های خالی/ثبت‌نشده یک بازتاب را می‌شمارد (برای نمایش کیفیت ثبت داده) */
export function missingFields(r: DayReflection | undefined): string[] {
  if (!r) return ['همه بخش‌ها'];
  const out: string[] = [];
  if (r.score == null) out.push('نمره');
  if (!r.wake) out.push('ساعت بیداری');
  if (!r.sleep) out.push('ساعت خواب');
  if (!r.sport) out.push('ورزش');
  if (!r.wentOut) out.push('بیرون رفتن');
  if (!(r.dayNote ?? '').trim()) out.push('یادداشت روز');
  if (!(r.wins ?? '').trim()) out.push('دستاوردها');
  if (!(r.improve ?? '').trim()) out.push('قابل بهبود');
  if (!(r.lessons ?? '').trim()) out.push('درس آموخته‌شده');
  if (!(r.gratitude ?? '').trim()) out.push('قدردانی');
  return out;
}

/** تعداد روزهای دارای بازتاب در بازه */
export function countReflectionsInRange(reflections: DayReflection[], start: number, end: number): number {
  return reflections.filter((r) => inRange(r.day, start, end)).length;
}

/** ساعت شروع تسک‌های یک روز به شکل مرتب‌شده (برای خروجی متنی) */
export function sortedTaskTimes(day: number, tasks: Task[]): string[] {
  return tasks
    .filter((t) => !t.backlog && t.due === day && t.time)
    .map((t) => clockToFa(t.time!))
    .filter((t) => parseClock(t) != null)
    .sort();
}

export { habitsDoneOn };
