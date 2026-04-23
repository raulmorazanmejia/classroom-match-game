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
  const { session, login, logout } = useTeacherSession();
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

  if (!session.loggedIn && route.view !== 'play') {
    return <main className="mx-auto min-h-screen w-full max-w-5xl p-3"><TeacherLogin onLogin={(name) => { login(name); setRoute('dashboard'); }} /></main>;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl p-3">
      <div className="mb-3 rounded-2xl bg-white/70 px-3 py-2 text-xs text-slate-600 shadow-sm ring-1 ring-slate-100">Classroom Match v2</div>
      {route.view === 'play' && route.id ? <AssignmentPlayer activityId={route.id} columns={columns} /> : null}
      {route.view === 'results' && route.id ? <ResultsView activityId={route.id} /> : null}
      {route.view === 'create' ? <CreateActivityCard teacherName={session.teacherName || 'Teacher'} onCreated={() => setRefreshToken((x) => x + 1)} /> : null}
      {(route.view === 'dashboard' || route.view === 'login') ? <TeacherDashboard onLogout={handleLogout} refreshToken={refreshToken} /> : null}
    </main>
  );
}
