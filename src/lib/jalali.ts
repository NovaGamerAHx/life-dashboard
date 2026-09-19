// ─────────────────────────────────────────────────────────────
// تقویم جلالی دقیق — پیاده‌سازی استاندارد الگوریتم jalaali-js
// (بدون وابستگی خارجی، بدون باگ سال کبیسه و طول ماه‌ها)
// ─────────────────────────────────────────────────────────────

function div(a: number, b: number): number {
  // تقسیم صحیح به سبک C (برش به سمت صفر) — دقیقاً مثل jalaali-js؛
  // استفاده از Math.floor برای آرگومان‌های منفی (مثل div(gm-8,6) در ژانویه/فوریه
  // یا div(8-gm,6) در d2g) یک سال خطا در تبدیل ایجاد می‌کرد.
  return Math.trunc(a / b);
}
function mod(a: number, b: number): number {
  return a - Math.trunc(a / b) * b;
}

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
  2192, 2262, 2324, 2394, 2456, 3178,
];

export interface JDate {
  jy: number;
  jm: number;
  jd: number;
}
export interface GDate {
  gy: number;
  gm: number;
  gd: number;
}

export function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jm = 0;
  let jump = 0;
  let leap = 0;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  let n = 0;
  let i = 0;

  if (jy < jp || jy >= BREAKS[bl - 1])
    throw new Error('سال جلالی نامعتبر: ' + jy);

  for (i = 1; i < bl; i += 1) {
    jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;

  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const marchFinal = 20 + leapJ - leapG;

  let nn = n;
  if (jump - n < 6) nn = n - jump + div(jump + 4, 33) * 33;
  leap = mod(mod(nn + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  void march;
  return { leap, gy, march: marchFinal };
}

export function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

export function d2g(jdn: number): GDate {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

export function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return (
    g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
  );
}

export function d2j(jdn: number): JDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let jd: number;
  let jm: number;
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    } else {
      k -= 186;
    }
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

export function isLeapJalaali(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

export function jalaaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaali(jy) ? 30 : 29;
}

export function toJalaali(d: Date): JDate {
  return d2j(g2d(d.getFullYear(), d.getMonth() + 1, d.getDate()));
}

export function toGregorian(jy: number, jm: number, jd: number): Date {
  const g = d2g(j2d(jy, jm, jd));
  return new Date(g.gy, g.gm - 1, g.gd, 0, 0, 0, 0);
}

// ── نام‌ها ──────────────────────────────────────────────────
export const J_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];
/** شنبه تا جمعه */
export const J_WEEKDAYS = [
  'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه',
];
export const J_WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

// ── ابزار تاریخ (timestamp محلی) ────────────────────────────
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime();
}

/** 0=شنبه … 6=جمعه */
export function persianWeekday(ts: number): number {
  return (new Date(ts).getDay() + 1) % 7;
}

