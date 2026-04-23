import { useEffect, useState } from 'react';
import { setRoute } from '../../lib/routes';
import { getActivity, listSubmissions } from '../../lib/supabase.ts';
import type { Submission } from '../../types/models';

type Props = { activityId: string };

export default function ResultsView({ activityId }: Props) {
  const [title, setTitle] = useState('Results');
  const [rows, setRows] = useState<Submission[]>([]);
  const [status, setStatus] = useState('Loading results...');

  useEffect(() => {
    const load = async () => {
      try {
        const activity = await getActivity(activityId);
        const submissions = await listSubmissions(activityId);
        setTitle(`Results: ${activity.title}`);
        setRows(submissions);
        setStatus(`${submissions.length} submissions loaded.`);
      } catch (error) {
        setStatus((error as Error).message || 'Could not load results.');
      }
    };
    void load();
  }, [activityId]);

  return (
    <section className="space-y-3 rounded-3xl bg-white p-4 shadow-md ring-1 ring-indigo-100">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <button onClick={() => setRoute('dashboard')} className="rounded-lg bg-slate-200 px-3 py-1 text-slate-900">Back</button>
      </div>
      <p className="text-sm text-slate-600">{status}</p>
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700"><tr><th className="p-2">Student</th><th className="p-2">Score</th><th className="p-2">Attempts</th><th className="p-2">Duration</th><th className="p-2">Completed</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100">
                <td className="p-2">{row.student_name}</td><td className="p-2">{row.score}/{row.total}</td><td className="p-2">{row.attempts}</td><td className="p-2">{row.duration_seconds}s</td><td className="p-2">{row.created_at ? new Date(row.created_at).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
