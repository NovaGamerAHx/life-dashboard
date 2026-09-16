import { addDays, startOfDay, toGregorian, todayStart } from './jalali';
import { mulberry32 } from './utils';
import {
  AppState, CalEvent, DEFAULT_EXPENSE_CATS, DEFAULT_INCOME_CATS, DEFAULT_TASK_CATS,
  Habit, Note, Task, Transaction,
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

export function seedState(): AppState {
  const now = Date.now();
  const rnd = mulberry32(20260909);

  // ── تراکنش‌ها: ۶۰ روز گذشته ─────────────────────────────
  const txs: Transaction[] = [];
  const expPool: Array<[string, number, number]> = [
    ['خوراک', 80000, 450000], ['حمل‌ونقل', 30000, 180000], ['قبوض', 150000, 900000],
    ['سلامت', 200000, 1500000], ['پوشاک', 400000, 2500000], ['تفریح', 150000, 800000],
    ['آموزش', 300000, 2000000], ['خانه', 250000, 1800000], ['سایر', 50000, 400000],
  ];
  const expTitles: Record<string, string[]> = {
    'خوراک': ['خرید هفتگی سوپرمارکت', 'ناهار رستوران', 'میوه و سبزیجات', 'کافه با دوستان', 'سفارش آنلاین غذا'],
    'حمل‌ونقل': ['شارژ کارت مترو', 'اسنپ تا محل کار', 'بنزین', 'پارکینگ'],
    'قبوض': ['قبض برق', 'اینترنت خانگی', 'قبض آب', 'شارژ همراه'],
    'سلامت': ['ویزیت پزشک', 'داروخانه', 'باشگاه ورزشی', 'آزمایش خون'],
    'پوشاک': ['کتونی ورزشی', 'پیراهن', 'شلوار جین'],
    'تفریح': ['سینما', 'کتاب', 'سفر یک‌روزه', 'بازی'],
    'آموزش': ['دوره آنلاین زبان', 'کارگاه طراحی', 'اشتراک آموزشی'],
    'خانه': ['تعمیرات لوله‌کشی', 'خرید لوازم خانه', 'نظافت'],
    'سایر': ['هدیه تولد', 'کمک خیریه', 'متفرقه'],
  };
  for (let back = 58; back >= 0; back--) {
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const [cat, lo, hi] = expPool[Math.floor(rnd() * expPool.length)];
      const titles = expTitles[cat];
      const amt = Math.round((lo + rnd() * (hi - lo)) / 10000) * 10000;
      txs.push({
        id: uid('tx'),
        type: 'expense',
        amount: amt,
        category: cat,
        title: titles[Math.floor(rnd() * titles.length)],
        date: t(-back, 8 + Math.floor(rnd() * 13), Math.floor(rnd() * 60)),
        createdAt: now - back * 86400000,
      });
    }
  }
  // درآمدها
  txs.push(
    { id: uid('tx'), type: 'income', amount: 45000000, category: 'حقوق', title: 'حقوق مرداد', date: t(-40, 9), createdAt: now },
    { id: uid('tx'), type: 'income', amount: 45000000, category: 'حقوق', title: 'حقوق شهریور', date: t(-10, 9), createdAt: now },
    { id: uid('tx'), type: 'income', amount: 8500000, category: 'فریلنسری', title: 'پروژه طراحی سایت', date: t(-22, 15), createdAt: now },
    { id: uid('tx'), type: 'income', amount: 5200000, category: 'فریلنسری', title: 'مشاوره سئو', date: t(-6, 17), createdAt: now },
    { id: uid('tx'), type: 'income', amount: 3100000, category: 'سرمایه‌گذاری', title: 'سود صندوق', date: t(-15, 11), createdAt: now },
    { id: uid('tx'), type: 'income', amount: 1200000, category: 'سایر', title: 'فروش وسایل دست‌دوم', date: t(-3, 13), createdAt: now },
  );

  // ── وظایف ───────────────────────────────────────────────
  const tasks: Task[] = [
    {
      id: uid('task'), title: 'تحویل گزارش ماهانه به مدیر', desc: 'شامل نمودار فروش، تحلیل هزینه‌ها و پیشنهادهای فصل بعد',
      status: 'doing', priority: 'high', tags: ['کاری', 'مهم'], due: d(0), backlog: false, time: '09:00', durationMin: 120,
      subtasks: [
        { id: uid('st'), title: 'جمع‌آوری داده‌های فروش', done: true },
        { id: uid('st'), title: 'طراحی نمودارها', done: true },
        { id: uid('st'), title: 'نوشتن تحلیل نهایی', done: false },
      ],
      createdAt: now - 5 * 86400000, completedAt: null,
    },
    {
      id: uid('task'), title: 'خرید هدیه تولد مادر', status: 'todo', priority: 'high',
      tags: ['شخصی'], due: d(2), backlog: false, time: '17:00', durationMin: 60, subtasks: [], createdAt: now - 2 * 86400000, completedAt: null,
    },
    {
      id: uid('task'), title: 'تمدید بیمه خودرو', status: 'todo', priority: 'high',
      tags: ['مالی', 'خودرو'], due: d(-1), backlog: false, time: '11:00', durationMin: 30, subtasks: [], createdAt: now - 9 * 86400000, completedAt: null,
    },
    {
      id: uid('task'), title: 'یادگیری فصل سوم دوره زبان', desc: 'روزی ۲۰ دقیقه تمرین شنیداری',
      status: 'doing', priority: 'medium', tags: ['آموزش'], due: d(4), backlog: false, time: '20:00', durationMin: 45,
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
      id: uid('task'), title: 'پرداخت قبض برق', status: 'done', priority: 'medium',
      tags: ['مالی'], due: d(-3), backlog: false, subtasks: [], createdAt: now - 6 * 86400000, completedAt: t(-3),
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
      tags: ['سلامت'], due: d(-2), backlog: false, time: '16:00', durationMin: 60, subtasks: [], createdAt: now - 4 * 86400000, completedAt: t(-2),
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
    { id: uid('ev'), title: 'جلسه تیم طراحی', day: dayTs(1405, 6, 18), time: '10:00', color: '#3b82f6', desc: 'اتاق کنفرانس طبقه دوم', createdAt: now },
    { id: uid('ev'), title: 'باشگاه — تمرین پا', day: dayTs(1405, 6, 18), time: '18:30', color: '#ef4444', createdAt: now },
    { id: uid('ev'), title: 'شام خانوادگی', day: dayTs(1405, 6, 20), time: '20:00', color: '#f59e0b', createdAt: now },
    { id: uid('ev'), title: 'دندان‌پزشکی (چکاپ)', day: dayTs(1405, 6, 22), time: '16:00', color: '#14b8a6', createdAt: now },
    { id: uid('ev'), title: 'ددلاین پروژه وب‌سایت', day: dayTs(1405, 6, 25), time: '12:00', color: '#ef4444', desc: 'تحویل نسخه نهایی', createdAt: now },
    { id: uid('ev'), title: 'تولد سارا', day: dayTs(1405, 6, 27), time: '', color: '#ec4899', desc: 'یادت نره هدیه بخری!', createdAt: now },
    { id: uid('ev'), title: 'سفر مشهد', day: dayTs(1405, 7, 2), time: '06:00', color: '#8b5cf6', createdAt: now },
    { id: uid('ev'), title: 'جلسه بازبینی عملکرد', day: dayTs(1405, 6, 15), time: '11:00', color: '#3b82f6', createdAt: now },
    { id: uid('ev'), title: 'کلاس یوگا', day: dayTs(1405, 6, 19), time: '07:30', color: '#10b981', createdAt: now },
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
      const d = addDays(todayStart(), -back);
      const p = h.id === 'h_water' ? 0.85 : h.id === 'h_walk' ? 0.7 : h.id === 'h_book' ? 0.6 : 0.5;
      if (hrnd() < p) habitLogs[`${h.id}:${d}`] = true;
    }
  }

  // ── یادداشت‌ها ───────────────────────────────────────────
  const notes: Note[] = [
    {
      id: uid('n'), title: 'ایده‌های سفر پاییز', pinned: true, color: '#fef3c7', tags: ['سفر', 'ایده'],
      body: 'گزینه‌ها:\n۱. مشهد — قطار، ۳ روز\n۲. اصفهان — ماشین شخصی، آخر هفته\n۳. شمال — ویلای دوست\n\nبودجه پیشنهادی: ۱۵ میلیون تومان\nحتماً قبل از مهر رزرو کنم.',
      createdAt: now - 8 * 86400000, updatedAt: now - 86400000,
    },
    {
      id: uid('n'), title: 'لیست خرید خانه', pinned: true, color: '#dcfce7', tags: ['خانه'],
      body: '• برنج ۱۰ کیلویی\n• روغن مایع\n• مایع ظرفشویی\n• لامپ LED پذیرایی\n• باتری کنترل',
      createdAt: now - 3 * 86400000, updatedAt: now - 3 * 86400000,
    },
    {
      id: uid('n'), title: 'نکات جلسه با مشتری', pinned: false, color: '#dbeafe', tags: ['کاری'],
      body: 'ـ تمرکز روی سرعت لود سایت\nـ رنگ‌بندی گرم‌تر\nـ درگاه پرداخت دوم اضافه شود\nـ جلسه بعدی: دوشنبه هفته آینده',
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

  return {
    version: 1,
    profile: { name: 'دوست عزیز' },
    settings: { theme: 'system', unit: 'toman', financeEnabled: false, weekStart: 'sat', calSystem: 'jalali' },
    taskCats: DEFAULT_TASK_CATS.map((c) => ({ ...c })),
    transactions: txs.sort((a, b) => b.date - a.date),
    tasks,
    events,
    habits,
    habitLogs,
    notes,
    reflections: [
      {
        day: addDays(todayStart(), -1),
        mood: 4,
        score: 8,
        wake: '07:00',
        sleep: '23:30',
        sport: true,
        sportType: 'پیاده‌روی',
        wentOut: true,
        outPlace: 'پارک',
        dayNote: 'روز پرکاری بود ولی خوب گذشت.',
        wins: 'گزارش ماهانه را جلو بردم و ۲۰ دقیقه مطالعه کردم.',
        improve: 'زودتر خوابیدن',
        lessons: 'شب‌ها دیر خوابیدن صبح را سخت می‌کند.',
        gratitude: 'سلامتی خانواده و یک روز آروم.',
        updatedAt: now - 86400000,
      },
    ],
    budgets: [
      { category: 'خوراک', limit: 12000000 },
      { category: 'حمل‌ونقل', limit: 3000000 },
      { category: 'تفریح', limit: 5000000 },
    ],
    expenseCats: [...DEFAULT_EXPENSE_CATS],
    incomeCats: [...DEFAULT_INCOME_CATS],
    seeded: true,
    createdAt: now,
  };
}

export function blankState(): AppState {
  const now = Date.now();
  return {
    version: 1,
    profile: { name: '' },
    settings: { theme: 'system', unit: 'toman', financeEnabled: false, weekStart: 'sat', calSystem: 'jalali' },
    taskCats: DEFAULT_TASK_CATS.map((c) => ({ ...c })),
    transactions: [],
    tasks: [],
    events: [],
    habits: [],
    habitLogs: {},
    notes: [],
    reflections: [],
    budgets: [],
    expenseCats: [...DEFAULT_EXPENSE_CATS],
    incomeCats: [...DEFAULT_INCOME_CATS],
    seeded: true,
    createdAt: now,
  };
}

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.transactions)) return null;
    return {
      ...blankState(),
      ...parsed,
      settings: { ...blankState().settings, ...(parsed.settings ?? {}) },
      profile: { ...blankState().profile, ...(parsed.profile ?? {}) },
    };
  } catch {
    return null;
  }
}
