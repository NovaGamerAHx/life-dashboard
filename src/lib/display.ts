import { formatScore } from './jalali';

/** متن استاندارد برای هر چیزی که ثبت نشده است */
export const EMPTY_LABEL = 'ثبت نشده';
/** میان‌بر کوتاه همان عبارت (برای جاهای کم‌عرض) */
export const EMPTY = EMPTY_LABEL;

/** اگر مقدار خالی بود، «ثبت نشده» و در غیر این صورت خود مقدار */
export function orEmpty(v: string | null | undefined, fallback = EMPTY_LABEL): string {
  const s = (v ?? '').trim();
  return s ? s : fallback;
}

export interface MoodMeta {
  v: 1 | 2 | 3 | 4 | 5;
  emoji: string;
  label: string;
  short: string;
  color: string;
}

/** حال روزها — تنها منبع حقیقت برای نمایش حال در همه صفحات */
export const MOODS: MoodMeta[] = [
  { v: 1, emoji: '😞', label: 'بد', short: 'بد', color: '#f43f5e' },
  { v: 2, emoji: '😐', label: 'معمولی', short: 'معمولی', color: '#f59e0b' },
  { v: 3, emoji: '🙂', label: 'خوب', short: 'خوب', color: '#84cc16' },
  { v: 4, emoji: '😄', label: 'عالی', short: 'عالی', color: '#10b981' },
  { v: 5, emoji: '🤩', label: 'فوق‌العاده', short: 'فوق‌العاده', color: '#06b6d4' },
];

export function moodFace(m: number | null | undefined): string {
  if (m == null) return '—';
  return MOODS.find((x) => x.v === m)?.emoji ?? '—';
}

export function moodLabel(m: number | null | undefined): string {
  if (m == null) return EMPTY_LABEL;
  const f = MOODS.find((x) => x.v === m);
  return f ? `${f.emoji} ${f.label} (${formatScore(m)} از ۵)` : EMPTY_LABEL;
}

export function moodColor(m: number | null | undefined): string {
  return MOODS.find((x) => x.v === m)?.color ?? '#94a3b8';
}

/** رنگ میله/نشان نمره بر اساس مقدار (۰ تا ۱۰) */
export function scoreColor(n: number | null | undefined): string {
  if (n == null) return '#cbd5e1';
  if (n >= 8) return '#10b981';
  if (n >= 6.5) return '#84cc16';
  if (n >= 5) return '#f59e0b';
  if (n >= 3) return '#f97316';
  return '#f43f5e';
}

/** توصیف کلامی نمره روز */
export function scoreGrade(n: number | null | undefined): string {
  if (n == null) return EMPTY_LABEL;
  if (n >= 9) return 'درخشان';
  if (n >= 8) return 'عالی';
  if (n >= 6.5) return 'خوب';
  if (n >= 5) return 'متوسط';
  if (n >= 3) return 'ضعیف';
  return 'خیلی ضعیف';
}

/** کلاس پس‌زمینه هیت‌مپ تقویم بر اساس نمره (۰ تا ۱۰) */
export function scoreHeatClass(n: number | null | undefined): string {
  if (n == null) return '';
  if (n >= 9) return 'bg-emerald-500/40 dark:bg-emerald-500/35';
  if (n >= 8) return 'bg-emerald-500/30 dark:bg-emerald-500/25';
  if (n >= 7) return 'bg-emerald-500/20 dark:bg-emerald-500/18';
  if (n >= 6) return 'bg-lime-500/20 dark:bg-lime-500/18';
  if (n >= 5) return 'bg-amber-500/18 dark:bg-amber-500/16';
  if (n >= 4) return 'bg-orange-500/18 dark:bg-orange-500/16';
  if (n >= 3) return 'bg-orange-500/25 dark:bg-orange-500/22';
  return 'bg-rose-500/25 dark:bg-rose-500/22';
}

/** رنگ ثابت هیت‌مپ برای راهنما (سبک) */
export const SCORE_LEGEND: Array<{ label: string; cls: string }> = [
  { label: '۰–۳', cls: 'bg-rose-500/25' },
  { label: '۳–۵', cls: 'bg-orange-500/25' },
  { label: '۵–۶٫۵', cls: 'bg-amber-500/20' },
  { label: '۶٫۵–۸', cls: 'bg-lime-500/20' },
  { label: '۸–۹', cls: 'bg-emerald-500/30' },
  { label: '۹–۱۰', cls: 'bg-emerald-500/40' },
];
