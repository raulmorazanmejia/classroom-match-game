import { useState } from 'react';
import { buildViewLink } from '../../lib/routes';
import { createActivity } from '../../lib/supabase.ts';
import type { Pair } from '../../types/models';
import TeacherLinkQr from './TeacherLinkQr';

function parsePairs(text: string): Pair[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const parsed: Pair[] = [];
  for (const [index, line] of lines.entries()) {
    const sep = [/\s*->\s*/, /\s*\|\s*/, /\t/, /\s*,\s*/];
    let pieces: string[] | null = null;
    for (const pattern of sep) {
      const candidate = line.split(pattern).map((p) => p.trim());
      if (candidate.length === 2) { pieces = candidate; break; }
    }
    if (!pieces?.[0] || !pieces?.[1]) throw new Error(`Line ${index + 1} is invalid.`);
    parsed.push({ left: pieces[0], right: pieces[1] });
  }
  if (parsed.length < 2) throw new Error('Add at least 2 pairs.');
  return parsed;
}

type Props = { teacherName: string; onCreated: () => void };

export default function CreateActivityCard({ teacherName, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [pairsText, setPairsText] = useState('');
  const [status, setStatus] = useState('');
  const [studentLink, setStudentLink] = useState('');
  const [resultsLink, setResultsLink] = useState('');
  const [createdTitle, setCreatedTitle] = useState('');

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setStatus('Copied link to clipboard.');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStatus('Creating activity...');
      const pairs = parsePairs(pairsText);
      const activity = await createActivity({ title: title.trim(), teacherName, pairs });
      const play = buildViewLink('play', activity.id);
      const results = buildViewLink('results', activity.id);
      setCreatedTitle(activity.title);
      setStudentLink(play);
      setResultsLink(results);
      setStatus('Activity created successfully.');
      onCreated();
    } catch (error) {
      setStatus((error as Error).message || 'Create failed.');
    }
  };

  return (
    <section className="space-y-4 rounded-3xl bg-white p-5 shadow-md ring-1 ring-indigo-100">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Create Activity</h2>
        <p className="text-sm text-slate-600">Build a new matching activity, then instantly share student and results links.</p>
      </div>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900" placeholder="Activity title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="h-40 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900" placeholder="prompt, answer (one pair per line)" value={pairsText} onChange={(e) => setPairsText(e.target.value)} required />
        <button className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white">Create + Generate Links</button>
      </form>
      {status && <p className="mt-2 text-sm text-slate-600">{status}</p>}
      {studentLink && (
        <div className="grid gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <p className="text-base font-semibold text-slate-900">Ready to share: {createdTitle}</p>
            <div className="rounded-xl bg-white p-3 ring-1 ring-emerald-100">
              <p className="text-sm font-semibold text-emerald-900">Student Link</p>
              <p className="break-all text-xs text-emerald-700">{studentLink}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => window.open(studentLink, '_blank', 'noopener,noreferrer')} className="rounded-lg bg-emerald-600 px-3 py-1 text-white">Open Student Link</button>
                <button onClick={() => copy(studentLink)} className="rounded-lg bg-emerald-700 px-3 py-1 text-white">Copy Student Link</button>
              </div>
            </div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
              <p className="text-sm font-semibold text-indigo-900">Results / Admin Link</p>
              <p className="break-all text-xs text-indigo-700">{resultsLink}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => window.open(resultsLink, '_blank', 'noopener,noreferrer')} className="rounded-lg bg-indigo-600 px-3 py-1 text-white">Open Results Link</button>
                <button onClick={() => copy(resultsLink)} className="rounded-lg bg-indigo-700 px-3 py-1 text-white">Copy Results Link</button>
              </div>
            </div>
          </div>
          <TeacherLinkQr link={studentLink} label="Scan for Student View" />
        </div>
      )}
    </section>
  );
}
