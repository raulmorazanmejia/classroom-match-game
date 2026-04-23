import { useEffect, useState } from 'react';
import { buildViewLink, setRoute } from '../../lib/routes';
import { deleteActivityAndSubmissions, listActivities } from '../../lib/supabase';
import type { Activity } from '../../types/models';

type Props = { onLogout: () => void; refreshToken: number };

export default function TeacherDashboard({ onLogout, refreshToken }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [status, setStatus] = useState('');

  const load = async () => {
    try {
      setStatus('Loading activities...');
      const rows = await listActivities();
      setActivities(rows);
      setStatus(`${rows.length} activities loaded.`);
    } catch (error) {
      setStatus((error as Error).message || 'Load failed.');
    }
  };

  useEffect(() => { void load(); }, [refreshToken]);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setStatus('Link copied to clipboard.');
  };

  const deleteRow = async (activityId: string) => {
    if (!window.confirm('Delete this activity and all submissions?')) return;
    try {
      await deleteActivityAndSubmissions(activityId);
      setStatus('Activity deleted.');
      await load();
    } catch (error) {
      setStatus((error as Error).message || 'Delete failed.');
    }
  };

  return (
    <section className="space-y-4 rounded-3xl bg-white p-4 shadow-md ring-1 ring-indigo-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">Teacher Dashboard</h2>
        <div className="flex gap-2">
          <button onClick={() => setRoute('create')} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-white">Create Activity</button>
          <button onClick={load} className="rounded-xl bg-slate-200 px-3 py-1.5 text-slate-900">Refresh</button>
          <button onClick={onLogout} className="rounded-xl bg-rose-600 px-3 py-1.5 text-white">Logout</button>
        </div>
      </div>
      <p className="text-sm text-slate-600">{status}</p>
      <div className="space-y-3">
        {activities.map((activity) => {
          const studentLink = buildViewLink('play', activity.id);
          const resultsLink = buildViewLink('results', activity.id);
          return (
            <article key={activity.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <h3 className="font-semibold text-slate-900">{activity.title}</h3>
              <p className="text-xs text-slate-600">Created {new Date(activity.created_at).toLocaleString()}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <button onClick={() => setRoute('play', activity.id)} className="rounded-lg bg-indigo-600 px-2 py-1 text-white">Open Student View</button>
                <button onClick={() => setRoute('results', activity.id)} className="rounded-lg bg-violet-600 px-2 py-1 text-white">Open Results</button>
                <button onClick={() => copy(studentLink)} className="rounded-lg bg-emerald-600 px-2 py-1 text-white">Copy Student Link</button>
                <button onClick={() => copy(resultsLink)} className="rounded-lg bg-sky-600 px-2 py-1 text-white">Copy Results Link</button>
                <button onClick={() => void deleteRow(activity.id)} className="rounded-lg bg-rose-600 px-2 py-1 text-white">Delete</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
