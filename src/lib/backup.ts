import type { AppState } from './types';
import { toJalaali } from './jalali';

export interface AutoBackupMeta {
  ts: number;
  size: number;
  tx: number;
  tasks: number;
  events: number;
  habits: number;
  notes: number;
  reflections: number;
}

const AUTO_KEY = 'hamrah_auto_bak_v1';
/** حداکثر ۳ اسنپ‌شات خودکار نگه می‌داریم تا سقف حافظه مرورگر پر نشود */
const AUTO_MAX = 3;
/** حداقل فاصله بین دو اسنپ‌شات خودکار: ۶ ساعت */
const AUTO_MIN_GAP_MS = 6 * 3600 * 1000;

interface AutoEntry {
  ts: number;
  data: AppState;
}

function readEntries(): AutoEntry[] {
  try {
    const raw = localStorage.getItem(AUTO_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as AutoEntry[];
    if (!Array.isArray(arr)) return [];
    return arr.filter((e) => e && typeof e.ts === 'number' && e.data && (e.data as AppState).version === 1);
  } catch {
    return [];
  }
}

function writeEntries(list: AutoEntry[]): boolean {
  try {
    localStorage.setItem(AUTO_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function toMeta(e: AutoEntry): AutoBackupMeta {
  const d = e.data;
  return {
    ts: e.ts,
    size: JSON.stringify(d).length,
    tx: d.transactions.length,
    tasks: d.tasks.length,
    events: d.events.length,
    habits: d.habits.length,
    notes: d.notes.length,
    reflections: (d.reflections ?? []).length,
  };
}

export function listAutoBackups(): AutoBackupMeta[] {
  return readEntries()
    .sort((a, b) => b.ts - a.ts)
    .map(toMeta);
}

/**
 * اگر از آخرین اسنپ‌شات بیش از ۶ ساعت گذشته باشد، یک اسنپ‌شات جدید می‌گیرد.
 * در صورت کمبود حافظه، قدیمی‌ترین را حذف و یک بار دیگر تلاش می‌کند.
 * همیشه لیست متاها (جدید به قدیم) را برمی‌گرداند.
 */
export function maybeAutoSnapshot(state: AppState): AutoBackupMeta[] {
  const list = readEntries().sort((a, b) => a.ts - b.ts);
  const desc = () => [...list].reverse().map(toMeta);
  const hasData =
    state.transactions.length +
      state.tasks.length +
      state.events.length +
      state.habits.length +
      state.notes.length >
    0;
  if (!hasData) return desc();
  const now = Date.now();
  const last = list[list.length - 1];
  if (last && now - last.ts < AUTO_MIN_GAP_MS) return desc();
  const next = [...list, { ts: now, data: state }].slice(-AUTO_MAX);
  if (!writeEntries(next)) {
    const trimmed = next.slice(1);
    if (trimmed.length === 0 || !writeEntries(trimmed)) return desc();
    return [...trimmed].reverse().map(toMeta);
  }
  return [...next].reverse().map(toMeta);
}

/** خواندن خام یک اسنپ‌شات (اعتبارسنجی با sanitize در store انجام می‌شود) */
export function getAutoBackup(ts: number): unknown {
  const e = readEntries().find((x) => x.ts === ts);
  return e ? e.data : null;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n.toLocaleString('fa-IR')} بایت`;
  if (n < 1024 * 1024) return `${(n / 1024).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} کیلوبایت`;
  return `${(n / 1024 / 1024).toLocaleString('fa-IR', { maximumFractionDigits: 2 })} مگابایت`;
}

/** برچسب تاریخ شمسی با ارقام لاتین، مناسب نام فایل: 1405-06-27 */
export function jalaliStamp(ts = Date.now()): string {
  const j = toJalaali(new Date(ts));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${j.jy}-${p(j.jm)}-${p(j.jd)}`;
}

export function backupFilename(): string {
  return `life-desk-backup-${jalaliStamp()}.json`;
}
