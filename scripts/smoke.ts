/**
 * آزمون درون‌ساخت (smoke test) — بدون هیچ وابستگی اضافه اجرا می‌شود:
 *   npm run smoke
 *
 * ۱) سازگاری محیط Node با شبیه‌سازی localStorage/window
 * ۲) بررسی منطق خالص: نمره اعشاری، ساعت ۲۴ ساعته، ایمپورت داده قدیمی، خروجی متنی
 * ۳) رندر سرور (SSR) همه صفحات برای گرفتن خطاهای زمان اجرا پیش از بیلد
 */
type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];
const ok = (name: string, cond: boolean, detail?: string) => checks.push({ name, ok: cond, detail });

// ── ۱) شبیه‌سازی محیط مرورگر برای اجرا در Node ──────────────
const mem = new Map<string, string>();
const storage = {
  getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => Array.from(mem.keys())[i] ?? null,
  get length() {
    return mem.size;
  },
};
const g = globalThis as Record<string, unknown>;
g.localStorage = storage;
if (!g.window) g.window = globalThis;
(g.window as Record<string, unknown>).localStorage = storage;
for (const fn of ['addEventListener', 'removeEventListener', 'dispatchEvent']) {
  (g.window as Record<string, unknown>)[fn] = () => true;
  g[fn] = () => true;
}
(g.window as Record<string, unknown>).matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
});

