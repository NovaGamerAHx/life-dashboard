export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

const FA_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '٬': '', '،': '', ',': '', ' ': '', ' ': '',
};

/** متن مبلغ (با ارقام فارسی/عربی و جداکننده) را به عدد صحیح تومان تبدیل می‌کند */
export function parseAmount(raw: string): number {
  if (!raw) return 0;
  let s = String(raw);
  for (const [fa, en] of Object.entries(FA_MAP)) s = s.split(fa).join(en);
  s = s.replace(/[^0-9]/g, '');
  if (!s) return 0;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : 0;
}

export function formatMoney(amount: number, unit: 'toman' | 'heazar' = 'toman'): string {
  const v = unit === 'heazar' ? Math.round(amount / 1000) : Math.round(amount);
  return new Intl.NumberFormat('fa-IR').format(v);
}

export function moneyUnitLabel(unit: 'toman' | 'heazar'): string {
  return unit === 'heazar' ? 'هزار تومان' : 'تومان';
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
