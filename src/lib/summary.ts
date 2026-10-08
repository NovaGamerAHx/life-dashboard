import type { DayStat } from './days';
import {
  formatDurationFa, rollupDays, scoreStats,
} from './days';
import {
  formatClock24, formatGregorianIso, formatJalali, formatJalaliFull,
  formatJalaliShort, formatScore, toFa,
} from './jalali';
import { EMPTY, moodLabel, orEmpty, scoreGrade } from './display';
import { exportRowsCsv } from './stats';

/** گزینه‌های ساخت خروجی متنی/CSV از روزها */
export interface SummaryOptions {
  /** شامل نمره روز */
  includeScore: boolean;
  /** شامل حال روز (اموجی و مقدار) */
  includeMood: boolean;
  /** شامل توضیحات/یادداشت آزاد روز */
  includeNote: boolean;
  /** شامل بخش بازتاب: دستاوردها، قابل بهبود، درس، قدردانی */
  includeReflection: boolean;
  /** شامل خواب، ورزش و بیرون رفتن */
  includeBasics: boolean;
  /** شامل وضعیت عادت‌ها */
  includeHabits: boolean;
  /** شامل تسک‌های روز */
  includeTasks: boolean;
  /** شامل رویدادهای روز */
  includeEvents: boolean;
  /** موارد خالی با عبارت «ثبت نشده» نوشته شوند (در غیر این صورت حذف می‌شوند) */
  showEmpty: boolean;
  /** خلاصه آماری در ابتدای متن */
  includeStats: boolean;
  /** عنوان و بازه در ابتدای متن */
  includeHeader: boolean;
}

export const DEFAULT_SUMMARY_OPTIONS: SummaryOptions = {
  includeScore: true,
  includeMood: true,
  includeNote: true,
  includeReflection: true,
  includeBasics: true,
  includeHabits: true,
  includeTasks: false,
  includeEvents: false,
  showEmpty: true,
  includeStats: true,
  includeHeader: true,
};

export const LINE = '────────────────────────────';

const num = (v: number): string => toFa(v);

