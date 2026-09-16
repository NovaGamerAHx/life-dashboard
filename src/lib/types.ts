export type ViewKey =
  | 'dashboard'
  | 'today'
  | 'backlog'
  | 'finance'
  | 'tasks'
  | 'calendar'
  | 'habits'
  | 'notes'
  | 'reports'
  | 'settings';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number; // تومان، عدد صحیح
  category: string;
  title: string;
  note?: string;
  date: number; // timestamp
  createdAt: number;
}

export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  desc?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  due: number | null; // startOfDay timestamp
  /** ساعت شروع «HH:MM» برای تسک‌های زمان‌دار (تایم‌لاین روز) */
  time?: string;
  /** مدت دقیقه‌ای (پیش‌فرض ۶۰) برای تایم‌لاین */
  durationMin?: number;
  /** تسک بک‌لاگ (بدون روز مشخص) */
  backlog?: boolean;
  /** ماتریس آیزنهاور: فوری بودن (مهم بودن از priority گرفته می‌شود) */
  urgent?: boolean;
  /** ددلاین (startOfDay، اختیاری) */
  deadline?: number | null;
  /** زمان واقعی صرف‌شده (دقیقه، اختیاری) */
  actualMin?: number;
  /** یادداشت/نتیجه تسک (اختیاری) */
  result?: string;
  subtasks: Subtask[];
  createdAt: number;
  completedAt: number | null;
}

export interface CalEvent {
  id: string;
  title: string;
  day: number; // startOfDay timestamp
  time: string; // "HH:MM" یا ''
  color: string;
  desc?: string;
  createdAt: number;
}

export interface Habit {
  id: string;
  title: string;
  color: string;
  targetPerWeek: number;
  /** غیرفعال (بایگانی) — در ردیاب روزانه نمایش داده نمی‌شود */
  archived?: boolean;
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  color: string;
  pinned: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Budget {
  category: string;
  limit: number; // تومان در ماه جاری شمسی
}

/** بازتاب پایان روز */
export interface DayReflection {
  day: number; // startOfDay timestamp
  mood: 1 | 2 | 3 | 4 | 5;
  /** نمره روز از ۰ تا ۱۰ (null = ثبت نشده) */
  score?: number | null;
  /** اطلاعات پایه روز */
  wake?: string; // «HH:MM»
  sleep?: string; // «HH:MM»
  sport?: boolean;
  sportType?: string;
  wentOut?: boolean;
  outPlace?: string;
  dayNote?: string;
  wins: string;
  /** ۱ مورد قابل بهبود */
  improve?: string;
  lessons: string;
  gratitude: string;
  updatedAt: number;
}

/** دسته‌بندی وظیفه (قابل ویرایش در تنظیمات) */
export interface TaskCategory {
  id: string;
  name: string;
  color: string;
  /** ایموجی/آیکون اختصاصی (اختیاری) */
  icon?: string;
}

export interface Profile {
  name: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type MoneyUnit = 'toman' | 'heazar';

export interface AppSettings {
  theme: ThemeMode;
  unit: MoneyUnit;
  /** ماژول مالی (پیش‌فرض مخفی است) */
  financeEnabled: boolean;
  /** روز آغاز هفته در تقویم */
  weekStart: 'sat' | 'mon';
  /** تقویم پیش‌فرض نمایش تاریخ */
  calSystem: 'jalali' | 'gregorian';
}

export interface AppState {
  version: 1;
  profile: Profile;
  settings: AppSettings;
  taskCats: TaskCategory[];
  transactions: Transaction[];
  tasks: Task[];
  events: CalEvent[];
  habits: Habit[];
  /** کلید: `${habitId}:${dayTs}` → انجام شده؟ */
  habitLogs: Record<string, boolean>;
  notes: Note[];
  budgets: Budget[];
  reflections: DayReflection[];
  expenseCats: string[];
  incomeCats: string[];
  seeded: boolean;
  createdAt: number;
}

// ── ثابت‌ها ─────────────────────────────────────────────────
export const DEFAULT_EXPENSE_CATS = [
  'خوراک', 'حمل‌ونقل', 'قبوض', 'سلامت', 'پوشاک', 'تفریح', 'آموزش', 'خانه', 'سایر',
];
export const DEFAULT_INCOME_CATS = ['حقوق', 'فریلنسری', 'سرمایه‌گذاری', 'سایر'];

export const CAT_COLORS: Record<string, string> = {
  'خوراک': '#f59e0b',
  'حمل‌ونقل': '#3b82f6',
  'قبوض': '#8b5cf6',
  'سلامت': '#ef4444',
  'پوشاک': '#ec4899',
  'تفریح': '#14b8a6',
  'آموزش': '#6366f1',
  'خانه': '#f97316',
  'حقوق': '#10b981',
  'فریلنسری': '#0ea5e9',
  'سرمایه‌گذاری': '#a855f7',
  'سایر': '#64748b',
};

export const EVENT_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
export const NOTE_COLORS = ['#fef3c7', '#dcfce7', '#dbeafe', '#fae8ff', '#ffe4e6', '#ffedd5'];
export const HABIT_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];
export const TASK_CAT_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#64748b'];

export const DEFAULT_TASK_CATS: TaskCategory[] = [
  { id: 'tc_work', name: 'کاری', color: '#3b82f6' },
  { id: 'tc_personal', name: 'شخصی', color: '#10b981' },
  { id: 'tc_home', name: 'خانه', color: '#f59e0b' },
  { id: 'tc_health', name: 'سلامت', color: '#ef4444' },
  { id: 'tc_learn', name: 'آموزش', color: '#8b5cf6' },
];

export const STATUS_META: Record<TaskStatus, { label: string }> = {
  todo: { label: 'برای انجام' },
  doing: { label: 'در حال انجام' },
  done: { label: 'انجام‌شده' },
};

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  high: { label: 'مهم', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
  medium: { label: 'متوسط', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  low: { label: 'عادی', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' },
};
