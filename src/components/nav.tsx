import {
  CalendarDays, Inbox, LayoutDashboard, ListTodo, Repeat, Settings as SettingsIcon,
  StickyNote, SunDim, TrendingUp, Gauge,
} from 'lucide-react';
import type { ViewKey } from '../lib/types';

export interface NavItem {
  key: ViewKey;
  to: string;
  label: string;
  /** توضیح کوتاه — در منوی موبایل و راهنمای دسترس‌پذیری استفاده می‌شود */
  hint: string;
  icon: React.ReactNode;
}

/** فهرست کامل بخش‌ها — تنها منبع حقیقت منوی کناری، ناو موبایل و سربرگ */
export const NAV: NavItem[] = [
  { key: 'dashboard', to: '/', label: 'داشبورد', hint: 'نمای کلی امروز', icon: <LayoutDashboard size={19} /> },
  { key: 'today', to: '/today', label: 'روز جاری', hint: 'برنامه و بازتاب امروز', icon: <SunDim size={19} /> },
  { key: 'tasks', to: '/tasks', label: 'وظایف', hint: 'برد کانبان', icon: <ListTodo size={19} /> },
  { key: 'calendar', to: '/calendar', label: 'تقویم', hint: 'رویدادها و سررسیدها', icon: <CalendarDays size={19} /> },
  { key: 'insights', to: '/insights', label: 'تحلیل روزها', hint: 'نمره‌ها، تقویم و خروجی متنی', icon: <Gauge size={19} /> },
  { key: 'backlog', to: '/backlog', label: 'بک‌لاگ', hint: 'کارهای بدون زمان', icon: <Inbox size={19} /> },
  { key: 'habits', to: '/habits', label: 'عادت‌ها', hint: 'ساختن عادت‌های روزانه', icon: <Repeat size={19} /> },
  { key: 'notes', to: '/notes', label: 'یادداشت‌ها', hint: 'ایده‌ها و نکته‌ها', icon: <StickyNote size={19} /> },
  { key: 'reports', to: '/reports', label: 'گزارش‌ها', hint: 'تحلیل عملکرد', icon: <TrendingUp size={19} /> },
  { key: 'settings', to: '/settings', label: 'تنظیمات', hint: 'شخصی‌سازی و داده‌ها', icon: <SettingsIcon size={19} /> },
];

/** پنج بخش پرکاربرد برای ناو پایینی موبایل */
export const MOBILE_NAV: NavItem[] = ['dashboard', 'today', 'tasks', 'calendar', 'insights']
  .map((k) => NAV.find((n) => n.key === k))
  .filter((n): n is NavItem => !!n);

/** عنوان و زیرعنوان هر صفحه در سربرگ */
export const TITLES: Record<string, { t: string; s: string }> = {
  '/': { t: 'داشبورد', s: 'نمای یکپارچه امروز شما' },
  '/today': { t: 'روز جاری', s: 'برنامه، تایم‌لاین و بازتاب امروز' },
  '/tasks': { t: 'وظایف', s: 'سازماندهی کارها به سبک کانبان' },
  '/calendar': { t: 'تقویم شمسی', s: 'رویدادها و سررسیدها' },
  '/insights': { t: 'تحلیل روزها', s: 'نمره‌ها روی تقویم، بازه‌های هفتگی و ماهانه و خروجی متنی' },
  '/backlog': { t: 'بک‌لاگ', s: 'ایده‌ها و کارهای بدون زمان‌بندی' },
  '/habits': { t: 'عادت‌ها', s: 'ساختن تدریجی نسخه بهتر شما' },
  '/notes': { t: 'یادداشت‌ها', s: 'ایده‌ها و نکته‌های سریع' },
  '/reports': { t: 'گزارش‌ها', s: 'تحلیل بهره‌وری، عادت‌ها، حال و نمره روزها' },
  '/settings': { t: 'تنظیمات', s: 'شخصی‌سازی و مدیریت داده' },
};