/** بلوک متنی یک روز — همه فیلدها شفاف و کامل */
export function buildDayBlock(d: DayStat, opts: SummaryOptions, index?: number): string {
  const lines: string[] = [];
  const title = formatJalaliFull(d.day);
  const head = index != null ? `${toFa(index)}) ${title}` : title;
  lines.push(`${head}  🗓️`);
  lines.push(`   ${formatJalaliShort(d.day)} • ${formatGregorianIso(d.day)}`);

  if (opts.includeScore) {
    lines.push(
      d.score != null
        ? `⭐ نمره روز: ${formatScore(d.score)} از ۱۰ (${scoreGrade(d.score)})`
        : `⭐ نمره روز: ${EMPTY}`,
    );
  }

  if (opts.includeMood) {
    lines.push(`🙂 حال روز: ${moodLabel(d.mood)}`);
  }

  if (opts.includeNote) {
    const note = orEmpty(d.dayNote);
    if (note !== EMPTY || opts.showEmpty) lines.push(`📝 توضیحات روز: ${note}`);
  }

  if (opts.includeReflection) {
    const push = (label: string, value?: string) => {
      const v = orEmpty(value);
      if (v !== EMPTY || opts.showEmpty) lines.push(`${label}: ${v}`);
    };
    push('🏆 دستاوردها', d.wins);
    push('🔧 قابل بهبود', d.improve);
    push('💡 درس آموخته', d.lessons);
    push('🙏 قدردانی', d.gratitude);
  }

  if (opts.includeBasics) {
    const wake = d.wake ? formatClock24(d.wake) : '';
    const sleep = d.sleep ? formatClock24(d.sleep) : '';
    if (wake || sleep || opts.showEmpty) {
      lines.push(
        `😴 خواب: ${wake ? `بیداری ${wake}` : `بیداری ${EMPTY}`}` +
          ` • ${sleep ? `خواب ${sleep}` : `خواب ${EMPTY}`}` +
          (d.sleepMin != null ? ` • مدت ${formatDurationFa(d.sleepMin)}` : ''),
      );
    }
    if (d.sport || opts.showEmpty) {
      lines.push(`🏃 ورزش: ${d.sport ? `بله${d.sportType ? ` (${d.sportType})` : ''}` : EMPTY}`);
    }
    if (d.wentOut || opts.showEmpty) {
      lines.push(`🚶 بیرون رفتن: ${d.wentOut ? `بله${d.outPlace ? ` (${d.outPlace})` : ''}` : EMPTY}`);
    }
  }

  if (opts.includeHabits && (d.habitsTotal > 0 || opts.showEmpty)) {
    if (d.habitsTotal === 0) {
      lines.push(`🔥 عادت‌ها: ${EMPTY} (عادت فعالی تعریف نشده است)`);
    } else {
      lines.push(`🔥 عادت‌ها: ${num(d.habitsDone)} از ${num(d.habitsTotal)} انجام شد`);
      if (d.habitsDoneTitles.length) lines.push(`   ✓ انجام‌شده: ${d.habitsDoneTitles.join('، ')}`);
      if (d.habitsMissedTitles.length) lines.push(`   ✗ انجام‌نشده: ${d.habitsMissedTitles.join('، ')}`);
    }
  }

  if (opts.includeTasks && (d.tasksTotal > 0 || opts.showEmpty)) {
    if (d.tasksTotal === 0) {
      lines.push(`✅ تسک‌ها: ${EMPTY} (برای این روز تسکی زمان‌بندی نشده بود)`);
    } else {
      lines.push(`✅ تسک‌ها: ${num(d.tasksDone)} از ${num(d.tasksTotal)} انجام شد (${num(d.tasksPct)}٪)`);
      for (const t of d.tasks) {
        const st = t.status === 'done' ? 'انجام‌شده' : t.status === 'doing' ? 'در حال انجام' : 'انجام‌نشده';
        const time = t.time ? ` — ساعت ${formatClock24(t.time)}` : '';
        lines.push(`   • [${st}] ${t.title}${time}`);
      }
    }
  }

  if (opts.includeEvents && (d.events.length > 0 || opts.showEmpty)) {
    if (d.events.length === 0) {
      lines.push(`📅 رویدادها: ${EMPTY}`);
    } else {
      lines.push(`📅 رویدادها: ${num(d.events.length)} مورد`);
      for (const e of d.events) {
        lines.push(`   • ${e.title}${e.time ? ` — ساعت ${formatClock24(e.time)}` : ' — بدون ساعت'}`);
      }
    }
  }

  // اگر هیچ چیزی برای گفتن نبود، صریح بگو
  if (lines.length <= 2) {
    lines.push(`⛔ در این روز هیچ داده‌ای ثبت نشده است.`);
  }
  return lines.join('\n');
}

export interface SummaryMeta {
  label: string;
  from: number;
  to: number;
  count: number;
}

