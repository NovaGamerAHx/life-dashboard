import { useCallback, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './lib/store';
import { Shell } from './components/Shell';
import { TxModal, TaskModal, EventModal, HabitModal, NoteModal } from './components/forms';
import Dashboard from './pages/Dashboard';
import Today from './pages/Today';
import Backlog from './pages/Backlog';
import Finance from './pages/Finance';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import Habits from './pages/Habits';
import Notes from './pages/Notes';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

type QuickKind = 'tx' | 'task' | 'event' | 'note' | 'habit';

function Root() {
  const [quick, setQuick] = useState<QuickKind | null>(null);
  const open = useCallback((k: QuickKind) => setQuick(k), []);
  const close = useCallback(() => setQuick(null), []);
  const { state } = useApp();
  const fin = state.settings.financeEnabled;

  return (
    <Shell onQuickAdd={open}>
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
