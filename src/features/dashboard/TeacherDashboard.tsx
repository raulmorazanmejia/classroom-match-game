import { useEffect, useState } from 'react';
import { buildViewLink, setRoute } from '../../lib/routes';
import { deleteActivityAndSubmissions, listActivities } from '../../lib/supabase.ts';
import type { Activity } from '../../types/models';
import TeacherLinkQr from './TeacherLinkQr';

type Props = { onLogout: () => void; refreshToken: number };

export default function TeacherDashboard({ onLogout, refreshToken }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [status, setStatus] = useState('');
  const [openQrFor, setOpenQrFor] = useState<string | null>(null);

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
    <section className="space-y-5 rounded-3xl bg-white p-5 shadow-md ring-1 ring-indigo-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Teacher Dashboard</h2>
          <p className="text-sm text-slate-600">Manage activities, links, QR access, and results in one place.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRoute('create')} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-white">Create Activity</button>
          <button onClick={load} className="rounded-xl bg-slate-200 px-3 py-1.5 text-slate-900">Refresh</button>
          <button onClick={onLogout} className="rounded-xl bg-rose-600 px-3 py-1.5 text-white">Logout</button>
        </div>
      </div>
      <p className="text-sm text-slate-600">{status}</p>
      <div className="grid gap-4">
        {activities.map((activity) => {
          const studentLink = buildViewLink('play', activity.id);
          const resultsLink = buildViewLink('results', activity.id);
          const isQrOpen = openQrFor === activity.id;
          return (
            <article key={activity.id} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{activity.title}</h3>
                  <p className="text-xs text-slate-600">Created {new Date(activity.created_at).toLocaleString()}</p>
                </div>
                <button onClick={() => void deleteRow(activity.id)} className="rounded-lg bg-rose-600 px-2 py-1 text-sm text-white">Delete Activity</button>
              </div>
              <div className="grid gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Student Access</p>
                <div className="flex flex-wrap gap-2 text-sm">
                  <button onClick={() => setRoute('play', activity.id)} className="rounded-lg bg-indigo-700 px-2 py-1 text-white">Open Student View</button>
                  <button onClick={() => window.open(studentLink, '_blank', 'noopener,noreferrer')} className="rounded-lg bg-indigo-600 px-2 py-1 text-white">Open Student Link</button>
                  <button onClick={() => copy(studentLink)} className="rounded-lg bg-emerald-600 px-2 py-1 text-white">Copy Student Link</button>
                  <button onClick={() => setOpenQrFor(isQrOpen ? null : activity.id)} className="rounded-lg bg-teal-600 px-2 py-1 text-white">{isQrOpen ? 'Hide QR' : 'Show QR'}</button>
                </div>
                {isQrOpen ? <TeacherLinkQr link={studentLink} label="Scan for Student Activity" /> : null}
              </div>
              <div className="grid gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Results / Admin Access</p>
                <div className="flex flex-wrap gap-2 text-sm">
                  <button onClick={() => setRoute('results', activity.id)} className="rounded-lg bg-violet-600 px-2 py-1 text-white">Open Results View</button>
                  <button onClick={() => window.open(resultsLink, '_blank', 'noopener,noreferrer')} className="rounded-lg bg-sky-600 px-2 py-1 text-white">Open Results Link</button>
                  <button onClick={() => copy(resultsLink)} className="rounded-lg bg-cyan-600 px-2 py-1 text-white">Copy Results Link</button>
                </div>
              </div>
            </article>
          );
        })}
        {!activities.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No activities yet. Click <span className="font-semibold">Create Activity</span> to get started.</p> : null}
      </div>
    </section>
  );
}
