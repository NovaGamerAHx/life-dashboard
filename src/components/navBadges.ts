import type { Task } from '../lib/types';
import { diffDays, formatJalali, relativeDayLabel } from '../lib/jalali';

export function smartDue(due: number | null): string {
  if (!due) return 'بدون سررسید';
  const rel = relativeDayLabel(due);
  if (rel) return rel;
  // خارج از بازه نسبی → تاریخ کامل شمسی
  return formatJalali(due);
}

export function dueTone(due: number | null, status: Task['status']): 'red' | 'amber' | 'slate' | 'green' {
  if (!due) return 'slate';
  if (status === 'done') return 'green';
  const d = diffDays(due, Date.now());
  if (d < 0) return 'red';
  if (d <= 2) return 'amber';
  return 'slate';
}

export function isOverdue(t: Task): boolean {
  return t.status !== 'done' && t.due != null && diffDays(t.due, Date.now()) < 0;
}
