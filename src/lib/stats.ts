import { addDays, startOfDay, toGregorian, toJalaali, todayStart } from './jalali';
import type { Transaction } from './types';

/** بازه ماه شمسی شامل ts → {start,end} (شروع روز اول تا پایان روز آخر) */
export function jalaliMonthRange(ts: number): { start: number; end: number; jy: number; jm: number } {
  const j = toJalaali(new Date(ts));
  const start = startOfDay(toGregorian(j.jy, j.jm, 1).getTime());
  const nextM = j.jm === 12 ? 1 : j.jm + 1;
  const nextY = j.jm === 12 ? j.jy + 1 : j.jy;
  const end = startOfDay(toGregorian(nextY, nextM, 1).getTime()) - 1;
  return { start, end, jy: j.jy, jm: j.jm };
}

export function sumTx(txs: Transaction[], type?: 'income' | 'expense'): number {
  return txs.reduce((a, t) => (type && t.type !== type ? a : a + t.amount), 0);
}

export function inRange(ts: number, start: number, end: number): boolean {
  return ts >= start && ts <= end;
}

/** سری روزانه برای n روز گذشته (شامل امروز) */
export function dailySeries(n: number, txs: Transaction[], type: 'income' | 'expense'): Array<{ day: number; value: number }> {
  const today = todayStart();
  const out: Array<{ day: number; value: number }> = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const end = d + 86400000 - 1;
    const v = txs.reduce((a, t) => (t.type === type && t.date >= d && t.date <= end ? a + t.amount : a), 0);
    out.push({ day: d, value: v });
  }
  return out;
}

export function groupByCategory(txs: Transaction[]): Array<{ category: string; value: number; count: number }> {
  const m = new Map<string, { value: number; count: number }>();
  for (const t of txs) {
    const e = m.get(t.category) ?? { value: 0, count: 0 };
    e.value += t.amount;
    e.count += 1;
    m.set(t.category, e);
  }
  return [...m.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.value - a.value);
}

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

export function taskProgress(sub: Array<{ done: boolean }>): number {
  if (sub.length === 0) return 0;
  return Math.round((sub.filter((s) => s.done).length / sub.length) * 100);
}

export function exportRowsCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return '';
  const head = Object.keys(rows[0]);
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [head.map(esc).join(',')];
  for (const r of rows) lines.push(head.map((h) => esc(r[h])).join(','));
  return '﻿' + lines.join('\n');
}

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
