import { addDays, startOfDay, toGregorian, todayStart } from './jalali';
import { mulberry32, uid } from './utils';
import {
  type AppState, type CalEvent, type DayReflection, DEFAULT_TASK_CATS,
  type Habit, type Note, type Task,
} from './types';

export const STORAGE_KEY = 'hamrah_state_v1';

/** یک ساعت مشخص در روزِ offsetشده نسبت به امروز */
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

/** متن‌های نمونه برای بازتاب‌های نمایشی */
const DEMO_NOTES: Array<{ note: string; wins: string; improve: string; lessons: string; gratitude: string }> = [
  {
    note: 'روز پرکاری بود؛ صبح زود شروع کردم و کارهای عقب‌افتاده را جبران کردم.',
    wins: 'گزارش را قبل از ظهر تمام کردم و یک ساعت هم کتاب خواندم.',
    improve: 'بین کارها استراحت کوتاه بگذارم.',
    lessons: 'شروع زودهنگام صبح، کل روز را سبک‌تر می‌کند.',
    gratitude: 'سلامتی و یک فنجان قهوه در سکوت صبح.',
  },
  {
    note: 'روز آرام و متعادلی بود؛ کمی پیاده‌روی و مرتب کردن خانه.',
    wins: 'با خانواده شام خوردم و زود خوابیدم.',
    improve: 'گوشی را شب زودتر کنار بگذارم.',
    lessons: 'مرتب بودن محیط، تمرکز را بالا می‌برد.',
    gratitude: 'آرامش خانه و هوای خنک شب.',
  },
  {
    note: 'تمرکز امروز پراکنده بود؛ جلسه‌ها وقت زیادی گرفتند.',
    wins: 'مهم‌ترین تسک روز را انجام دادم.',
    improve: 'فردا جلسه‌ها را کوتاه‌تر کنم.',
    lessons: 'بدون فهرست اولویت، روز گم می‌شود.',
    gratitude: 'همکاری هم‌تیمی‌ها در شلوغی امروز.',
  },
];

function demoScores(rnd: () => number, count: number): DayReflection[] {
  const out: DayReflection[] = [];
  for (let back = 1; back <= count; back++) {
    const day = d(-back);
    const skip = rnd() < 0.18; // بعضی روزها نمره ثبت نشده‌اند (برای نمایش حالت «ثبت نشده»)
    const mood = (1 + Math.floor(rnd() * 5)) as DayReflection['mood'];
    const round = (v: number) => Math.round(v * 10) / 10;
    const score = skip ? null : round(4.5 + rnd() * 5.4);
    const text = DEMO_NOTES[Math.floor(rnd() * DEMO_NOTES.length)];
    const sport = rnd() < 0.55;
    const wentOut = rnd() < 0.45;
    out.push({
      day,
      mood,
      score,
      wake: `0${5 + Math.floor(rnd() * 4)}:${['00', '15', '30', '45'][Math.floor(rnd() * 4)]}`,
      sleep: `${22 + Math.floor(rnd() * 2)}:${['00', '20', '40'][Math.floor(rnd() * 3)]}`,
      sport: sport ? true : undefined,
      sportType: sport ? ['پیاده‌روی', 'باشگاه', 'دوچرخه', 'شنا'][Math.floor(rnd() * 4)] : undefined,
      wentOut: wentOut ? true : undefined,
      outPlace: wentOut ? ['پارک', 'خرید', 'کافه', 'خانه دوست', 'کتابخانه'][Math.floor(rnd() * 5)] : undefined,
      dayNote: rnd() < 0.25 ? undefined : text.note,
      wins: rnd() < 0.15 ? '' : text.wins,
      improve: rnd() < 0.25 ? undefined : text.improve,
      lessons: rnd() < 0.2 ? '' : text.lessons,
      gratitude: rnd() < 0.25 ? '' : text.gratitude,
      updatedAt: nowMinus(back),
    });
  }
  return out;
}

function nowMinus(days: number): number {
  return Date.now() - days * 86400000;
}

export function seedState(): AppState {
  const now = Date.now();
  const rnd = mulberry32(20260909);

  // ── وظایف ───────────────────────────────────────────────
  const tasks: Task[] = [
    {
      id: uid('task'), title: 'تحویل گزارش ماهانه به مدیر', desc: 'شامل نمودارها، جمع‌بندی نکات و پیشنهادهای ماه بعد',
      status: 'doing', priority: 'high', tags: ['کاری', 'مهم'], due: d(0), backlog: false, time: '09:00', durationMin: 120,
      subtasks: [
        { id: uid('st'), title: 'جمع‌آوری داده‌های ماه', done: true },
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
      tags: ['شخصی', 'خودرو'], due: d(-1), backlog: false, time: '11:00', durationMin: 30, subtasks: [], createdAt: now - 9 * 86400000, completedAt: null,
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
      id: uid('task'), title: 'پاک‌سازی ایمیل‌های کاری', status: 'done', priority: 'medium',
      tags: ['کاری'], due: d(-3), backlog: false, subtasks: [], createdAt: now - 6 * 86400000, completedAt: t(-3),
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

  // ── رویدادهای تقویم ─────────────────────────────────────
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
    { id: uid('ev'), title: 'مطالعه در کتابخانه', day: addDays(todayStart(), -4), time: '17:00', color: '#0ea5e9', createdAt: now },
    { id: uid('ev'), title: 'پیاده‌روی صبحگاهی', day: addDays(todayStart(), -2), time: '07:00', color: '#10b981', createdAt: now },
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
      body: 'ـ تمرکز روی سرعت لود سایت\nـ رنگ‌بندی گرم‌تر\nـ فرم تماس ساده‌تر شود\nـ جلسه بعدی: دوشنبه هفته آینده',
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

  // ── بازتاب‌های پایان روز (نمونه با نمره اعشاری) ─────────
  const reflections = demoScores(rnd, 34);

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

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const ver = (parsed as { version?: unknown })?.version;
    if (!parsed || (ver !== 1 && ver !== 2)) return null;
    const base = blankState();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      profile: { ...base.profile, ...(parsed.profile ?? {}) },
    };
  } catch {
    return null;
  }
}
