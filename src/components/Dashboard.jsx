import { useEffect, useState } from 'react';
import { deleteActivityAndSubmissions, listActivities } from '../lib/supabase';

export default function Dashboard({ onOpenPlay }) {
  const [activities, setActivities] = useState([]);
  const [status, setStatus] = useState('Loading activities…');

  const load = async () => {
    setStatus('Loading activities…');
    try {
      const rows = await listActivities();
      setActivities(rows);
      setStatus(`${rows.length} activities loaded`);
    } catch (error) {
      setStatus(error.message || 'Failed to load activities');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const deleteRow = async (activityId) => {
    const confirmed = window.confirm('Delete this activity and all submissions?');
    if (!confirmed) return;

    try {
      await deleteActivityAndSubmissions(activityId);
      setStatus('Activity deleted');
      await load();
    } catch (error) {
      setStatus(error.message || 'Delete failed');
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-panel p-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <button className="rounded-md border border-slate-700 px-3 py-1 text-xs" onClick={load}>Refresh</button>
      </div>
      <p className="text-xs text-slate-400">{status}</p>
      <div className="space-y-2">
        {activities.map((activity) => (
          <article key={activity.id} className="rounded-lg border border-slate-800 bg-slate-900/80 p-2">
            <h3 className="font-medium">{activity.title}</h3>
            <p className="text-xs text-slate-500">{new Date(activity.created_at).toLocaleString()}</p>
            <div className="mt-2 flex gap-2">
              <button className="rounded-md bg-sky-600 px-3 py-1 text-xs" onClick={() => onOpenPlay(activity.id)}>Open</button>
              <button className="rounded-md border border-rose-700 px-3 py-1 text-xs text-rose-300" onClick={() => deleteRow(activity.id)}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
