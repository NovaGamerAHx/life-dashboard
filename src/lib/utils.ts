import { toFa } from './jalali';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        resolve(JSON.parse(String(r.result)));
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(new Error('خطا در خواندن فایل'));
    r.readAsText(file);
  });
}

/** تولید اعداد شبه‌تصادفی پایدار برای داده نمایشی */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** کوتاه‌سازی اعداد بزرگ برای نمودارها با ارقام فارسی: «۱۲٫۵ هزار» */
export function compactFa(v: number): string {
  const fa = (n: number) => toFa(n);
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    return `${fa(Number.isInteger(m) ? m : Number(m.toFixed(1)))} م`;
  }
  if (v >= 1_000) {
    const k = v / 1_000;
    return `${fa(Number.isInteger(k) ? k : Number(k.toFixed(1)))} هـ`;
  }
  return fa(v);
}
