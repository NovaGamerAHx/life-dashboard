import { Suspense, lazy, useCallback, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './lib/store';
import { Shell } from './components/Shell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TxModal, TaskModal, EventModal, HabitModal, NoteModal } from './components/forms';

// لود تنبل صفحات: باندل اولیه سبک‌تر و شروع سریع‌تر برنامه
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Today = lazy(() => import('./pages/Today'));
const Backlog = lazy(() => import('./pages/Backlog'));
const Finance = lazy(() => import('./pages/Finance'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Habits = lazy(() => import('./pages/Habits'));
const Notes = lazy(() => import('./pages/Notes'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));

type QuickKind = 'tx' | 'task' | 'event' | 'note' | 'habit';

function PageLoader() {
  return (
    <div className="space-y-3" aria-label="در حال بارگذاری…">
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

function Root() {
  const [quick, setQuick] = useState<QuickKind | null>(null);
  const open = useCallback((k: QuickKind) => setQuick(k), []);
  const close = useCallback(() => setQuick(null), []);
  const { state } = useApp();
  const fin = state.settings.financeEnabled;

  return (
    <Shell onQuickAdd={open}>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard onQuickAdd={open} />} />
            <Route path="/today" element={<Today />} />
            <Route path="/backlog" element={<Backlog />} />
            <Route path="/finance" element={fin ? <Finance /> : <Navigate to="/settings" replace />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Dashboard onQuickAdd={open} />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>

      {fin && <TxModal open={quick === 'tx'} onClose={close} />}
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
