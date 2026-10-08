import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider } from './lib/store';
import { Shell, type QuickKind } from './components/Shell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EventModal, HabitModal, NoteModal, TaskModal } from './components/forms';

// لود تنبل صفحات: باندل اولیه سبک‌تر و شروع سریع‌تر برنامه
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Today = lazy(() => import('./pages/Today'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Insights = lazy(() => import('./pages/Insights'));
const Backlog = lazy(() => import('./pages/Backlog'));
const Habits = lazy(() => import('./pages/Habits'));
const Notes = lazy(() => import('./pages/Notes'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));

function PageLoader() {
  return (
    <div className="space-y-3" aria-label="در حال بارگذاری…" role="status">
      <div className="shimmer-line h-32 rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="shimmer-line h-24 rounded-2xl" />
        <div className="shimmer-line h-24 rounded-2xl" />
        <div className="shimmer-line hidden h-24 rounded-2xl xl:block" />
        <div className="shimmer-line hidden h-24 rounded-2xl xl:block" />
      </div>
      <div className="shimmer-line h-48 rounded-3xl" />
    </div>
  );
}

/** با هر تغییر مسیر، اسکرول به بالای صفحه برگردد (تجربه موبایل بهتر) */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function Root() {
  const [quick, setQuick] = useState<QuickKind | null>(null);
  const open = useCallback((k: QuickKind) => setQuick(k), []);
  const close = useCallback(() => setQuick(null), []);

  return (
    <Shell onQuickAdd={open}>
      <ScrollToTop />
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard onQuickAdd={open} />} />
            <Route path="/today" element={<Today />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/backlog" element={<Backlog />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>

      <TaskModal open={quick === 'task'} onClose={close} />
      <EventModal open={quick === 'event'} onClose={close} />
      <HabitModal open={quick === 'habit'} onClose={close} />
      <NoteModal open={quick === 'note'} onClose={close} />
    </Shell>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <Root />
      </AppProvider>
    </HashRouter>
  );
}