export function weekdayName(ts: number): string {
  return J_WEEKDAYS[persianWeekday(ts)];
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

export function diffDays(a: number, b: number): number {
  return Math.round((startOfDay(a) - startOfDay(b)) / 86400000);
}

export function todayStart(): number {
  return startOfDay(Date.now());
}

export function monthStart(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function addMonthsJalali(jy: number, jm: number, delta: number): { jy: number; jm: number } {
  const total = (jy * 12 + (jm - 1)) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return { jy: ny, jm: nm };
}

// ── شبکه ماهانه تقویم ───────────────────────────────────────
export interface CalCell {
  ts: number;
  jy: number;
  jm: number;
  jd: number;
  inMonth: boolean;
  isToday: boolean;
}

export function getMonthGrid(jy: number, jm: number, weekStart: 'sat' | 'mon' = 'sat'): CalCell[] {
  const firstG = toGregorian(jy, jm, 1);
  // JS: 0=یکشنبه … 6=شنبه
  // شنبه‌آغاز: شنبه ستون ۰ → (getDay+1)%7 ؛ دوشنبه‌آغاز: دوشنبه ستون ۰ → (getDay+6)%7
  const offset = weekStart === 'mon' ? (firstG.getDay() + 6) % 7 : (firstG.getDay() + 1) % 7;
  const daysInMonth = jalaaliMonthLength(jy, jm);
  const today = todayStart();
  const cells: CalCell[] = [];
  for (let i = 0; i < 42; i++) {
    const dayNum = i - offset + 1;
    let cjy = jy, cjm = jm, cjd = dayNum;
    if (dayNum < 1) {
      const p = addMonthsJalali(jy, jm, -1);
      cjy = p.jy; cjm = p.jm;
      cjd = jalaaliMonthLength(cjy, cjm) + dayNum;
    } else if (dayNum > daysInMonth) {
      const p = addMonthsJalali(jy, jm, 1);
      cjy = p.jy; cjm = p.jm;
      cjd = dayNum - daysInMonth;
    }
    const ts = toGregorian(cjy, cjm, cjd).getTime();
    cells.push({
      ts,
      jy: cjy, jm: cjm, jd: cjd,
      inMonth: cjd === dayNum && dayNum >= 1 && dayNum <= daysInMonth,
      isToday: ts === today,
    });
  }
  return cells;
}

// ── قالب‌بندی ───────────────────────────────────────────────
const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
export function toFa(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function formatJalali(ts: number, opts?: { weekday?: boolean; year?: boolean }): string {
  const j = toJalaali(new Date(ts));
  const parts: string[] = [];
  if (opts?.weekday) parts.push(weekdayName(ts));
  parts.push(toFa(j.jd));
  parts.push(J_MONTHS[j.jm - 1]);
  if (opts?.year !== false) parts.push(toFa(j.jy));
  return parts.join(' ');
}

export function formatJalaliShort(ts: number): string {
  const j = toJalaali(new Date(ts));
  return `${toFa(j.jy)}/${toFa(String(j.jm).padStart(2, '0'))}/${toFa(String(j.jd).padStart(2, '0'))}`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return toFa(`${h}:${m}`);
}

/** تاریخ میلادی کامل به فارسی: «9 September 2026» */
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export function formatGregorian(ts: number): string {
  const d = new Date(ts);
  // ارقام فارسی، هم‌سبک با بقیه برنامه
  return toFa(`${d.getDate()} ${EN_MONTHS[d.getMonth()]} ${d.getFullYear()}`);
}

/** جدول تبدیل ارقام و جداکننده‌های فارسی/عربی به معادل لاتین */
const DIGIT_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '٫': '.', '٬': '', '،': ',', '：': ':',
};

/** ارقام و جداکننده‌های فارسی/عربی را به لاتین تبدیل می‌کند */
export function normalizeDigits(input: string): string {
  let out = '';
  for (const ch of String(input ?? '')) out += DIGIT_MAP[ch] ?? ch;
  return out;
}

/**
 * هر ورودی ساعت را به شکل استاندارد ۲۴ساعته «HH:MM» درمی‌آورد.
 * ورودی‌های پذیرفته‌شده: «۹:۳۰»، «09:30»، «9.30»، «23:59» و حداکثر یک رقم اعشار دقیقه.
 * نامعتبر → null. هیچ‌جای برنامه ساعت ۱۲ساعته (AM/PM) پذیرفته یا نمایش داده نمی‌شود.
 */
export function normalizeClockText(raw: string): string | null {
  const s = normalizeDigits(String(raw ?? ''))
    .replace(/[\u200c\u200f\u200e]/g, '')
    .replace(/\s+/g, '')
    .replace(/[.:]/g, ':')
    .replace(/h/gi, ':');
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mi)) return null;
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}

/** «HH:MM» (با ارقام فارسی یا لاتین) → دقیقه از نیمه‌شب؛ نامعتبر → null */
export function parseClock(t: string): number | null {
  const norm = normalizeClockText(t);
  if (!norm) return null;
  const [h, m] = norm.split(':').map(Number);
  return h * 60 + m;
}

