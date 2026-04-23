import { useEffect, useState } from 'react';
import AssignmentMode from './components/AssignmentMode';
import Dashboard from './components/Dashboard';
import { useColumns } from './hooks/useColumns';

function readRoute() {
  const params = new URLSearchParams(window.location.search);
  return {
    view: params.get('view') || 'dashboard',
    id: params.get('id')
  };
}

function setRoute(view, id) {
  const url = new URL(window.location.href);
  url.searchParams.set('view', view);
  if (id) url.searchParams.set('id', id);
  else url.searchParams.delete('id');
  window.history.pushState({}, '', url);
  window.dispatchEvent(new Event('popstate'));
}

export default function App() {
  const columns = useColumns();
  const [route, setRouteState] = useState(readRoute);

  useEffect(() => {
    const onPopState = () => setRouteState(readRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl p-2 sm:p-4">
      {route.view === 'play' && route.id ? (
        <AssignmentMode activityId={route.id} columns={columns} />
      ) : (
        <Dashboard onOpenPlay={(id) => setRoute('play', id)} />
      )}
    </main>
  );
}
