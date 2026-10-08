import type { Task } from './types';

/** نام ربع ماتریس آیزنهاور */
export function eisenLabel(important: boolean, urgent: boolean): string {
  if (important && urgent) return '۱ • مهم و فوری (انجام بده)';
  if (important && !urgent) return '۲ • مهم و غیرفوری (برنامه‌ریزی کن)';
  if (!important && urgent) return '۳ • غیرمهم و فوری (بسپار)';
  return '۴ • غیرمهم و غیرفوری (حذف کن)';
}

/** توضیح کوتاه ربع */
export function eisenHint(important: boolean, urgent: boolean): string {
  if (important && urgent) return 'همین حالا انجامش بده';
  if (important && !urgent) return 'برای آن زمان مشخص کن';
  if (!important && urgent) return 'اگر می‌توانی به کسی بسپار';
  return 'حذفش کن یا به بک‌لاگ ببر';
}

/** رنگ ربع آیزنهاور */
export function eisenColor(important: boolean, urgent: boolean): string {
  if (important && urgent) return '#ef4444';
  if (important && !urgent) return '#3b82f6';
  if (!important && urgent) return '#f59e0b';
  return '#94a3b8';
}

/** تعیین مهم/فوری بودن تسک */
export function eisenOf(t: Task): { important: boolean; urgent: boolean } {
  return { important: t.priority === 'high', urgent: t.urgent ?? t.priority === 'high' };
}
