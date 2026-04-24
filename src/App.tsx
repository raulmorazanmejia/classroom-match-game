import { useEffect, useState } from 'react';
import TeacherLogin from './features/auth/TeacherLogin';
import TeacherDashboard from './features/dashboard/TeacherDashboard';
import CreateActivityCard from './features/dashboard/CreateActivityCard';
import AssignmentPlayer from './features/assignment/AssignmentPlayer';
import ResultsView from './features/results/ResultsView';
import { readRoute, setRoute } from './lib/routes';
import { useResponsiveColumns } from './hooks/useResponsiveColumns';
import { useTeacherSession } from './hooks/useTeacherSession';

export default function App() {
  const columns = useResponsiveColumns();
  const { session, hasStoredAuth, login, logout, clearSavedSession } = useTeacherSession();
  const [refreshToken, setRefreshToken] = useState(0);
  const [route, setRouteState] = useState(readRoute);

  useEffect(() => {
    const onPopState = () => setRouteState(readRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleLogout = () => {
    logout();
    setRoute('login');
  };

  const showLoginGate = route.view !== 'play' && (!session.loggedIn || route.view === 'login');

  if (showLoginGate) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl p-2.5">
        <TeacherLogin onLogin={(name, teacherPassword) => { login(name, teacherPassword); setRoute('dashboard'); }} />
        <div className="mx-auto mt-3 max-w-md rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
          <p><span className="font-semibold">Auth debug:</span> route={route.view}, loggedIn={session.loggedIn ? 'yes' : 'no'}, storedSession={hasStoredAuth ? 'yes' : 'no'}</p>
          {hasStoredAuth ? <button onClick={clearSavedSession} className="mt-2 rounded-lg bg-rose-600 px-2 py-1 text-white">Clear saved login</button> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl p-2.5">
      <div className="mb-2 rounded-2xl bg-white/70 px-3 py-1.5 text-xs text-slate-600 shadow-sm ring-1 ring-slate-100">Classroom Match v2</div>
      {route.view === 'create' ? (
        <div className="mb-2 flex justify-end">
          <button onClick={() => setRoute('dashboard')} className="rounded-lg bg-slate-200 px-3 py-1 text-sm text-slate-900">Back to Dashboard</button>
        </div>
      ) : null}
      {route.view === 'play' && route.id ? <AssignmentPlayer activityId={route.id} columns={columns} /> : null}
      {route.view === 'results' && route.id ? <ResultsView activityId={route.id} /> : null}
      {route.view === 'create' ? <CreateActivityCard teacherName={session.teacherName || 'Teacher'} onCreated={() => setRefreshToken((x) => x + 1)} /> : null}
      {(route.view === 'dashboard' || route.view === 'login') ? <TeacherDashboard onLogout={handleLogout} refreshToken={refreshToken} teacherPassword={session.teacherPassword} /> : null}
    </main>
  );
}