/** متن کامل خروجی برای مجموعه‌ای از روزها */
export function buildSummaryText(list: DayStat[], opts: SummaryOptions, meta: SummaryMeta): string {
  const parts: string[] = [];
  if (opts.includeHeader) {
    const range = meta.from === meta.to
      ? formatJalali(meta.from, { weekday: true })
      : `${formatJalali(meta.from)} تا ${formatJalali(meta.to)}`;
    const scored = list.filter((d) => d.score != null).length;
    parts.push(`📋 خلاصه روزها — ${toFa(meta.count)} روز انتخاب‌شده`);
    parts.push(`🗂️ بازه: ${range} (${meta.label})`);
    if (opts.includeScore) parts.push(`⭐ ${toFa(scored)} روز دارای نمره • ${toFa(meta.count - scored)} روز بدون نمره`);
    parts.push(LINE);
  }

  if (opts.includeStats && list.length > 0) {
    const s = scoreStats(list);
    const r = rollupDays(list);
    const stats: string[] = [];
    if (opts.includeScore) {
      stats.push(
        s.avg != null
          ? `⭐ میانگین نمره: ${formatScore(s.avg)} از ۱۰ (${toFa(s.count)} روز)`
          : '⭐ میانگین نمره: ثبت نشده',
      );
      if (s.max != null && s.best) stats.push(`🥇 بالاترین نمره: ${formatScore(s.max)} (${formatJalali(s.best.day)})`);
      if (s.min != null && s.worst) stats.push(`🥉 پایین‌ترین نمره: ${formatScore(s.min)} (${formatJalali(s.worst.day)})`);
      if (s.std != null) stats.push(`📊 نوسان (انحراف معیار): ${formatScore(s.std)}`);
    }
    if (opts.includeMood && r.avgMood != null) stats.push(`🙂 میانگین حال روز: ${formatScore(r.avgMood)} از ۵`);
    if (opts.includeTasks && r.avgTasksPct != null) {
      stats.push(`✅ میانگین انجام تسک‌ها: ${toFa(r.avgTasksPct)}٪ (${toFa(r.doneTasks)} از ${toFa(r.totalTasks)})`);
    }
    if (opts.includeBasics) {
      if (r.avgSleepMin != null) stats.push(`😴 میانگین خواب: ${formatDurationFa(r.avgSleepMin)}`);
      stats.push(`🏃 روزهای ورزش: ${toFa(r.sportDays)} روز • 🚶 روزهای بیرون: ${toFa(r.outDays)} روز`);
    }
    if (opts.includeHabits && r.habitPossible > 0) {
      stats.push(`🔥 عادت‌ها: ${toFa(r.habitChecks)} از ${toFa(r.habitPossible)} تیک (${toFa(Math.round((r.habitChecks / r.habitPossible) * 100))}٪)`);
    }
    stats.push(`📝 روزهای دارای بازتاب: ${toFa(r.reflectionDays)} از ${toFa(list.length)}`);
    parts.push(...stats);
    parts.push(LINE);
    parts.push('');
  }

  parts.push(list.map((d, i) => buildDayBlock(d, opts, i + 1)).join(`\n\n${LINE}\n\n`));
  parts.push('');
  parts.push(LINE);
  parts.push(`ساخته‌شده با «میزکار زندگی» — ${formatJalaliFull(Date.now())} ساعت ${toFa(`${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`)}`);
  return parts.join('\n');
}

/** خروجی CSV از روزهای انتخاب‌شده */
export function buildSummaryCsv(list: DayStat[], opts: SummaryOptions): string {
  const rows = list.map((d) => {
    const row: Record<string, string | number> = {
      تاریخ_شمسی: formatJalaliShort(d.day),
      تاریخ_میلادی: formatGregorianIso(d.day),
      روز_هفته: formatJalaliFull(d.day).split(' ')[0],
    };
    if (opts.includeScore) {
      row['نمره_از_۱۰'] = d.score != null ? d.score : '';
      row['توصیف_نمره'] = scoreGrade(d.score);
    }
    if (opts.includeMood) row['حال_روز'] = d.mood != null ? d.mood : '';
    if (opts.includeNote) row['توضیحات_روز'] = orEmpty(d.dayNote, '');
    if (opts.includeReflection) {
      row['دستاوردها'] = orEmpty(d.wins, '');
      row['قابل_بهبود'] = orEmpty(d.improve, '');
      row['درس_آموخته'] = orEmpty(d.lessons, '');
      row['قدردانی'] = orEmpty(d.gratitude, '');
    }
    if (opts.includeBasics) {
      row['بیداری'] = d.wake ?? '';
      row['خواب'] = d.sleep ?? '';
      row['مدت_خواب_ساعت'] = d.sleepMin != null ? Math.round((d.sleepMin / 60) * 10) / 10 : '';
      row['ورزش'] = d.sport ? 'بله' : 'خیر';
      row['نوع_ورزش'] = orEmpty(d.sportType, '');
      row['بیرون_رفتن'] = d.wentOut ? 'بله' : 'خیر';
      row['محل_بیرون'] = orEmpty(d.outPlace, '');
    }
    if (opts.includeHabits) {
      row['عادت_انجام‌شده'] = d.habitsDone;
      row['عادت_کل'] = d.habitsTotal;
    }
    if (opts.includeTasks) {
      row['تسک_انجام‌شده'] = d.tasksDone;
      row['تسک_کل'] = d.tasksTotal;
      row['درصد_تسک'] = d.tasksPct < 0 ? '' : d.tasksPct;
    }
    if (opts.includeEvents) row['تعداد_رویداد'] = d.events.length;
    return row;
  });
  return exportRowsCsv(rows);
}