async function main() {
  const React = await import('react');
  const { renderToString } = await import('react-dom/server');
  const { MemoryRouter } = await import('react-router-dom');

  const jalali = await import('../src/lib/jalali');
  const days = await import('../src/lib/days');
  const summary = await import('../src/lib/summary');
  const seed = await import('../src/lib/seed');
  const sanitize = await import('../src/lib/sanitize');
  const display = await import('../src/lib/display');
  const { AppProvider } = await import('../src/lib/store');

  // ── ۲) منطق خالص ──────────────────────────────────────────
  ok('formatScore(7.5) → ۷٫۵', jalali.formatScore(7.5) === '۷٫۵', jalali.formatScore(7.5));
  ok('formatScore(8) → ۸', jalali.formatScore(8) === '۸', jalali.formatScore(8));
  ok('parseScoreInput("۸،۵") → 8.5', jalali.parseScoreInput('۸،۵') === 8.5);
  ok('parseScoreInput("7,5") → 7.5', jalali.parseScoreInput('7,5') === 7.5);
  ok('roundScore(10.7) → 10 (سقف)', jalali.roundScore(10.7) === 10);
  ok('normalizeClock("7:5") → 07:05', jalali.normalizeClock('7:5') === '07:05');
  ok('normalizeClock("23:59") معتبر', jalali.normalizeClock('23:59') === '23:59');
  ok('normalizeClock("24:10") نامعتبر', jalali.normalizeClock('24:10') === null);
  ok('formatClock24("07:05") → ۰۷:۰۵', jalali.formatClock24('07:05') === '۰۷:۰۵');

  const range = days.resolveRange('7d', 0, 0);
  ok('resolveRange ۷ روز = ۷ روز', range.days.length === 7, String(range.days.length));

  const state = seed.seedState();
  const stats = days.buildDayStats(state, range.days);
  ok('buildDayStats بدون خطا و هم‌طول بازه', stats.length === 7);
  ok('DayStat دارای score/mood', stats.every((d) => 'score' in d && 'mood' in d));

  const full = summary.buildDayBlock(stats[0], summary.DEFAULT_SUMMARY_OPTIONS);
  ok('خروجی متنی نمره را دارد', full.includes('نمره روز'));
  ok('خروجی متنی ساعت را ۲۴ ساعته نشان می‌دهد', !/AM|PM/i.test(full));

  const noScore = summary.buildDayBlock(stats[0], { ...summary.DEFAULT_SUMMARY_OPTIONS, includeScore: false });
  ok('حالت «بدون نمره» خط نمره را حذف می‌کند', !noScore.includes('نمره روز'));

  // روزی که هیچ داده‌ای ندارد → باید صریح گفته شود
  const emptyDay = days.buildDayStat(state, jalali.addDays(jalali.todayStart(), -400));
  const emptyBlock = summary.buildDayBlock(emptyDay, summary.DEFAULT_SUMMARY_OPTIONS);
  ok('روز خالی → «ثبت نشده»', emptyBlock.includes(display.EMPTY_LABEL) || emptyBlock.includes('خالی'));
  ok('روز خالی صریح اعلام می‌شود', emptyBlock.includes('هیچ داده') || emptyBlock.includes(display.EMPTY_LABEL));

  const multi = summary.buildSummaryText(stats, summary.DEFAULT_SUMMARY_OPTIONS, {
    label: '۷ روز', from: range.from, to: range.to, count: stats.length,
  });
  ok('خلاصه چندروزه شامل سرصفحه است', multi.includes('خلاصه روزها'));
  ok('خلاصه چندروزه شامل «میزکار زندگی» است', multi.includes('میزکار زندگی'));

  const csv = summary.buildSummaryCsv(stats, summary.DEFAULT_SUMMARY_OPTIONS);
  ok('CSV ساخته می‌شود', csv.split('\n').length >= 5);

  // داده قدیمی با بخش مالی باید سالم و بدون مالی ایمپورت شود
  const legacy = {
    version: 1,
    profile: { name: 'کاربر قدیمی' },
    settings: { theme: 'dark', weekStart: 'sat', calSystem: 'jalali', financeEnabled: true, unit: 'toman' },
    tasks: state.tasks,
    events: state.events,
    habits: state.habits,
    habitLogs: state.habitLogs,
    notes: state.notes,
    reflections: state.reflections.map((r) => ({ ...r, score: 7.7 })),
    transactions: [{ id: 't1', amount: 50000, type: 'expense', date: Date.now(), title: 'قدیمی', category: 'x' }],
    budgets: [{ id: 'b1', category: 'x', amount: 1000 }],
    expenseCats: ['x'],
    incomeCats: ['y'],
    seeded: true,
    createdAt: Date.now(),
  };
  const clean = sanitize.sanitize(legacy);
  ok('ایمپورت داده قدیمی کار می‌کند', clean != null);
  ok('مالی از داده پاک می‌شود', clean != null && !('transactions' in clean) && !('budgets' in clean));
  ok('تنظیمات مالی حذف می‌شود', clean != null && !('financeEnabled' in clean.settings) && !('unit' in clean.settings));
  ok('نمره اعشاری ۷٫۷ حفظ می‌شود', clean != null && clean.reflections[0].score === 7.7, String(clean?.reflections[0]?.score));
  ok('sanitize نسخه ۱ برمی‌گرداند', clean != null && clean.version === 1);
  ok('sanitize ورودی بی‌معنی را رد می‌کند', sanitize.sanitize({ foo: 1 }) === null);

  const picked = days.pickRandom([...range.days], 3);
  ok('pickRandom دقیقاً ۳ مورد می‌دهد', picked.length === 3);
  ok('pickRandom تکراری ندارد', new Set(picked).size === 3);

  // ── ۳) رندر SSR صفحات ─────────────────────────────────────
  type PageSpec = { name: string; path: string; loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>; props?: Record<string, unknown> };
  const pages: PageSpec[] = [
    { name: 'داشبورد', path: '/', loader: () => import('../src/pages/Dashboard'), props: { onQuickAdd: () => {} } },
    { name: 'روز جاری', path: '/today', loader: () => import('../src/pages/Today') },
    { name: 'وظایف', path: '/tasks', loader: () => import('../src/pages/Tasks') },
    { name: 'تقویم', path: '/calendar', loader: () => import('../src/pages/Calendar') },
    { name: 'تحلیل روزها', path: '/insights', loader: () => import('../src/pages/Insights') },
    { name: 'بک‌لاگ', path: '/backlog', loader: () => import('../src/pages/Backlog') },
    { name: 'عادت‌ها', path: '/habits', loader: () => import('../src/pages/Habits') },
    { name: 'یادداشت‌ها', path: '/notes', loader: () => import('../src/pages/Notes') },
    { name: 'گزارش‌ها', path: '/reports', loader: () => import('../src/pages/Reports') },
    { name: 'تنظیمات', path: '/settings', loader: () => import('../src/pages/Settings') },
    { name: 'روز جاری (دیپ‌لینک)', path: '/today?day=' + jalali.addDays(jalali.todayStart(), -3), loader: () => import('../src/pages/Today') },
  ];

  for (const p of pages) {
    try {
      const mod = await p.loader();
      const Comp = mod.default as React.ComponentType<Record<string, unknown>>;
      const html = renderToString(
        React.createElement(
          AppProvider,
          null,
          React.createElement(
            MemoryRouter,
            { initialEntries: [p.path] },
            React.createElement(Comp, p.props ?? {}),
          ),
        ),
      );
      const noMoney = !/تومان|بودجه|تراکنش|مالی/.test(html);
      ok(`رندر ${p.name}`, html.length > 400, `${html.length} بایت`);
      ok(`${p.name}: بدون ردّ مالی`, noMoney, noMoney ? undefined : 'واژه مالی در HTML پیدا شد');
    } catch (e) {
      ok(`رندر ${p.name}`, false, e instanceof Error ? `${e.message}` : String(e));
    }
  }

  // ── ۴) مودال‌های فرم (نسخه باز) ────────────────────────────
  const forms = await import('../src/components/forms');
  const modals: Array<[string, React.ComponentType<Record<string, unknown>>, Record<string, unknown>]> = [
    ['مودال وظیفه', forms.TaskModal as unknown as React.ComponentType<Record<string, unknown>>, { presetDue: jalali.todayStart() }],
    ['مودال رویداد', forms.EventModal as unknown as React.ComponentType<Record<string, unknown>>, {}],
    ['مودال عادت', forms.HabitModal as unknown as React.ComponentType<Record<string, unknown>>, {}],
    ['مودال یادداشت', forms.NoteModal as unknown as React.ComponentType<Record<string, unknown>>, {}],
  ];
  for (const [name, Comp, props] of modals) {
    try {
      const html = renderToString(
        React.createElement(
          AppProvider,
          null,
          React.createElement(Comp, { ...props, open: true, onClose: () => {} }),
        ),
      );
      ok(`رندر ${name}`, html.includes('انصراف'), `${html.length} بایت`);
    } catch (e) {
      ok(`رندر ${name}`, false, e instanceof Error ? e.message : String(e));
    }
  }

  // ساعت‌های پیشنهادی فهرست انتخاب، فقط بازه ۲۴ ساعته است (بدون AM/PM)
  ok('گزینه‌های ساعت ۰۰ تا ۲۳', ['00', '13', '23'].every((h) => jalali.normalizeClock(`${h}:00`) === `${h}:00`));
  ok('ساعت ۲۴ نامعتبر است', jalali.normalizeClock('24:00') === null);

  // ── گزارش ─────────────────────────────────────────────────
  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    if (!c.ok) console.log(`✗ ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
  }
  console.log(`\n${checks.length - failed.length}/${checks.length} بررسی موفق`);
  if (failed.length) {
    console.log('❌ آزمون شکست خورد');
    process.exit(1);
  }
  console.log('✅ همه بررسی‌ها موفق بودند');
}

main().catch((e) => {
  console.error('❌ خطای غیرمنتظره در آزمون:', e);
  process.exit(1);
});