/** «HH:MM» با ارقام فارسی و صفر پیشرو */
export function formatClock(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return toFa(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
}

/** همان formatClock ولی با ارقام لاتین (برای نام فایل، خروجی CSV و …) */
export function formatClockLatin(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** عدد ساعت را با ارقام لاتین می‌گیرد و «HH:MM» فارسی برمی‌گرداند */
export function clockToFa(value: string): string {
  const m = parseClock(value);
  return m == null ? String(value ?? '') : formatClock(m);
}

/** نمایش نمره با یک رقم اعشار و ارقام فارسی: ۷٫۵ / ۸ */
/** جداکننده اعشار فارسی «٫» — همه‌ی نمایش‌های اعشاری برنامه از این تابع می‌گذرند */
export function faDecimalSep(digits: string): string {
  return toFa(digits).replace('.', '\u066B');
}

/** نمایش نمره با یک رقم اعشار (مثل «۷٫۵») — نمره‌ندارد → «ثبت نشده» */
export function formatScore(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return 'ثبت نشده';
  const rounded = Math.round(n * 10) / 10;
  const txt = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return faDecimalSep(txt);
}

/** نمایش عدد اعشاری (مثل میانگین) با یک رقم اعشار و ارقام فارسی */
export function formatDecimal(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return faDecimalSep(n.toFixed(digits));
}

// ── بازه‌های هفتگی و ماهانه (شمسی) ──────────────────────────
/** 0 = شنبه … 6 = جمعه */
export function startOfWeek(ts: number, weekStart: 'sat' | 'mon' = 'sat'): number {
  const wd = persianWeekday(ts);
  const offset = weekStart === 'sat' ? wd : (wd + 5) % 7; // دوشنبه‌آغاز یعنی شنبه انتهای هفته قبل
  return addDays(startOfDay(ts), -offset);
}

/** بازه هفته (شروع و پایان، شامل روز پایانی) */
export function weekRange(ts: number, weekStart: 'sat' | 'mon' = 'sat'): { start: number; end: number } {
  const start = startOfWeek(ts, weekStart);
  return { start, end: addDays(start, 6) };
}

/** بازه ماه شمسی شامل ts → {start, end} (ابتدای روز اول تا انتهای روز آخر) */
export function jalaliMonthRange(ts: number): { start: number; end: number; jy: number; jm: number } {
  const j = toJalaali(new Date(ts));
  const start = startOfDay(toGregorian(j.jy, j.jm, 1).getTime());
  const nextM = j.jm === 12 ? 1 : j.jm + 1;
  const nextY = j.jm === 12 ? j.jy + 1 : j.jy;
  const end = startOfDay(toGregorian(nextY, nextM, 1).getTime()) - 1;
  return { start, end, jy: j.jy, jm: j.jm };
}

/** برچسب کوتاه یک بازه: «۱۴۰۵/۰۶/۲۷ تا ۱۴۰۵/۰۷/۰۲» */
export function rangeLabel(start: number, end: number): string {
  return `${formatJalaliShort(start)} تا ${formatJalaliShort(end)}`;
}

/** جمع تقویمی بازه‌های روزانه بین دو روز (شامل هر دو سر) */
export function eachDay(start: number, end: number, max = 4000): number[] {
  const out: number[] = [];
  let cur = startOfDay(start);
  const last = startOfDay(end);
  while (cur <= last && out.length < max) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function relativeDayLabel(ts: number): string | null {
  const d = diffDays(ts, Date.now());
  if (d === 0) return 'امروز';
  if (d === 1) return 'فردا';
  if (d === -1) return 'دیروز';
  if (d === 2) return 'پس‌فردا';
  if (d === -2) return 'پریروز';
  if (d > 2 && d < 7) return `${toFa(d)} روز بعد`;
  if (d < -2 && d > -7) return `${toFa(Math.abs(d))} روز پیش`;
  return null;
}

export function smartDate(ts: number): string {
  const rel = relativeDayLabel(ts);
  if (rel) return rel;
  return formatJalali(ts, { weekday: true });
}

export function greetingByHour(h: number): string {
  if (h >= 5 && h < 12) return 'صبح بخیر';
  if (h >= 12 && h < 17) return 'ظهر بخیر';
  if (h >= 17 && h < 20) return 'عصر بخیر';
  return 'شب بخیر';
}

export const nfFa = new Intl.NumberFormat('fa-IR');
