import { addDays, todayStart } from './jalali';

/** استریک عادت: تعداد روزهای پیاپیِ انجام‌شده تا امروز/دیروز */
export function habitStreak(habitId: string, logs: Record<string, boolean>): number {
  let streak = 0;
  let cursor = todayStart();
  // اگر امروز انجام نشده، از دیروز شروع کن
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

/** درصد پیشرفت زیروظایف */
export function taskProgress(sub: Array<{ done: boolean }>): number {
  if (sub.length === 0) return 0;
  return Math.round((sub.filter((s) => s.done).length / sub.length) * 100);
}

/** ساخت CSV از ردیف‌ها (با BOM برای نمایش صحیح فارسی در Excel) */
export function exportRowsCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return '';
  const head = Object.keys(rows[0]);
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [head.map(esc).join(',')];
  for (const r of rows) lines.push(head.map((h) => esc(r[h] ?? '')).join(','));
  return '\ufeff' + lines.join('\n');
}

/** دانلود متن (CSV/TXT) به‌صورت فایل */
export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8'): void {
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

/** کپی متن در کلیپ‌بورد با فالبک برای مرورگرهای قدیمی */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* سراغ روش جایگزین می‌رویم */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
