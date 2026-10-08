import {
  formatDurationFa, rollupDays, scoreStats, type DayStat,
} from './days';
import { formatScore, toFa } from './jalali';

/** بلندترین رشته روزهای پیاپی با نمره ≥ آستانه */
export function goodStreak(list: DayStat[], threshold: number): DayStat[] {
  let best: DayStat[] = [];
  let cur: DayStat[] = [];
  for (const d of list) {
    if (d.score != null && d.score >= threshold) {
      cur.push(d);
      if (cur.length > best.length) best = [...cur];
    } else if (d.score != null) {
      cur = [];
    }
  }
  return best;
}

/** روزهای پیاپی بدون نمره در انتهای بازه (برای هشدار ثبت) */
export function daysSinceLastScore(list: DayStat[]): number | null {
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].score != null) return list.length - 1 - i;
  }
  return null;
}

/** بینش‌های متنی بازه — کوتاه، دقیق و مبتنی بر داده‌های ثبت‌شده روزها */
export function buildLifeInsights(a: {
  stats: DayStat[];
  s: ReturnType<typeof scoreStats>;
  roll: ReturnType<typeof rollupDays>;
  streakDays: DayStat[];
  sinceLast: number | null;
  range: { label: string; days: number[] };
}): string[] {
  const out: string[] = [];
  const { s, roll } = a;
  if (a.stats.every((d) => d.score == null && !d.hasReflection && d.tasksTotal === 0)) {
    return ['داده‌ای در این بازه ثبت نشده است. از صفحه «روز جاری» تسک‌ها را زمان‌بندی کن و هر شب بازتاب بنویس.'];
  }
  if (s.count > 0) {
    if (s.avg != null && s.avg >= 8) out.push(`میانگین نمره ${formatScore(s.avg)} از ۱۰ است — بازه درخشانی بوده! همین روند را حفظ کن. 🌟`);
    else if (s.avg != null && s.avg >= 6) out.push(`میانگین نمره ${formatScore(s.avg)} از ۱۰ است؛ با چند تغییر کوچک (خواب منظم‌تر، یک تسک مهم در روز) می‌توانی به بالای ۸ برسی.`);
    else if (s.avg != null) out.push(`میانگین نمره ${formatScore(s.avg)} از ۱۰ است. پیشنهاد: هر روز فقط ۳ کار مهم انتخاب کن و شب‌ها «۱ مورد قابل بهبود» را بنویس.`);
    if (s.std != null && s.std >= 2) out.push(`نوسان نمره‌ها ${formatScore(s.std)} است (زیاد)؛ روزهای پراکنده، انرژی و تمرکز را می‌گیرند. یک روتین ثابت صبحگاهی کمک می‌کند.`);
    else if (s.std != null) out.push(`نوسان نمره‌ها ${formatScore(s.std)} است — یعنی روزهایت نسبتاً پایدارند. 👌`);
  }
  if (a.streakDays.length >= 3) {
    out.push(`${toFa(a.streakDays.length)} روز پیاپی نمره ۸ یا بالاتر ثبت کرده‌ای؛ این بهترین زنجیره این بازه است. 🔥`);
  }
  if (roll.avgTasksPct != null && roll.avgTasksPct < 50 && roll.taskDays >= 3) {
    out.push(`میانگین انجام تسک‌ها ${toFa(roll.avgTasksPct)}٪ است؛ تعداد تسک‌های روزانه را کم و واقع‌بینانه‌تر کن.`);
  } else if (roll.avgTasksPct != null && roll.avgTasksPct >= 80) {
    out.push(`میانگین انجام تسک‌ها ${toFa(roll.avgTasksPct)}٪ است — برنامه‌ریزی‌ات دقیق است. 💪`);
  }
  if (roll.sportDays === 0 && a.stats.length >= 7) {
    out.push('در این بازه ورزشی ثبت نشده؛ حتی ۱۵ دقیقه پیاده‌روی هم روی حال و نمره روز اثر می‌گذارد. 🏃');
  } else if (roll.sportDays >= 3) {
    out.push(`${toFa(roll.sportDays)} روز ورزش ثبت شده است — بدن فعال، ذهن فعال. 💪`);
  }
  if (roll.sleepCount >= 3 && roll.avgSleepMin != null) {
    const h = roll.avgSleepMin / 60;
    if (h < 6.5) out.push(`میانگین خواب ${formatDurationFa(roll.avgSleepMin)} است (کمتر از حد ایده‌آل)؛ هدف ۷ تا ۹ ساعت است. 😴`);
    else if (h > 9.5) out.push(`میانگین خواب ${formatDurationFa(roll.avgSleepMin)} است؛ خواب زیاد هم می‌تواند نشانه خستگی انباشته باشد.`);
    else out.push(`میانگین خواب ${formatDurationFa(roll.avgSleepMin)} است — در محدوده مطلوب. 😴`);
  }
  if (a.sinceLast != null && a.sinceLast >= 3) {
    out.push(`${toFa(a.sinceLast)} روز آخر بازه نمره‌ای ثبت نشده؛ با یک نمره‌دهی سریع، نمودار کامل‌تر می‌شود.`);
  }
  if (s.count > 0 && s.count < a.stats.length) {
    out.push(`${toFa(s.count)} روز از ${toFa(a.stats.length)} روز این بازه نمره دارند (${toFa(Math.round((s.count / a.stats.length) * 100))}٪).`);
  }
  return out.slice(0, 7);
}
