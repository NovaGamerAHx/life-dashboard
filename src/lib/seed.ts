import { addDays, startOfDay, toGregorian, todayStart } from './jalali';
import { mulberry32 } from './utils';
import {
  AppState, CalEvent, DEFAULT_TASK_CATS, DayReflection, Habit, Note, Task,
} from './types';
import { uid } from './utils';

export const STORAGE_KEY = 'hamrah_state_v1';

function t(daysOffset: number, h = 12, m = 0): number {
  const base = addDays(todayStart(), daysOffset);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function dayTs(jy: number, jm: number, jd: number): number {
  return startOfDay(toGregorian(jy, jm, jd).getTime());
}

/** سررسید روزانه (شروع روز، بدون ساعت) */
function d(daysOffset: number): number {
  return addDays(todayStart(), daysOffset);
}

/** ساعت ۲۴ساعته با ارقام لاتین — پایه ذخیره‌سازی همه ساعت‌ها */
function clk(h: number, m = 0): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function seedState(): AppState {
  const now = Date.now();

  // ── وظایف ───────────────────────────────────────────────
  const tasks: Task[] = [
    {
      id: uid('task'), title: 'تحویل گزارش ماهانه به مدیر', desc: 'شامل نمودار پیشرفت، جمع‌بندی کارها و پیشنهادهای ماه بعد',
      status: 'doing', priority: 'high', tags: ['کاری', 'مهم'], due: d(0), backlog: false, time: clk(9), durationMin: 120,
      subtasks: [
        { id: uid('st'), title: 'جمع‌آوری داده‌های پیشرفت', done: true },
        { id: uid('st'), title: 'طراحی نمودارها', done: true },
        { id: uid('st'), title: 'نوشتن جمع‌بندی نهایی', done: false },
      ],
      createdAt: now - 5 * 86400000, completedAt: null,
    },
    {
      id: uid('task'), title: 'خرید هدیه تولد مادر', status: 'todo', priority: 'high',
      tags: ['شخصی'], due: d(2), backlog: false, time: clk(17), durationMin: 60, subtasks: [], createdAt: now - 2 * 86400000, completedAt: null,
    },
    {
      id: uid('task'), title: 'تمدید بیمه خودرو', status: 'todo', priority: 'high',
      tags: ['خودرو'], due: d(-1), backlog: false, time: clk(11), durationMin: 30, subtasks: [], createdAt: now - 9 * 86400000, completedAt: null,
    },
    {
      id: uid('task'), title: 'یادگیری فصل سوم دوره زبان', desc: 'روزی ۲۰ دقیقه تمرین شنیداری',
      status: 'doing', priority: 'medium', tags: ['آموزش'], due: d(4), backlog: false, time: clk(20), durationMin: 45,
      subtasks: [
        { id: uid('st'), title: 'تماشای ۳ درس ویدیویی', done: true },
        { id: uid('st'), title: 'تمرین لغات در اپ', done: false },
        { id: uid('st'), title: 'آزمون پایان فصل', done: false },
      ],
      createdAt: now - 7 * 86400000, completedAt: null,
    },
    {
      id: uid('task'), title: 'مرتب‌کردن کشوهای اتاق کار', status: 'todo', priority: 'low',
      tags: ['خانه'], due: d(6), backlog: false, subtasks: [], createdAt: now - 86400000, completedAt: null,
    },
    {
      id: uid('task'), title: 'رزرو بلیت سفر مشهد', status: 'todo', priority: 'medium',
      tags: ['سفر'], due: d(9), backlog: false, subtasks: [
        { id: uid('st'), title: 'مقایسه قیمت قطار و هواپیما', done: false },
        { id: uid('st'), title: 'هماهنگی با خانواده', done: false },
      ], createdAt: now - 86400000, completedAt: null,
    },
    {
      id: uid('task'), title: 'مرور هفتگی اهداف', status: 'done', priority: 'medium',
      tags: ['شخصی'], due: d(-3), backlog: false, subtasks: [], createdAt: now - 6 * 86400000, completedAt: t(-3),
    },
    {
      id: uid('task'), title: 'بازبینی رزومه و لینکدین', status: 'done', priority: 'low',
      tags: ['شغلی'], due: d(-6), backlog: false, subtasks: [
        { id: uid('st'), title: 'به‌روزرسانی سوابق', done: true },
        { id: uid('st'), title: 'گرفتن عکس حرفه‌ای', done: true },
      ], createdAt: now - 10 * 86400000, completedAt: t(-5),
    },
    {
      id: uid('task'), title: 'معاینه دندان‌پزشکی', status: 'done', priority: 'medium',
      tags: ['سلامت'], due: d(-2), backlog: false, time: clk(16), durationMin: 60, subtasks: [], createdAt: now - 4 * 86400000, completedAt: t(-2),
    },
    {
      id: uid('task'), title: 'پیاده‌روی ۳۰ دقیقه‌ای', status: 'done', priority: 'low',
      tags: ['سلامت'], due: d(-1), backlog: false, time: clk(7, 30), durationMin: 30, subtasks: [], createdAt: now - 2 * 86400000, completedAt: t(-1),
    },
    // ── آیتم‌های بک‌لاگ (بدون روز مشخص) ─────────────────────
    {
      id: uid('task'), title: 'راه‌اندازی وبلاگ شخصی', desc: 'انتخاب قالب، نوشتن سه پست اول',
      status: 'todo', priority: 'medium', tags: ['شخصی'], due: null, backlog: true,
      subtasks: [
        { id: uid('st'), title: 'خرید دامنه', done: true },
        { id: uid('st'), title: 'انتخاب قالب', done: false },
      ], createdAt: now - 12 * 86400000, completedAt: null,
    },
    {
      id: uid('task'), title: 'یادگیری عکاسی موبایل', status: 'todo', priority: 'low',
      tags: ['آموزش'], due: null, backlog: true, subtasks: [], createdAt: now - 11 * 86400000, completedAt: null,
    },
    {
      id: uid('task'), title: 'تمیزکاری انباری', status: 'todo', priority: 'low',
      tags: ['خانه'], due: null, backlog: true, subtasks: [], createdAt: now - 3 * 86400000, completedAt: null,
    },
  ];

  // ── رویدادهای تقویم (شهریور ۱۴۰۵) ────────────────────────
  // ۱۸ شهریور ۱۴۰۵ = ۹ سپتامبر ۲۰۲۶
  const events: CalEvent[] = [
    { id: uid('ev'), title: 'جلسه تیم طراحی', day: dayTs(1405, 6, 18), time: clk(10), color: '#3b82f6', desc: 'اتاق کنفرانس طبقه دوم', createdAt: now },
    { id: uid('ev'), title: 'باشگاه — تمرین پا', day: dayTs(1405, 6, 18), time: clk(18, 30), color: '#ef4444', createdAt: now },
    { id: uid('ev'), title: 'شام خانوادگی', day: dayTs(1405, 6, 20), time: clk(20), color: '#f59e0b', createdAt: now },
    { id: uid('ev'), title: 'دندان‌پزشکی (چکاپ)', day: dayTs(1405, 6, 22), time: clk(16), color: '#14b8a6', createdAt: now },
    { id: uid('ev'), title: 'ددلاین پروژه وب‌سایت', day: dayTs(1405, 6, 25), time: clk(12), color: '#ef4444', desc: 'تحویل نسخه نهایی', createdAt: now },
    { id: uid('ev'), title: 'تولد سارا', day: dayTs(1405, 6, 27), time: '', color: '#ec4899', desc: 'یادت نره هدیه بخری!', createdAt: now },
    { id: uid('ev'), title: 'سفر مشهد', day: dayTs(1405, 7, 2), time: clk(6), color: '#8b5cf6', createdAt: now },
    { id: uid('ev'), title: 'جلسه بازبینی عملکرد', day: dayTs(1405, 6, 15), time: clk(11), color: '#3b82f6', createdAt: now },
    { id: uid('ev'), title: 'کلاس یوگا', day: dayTs(1405, 6, 19), time: clk(7, 30), color: '#10b981', createdAt: now },
  ];

  // ── عادت‌ها ──────────────────────────────────────────────
  const habits: Habit[] = [
    { id: 'h_water', title: 'نوشیدن ۸ لیوان آب', color: '#0ea5e9', targetPerWeek: 7, createdAt: now - 40 * 86400000 },
    { id: 'h_book', title: '۲۰ دقیقه مطالعه', color: '#8b5cf6', targetPerWeek: 5, createdAt: now - 40 * 86400000 },
    { id: 'h_walk', title: 'پیاده‌روی روزانه', color: '#10b981', targetPerWeek: 5, createdAt: now - 30 * 86400000 },
    { id: 'h_lang', title: 'تمرین زبان', color: '#f59e0b', targetPerWeek: 4, createdAt: now - 20 * 86400000 },
  ];
  const habitLogs: Record<string, boolean> = {};
  const hrnd = mulberry32(77);
  for (const h of habits) {
    for (let back = 20; back >= 0; back--) {
      const day = addDays(todayStart(), -back);
      const p = h.id === 'h_water' ? 0.85 : h.id === 'h_walk' ? 0.7 : h.id === 'h_book' ? 0.6 : 0.5;
      if (hrnd() < p) habitLogs[`${h.id}:${day}`] = true;
    }
  }

  // ── یادداشت‌ها ───────────────────────────────────────────
  const notes: Note[] = [
    {
      id: uid('n'), title: 'ایده‌های سفر پاییز', pinned: true, color: '#fef3c7', tags: ['سفر', 'ایده'],
      body: 'گزینه‌ها:\n۱. مشهد — قطار، ۳ روز\n۲. اصفهان — ماشین شخصی، آخر هفته\n۳. شمال — ویلای دوست\n\nحتماً قبل از مهر رزرو کنم.',
      createdAt: now - 8 * 86400000, updatedAt: now - 86400000,
    },
    {
      id: uid('n'), title: 'لیست خرید خانه', pinned: true, color: '#dcfce7', tags: ['خانه'],
      body: '• برنج ۱۰ کیلویی\n• روغن مایع\n• مایع ظرفشویی\n• لامپ LED پذیرایی\n• باتری کنترل',
      createdAt: now - 3 * 86400000, updatedAt: now - 3 * 86400000,
    },
    {
      id: uid('n'), title: 'نکات جلسه با مشتری', pinned: false, color: '#dbeafe', tags: ['کاری'],
      body: 'ـ تمرکز روی سرعت لود سایت\nـ رنگ‌بندی گرم‌تر\nـ صفحه تماس با ما ساده‌تر شود\nـ جلسه بعدی: دوشنبه هفته آینده',
      createdAt: now - 5 * 86400000, updatedAt: now - 2 * 86400000,
    },
    {
      id: uid('n'), title: 'کتاب‌هایی که باید بخوانم', pinned: false, color: '#fae8ff', tags: ['کتاب'],
      body: '۱. اثر مرکب — دارن هاردی\n۲. عادت‌های اتمی — جیمز کلیر (در حال خواندن)\n۳. تفکر سریع و کند — کانمن',
      createdAt: now - 15 * 86400000, updatedAt: now - 6 * 86400000,
    },
    {
      id: uid('n'), title: 'ایده محتوای اینستاگرام', pinned: false, color: '#ffe4e6', tags: ['محتوا'],
      body: 'ـ ویدیوی پشت‌صحنه پروژه\nـ آموزش ۶۰ ثانیه‌ای اکسل\nـ معرفی ابزارهای رایگان طراحی',
      createdAt: now - 86400000, updatedAt: now - 86400000,
    },
  ];

  // ── بازتاب‌ها و نمره‌های روزهای گذشته (اعشاری) ───────────
  const reflections: DayReflection[] = [];
  const rrnd = mulberry32(20260919);
  const winsPool = [
    'گزارش کاری را جلو بردم و ۲۰ دقیقه مطالعه کردم.',
    'صبح زود بیدار شدم و ورزش کردم.',
    'کارهای عقب‌افتاده را جمع کردم.',
    'یک جلسه خوب با تیم داشتم.',
    'کتاب خواندم و شب زود خوابیدم.',
  ];
  const improvePool = ['زودتر خوابیدن', 'کمتر گوشی چک کردن', 'شروع زودتر کار مهم', 'استراحت بین کارها'];
  const lessonPool = [
    'شب‌ها دیر خوابیدن صبح را سخت می‌کند.',
    'کار بزرگ را باید به قدم‌های کوچک شکست.',
    'تمرکز روی یک کار، نتیجه بهتری می‌دهد.',
    'برنامه‌ریزی شب قبل، صبح را نجات می‌دهد.',
  ];
  const gratPool = ['سلامتی خانواده و یک روز آرام.', 'دوست‌های خوب و انرژی امروز.', 'فرصت یادگیری.', 'یک روز بدون عجله.'];
  const notePool = [
    'روز پرکاری بود ولی خوب گذشت.',
    'انرژی متوسطی داشتم، تمرکز کافی نبود.',
    'روز متعادلی بود؛ هم کار کردم هم استراحت.',
    'کمی خسته بودم اما کارهای مهم انجام شد.',
  ];
  for (let back = 34; back >= 0; back--) {
    // چند روز عمداً بدون بازتاب می‌ماند تا حالت «ثبت نشده» هم دیده شود
    if (back % 9 === 4) continue;
    const day = addDays(todayStart(), -back);
    const hasFull = rrnd() > 0.35;
    const base = 5.2 + rrnd() * 4.4; // بین ۵٫۲ و ۹٫۶
    const score = Math.round(base * 10) / 10;
    const mood = Math.min(5, Math.max(1, Math.round(score / 2))) as 1 | 2 | 3 | 4 | 5;
    const sport = rrnd() > 0.45;
    const wentOut = rrnd() > 0.4;
    reflections.push({
      day,
      mood,
      score: back % 7 === 3 ? null : score, // بعضی روزها نمره ثبت نشده
      wake: clk(6 + Math.floor(rrnd() * 3), Math.floor(rrnd() * 4) * 15),
      sleep: clk(22 + Math.floor(rrnd() * 2), Math.floor(rrnd() * 4) * 15),
      sport: sport ? true : undefined,
      sportType: sport ? ['پیاده‌روی', 'باشگاه', 'دوچرخه', 'یوگا'][Math.floor(rrnd() * 4)] : undefined,
      wentOut: wentOut ? true : undefined,
      outPlace: wentOut ? ['پارک', 'خرید', 'کافه', 'خانه دوست'][Math.floor(rrnd() * 4)] : undefined,
      dayNote: hasFull ? notePool[Math.floor(rrnd() * notePool.length)] : undefined,
      wins: hasFull ? winsPool[Math.floor(rrnd() * winsPool.length)] : '',
      improve: hasFull ? improvePool[Math.floor(rrnd() * improvePool.length)] : undefined,
      lessons: hasFull ? lessonPool[Math.floor(rrnd() * lessonPool.length)] : '',
      gratitude: hasFull ? gratPool[Math.floor(rrnd() * gratPool.length)] : '',
      updatedAt: now - back * 86400000,
    });
  }

  return {
    version: 1,
    profile: { name: 'دوست عزیز' },
    settings: { theme: 'system', weekStart: 'sat', calSystem: 'jalali' },
    taskCats: DEFAULT_TASK_CATS.map((c) => ({ ...c })),
    tasks,
    events,
    habits,
    habitLogs,
    notes,
    reflections,
    seeded: true,
    createdAt: now,
  };
}

export function blankState(): AppState {
  const now = Date.now();
  return {
    version: 1,
    profile: { name: '' },
    settings: { theme: 'system', weekStart: 'sat', calSystem: 'jalali' },
    taskCats: DEFAULT_TASK_CATS.map((c) => ({ ...c })),
    tasks: [],
    events: [],
    habits: [],
    habitLogs: {},
    notes: [],
    reflections: [],
    seeded: true,
    createdAt: now,
  };
}

/** بارگذاری حالت از localStorage — نسخه‌های قدیمی‌تر هم پذیرفته و مهاجرت می‌شوند */
export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppState> & Record<string, unknown>;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.tasks)) return null;
    const base = blankState();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      profile: { ...base.profile, ...(parsed.profile ?? {}) },
      reflections: Array.isArray(parsed.reflections) ? parsed.reflections : [],
    } as AppState;
  } catch {
    return null;
  }
}
