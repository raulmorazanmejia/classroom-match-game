import { useMemo, useState } from 'react';
import { buildViewLink } from '../../lib/routes';
import { createActivity } from '../../lib/supabase.ts';
import type { Pair, TapBlankQuestion } from '../../types/models';
import { SAMPLE_TAP_BLANK_QUESTIONS } from '../assignment/sampleTapBlankQuestions';
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

function sampleQuestionsText() {
  return SAMPLE_TAP_BLANK_QUESTIONS
    .map((q) => `${q.sentence} | ${q.options.join(' | ')} | ${q.correctIndex}${q.imageUrl ? ` | ${q.imageUrl}` : ''}`)
    .join('\n');
}

function parseTapBlankQuestions(text: string): TapBlankQuestion[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('Add at least 2 tap-blank questions.');

  return lines.map((line, index) => {
    const cells = line.split(/\s*\|\s*/).map((cell) => cell.trim());
    if (cells.length < 6) {
      throw new Error(`Tap-blank line ${index + 1} must include sentence + 4 options + correct index.`);
    }

    const [sentence, opt1, opt2, opt3, opt4, correctRaw, imageUrl] = cells;
    const options = [opt1, opt2, opt3, opt4];
    if (!sentence || options.some((opt) => !opt)) {
      throw new Error(`Tap-blank line ${index + 1} is missing sentence or options.`);
    }

    const correctIndex = Number(correctRaw);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      throw new Error(`Tap-blank line ${index + 1} has invalid correct index. Use 0 to 3.`);
    }

    return {
      id: `tb-${index + 1}`,
      sentence,
      options,
      correctIndex,
      imageUrl: imageUrl || undefined
    };
  });
}

type Props = { teacherName: string; onCreated: () => void };

export default function CreateActivityCard({ teacherName, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [activityType, setActivityType] = useState<'match' | 'tap-blank'>('match');
  const [pairsText, setPairsText] = useState('');
  const [tapBlankText, setTapBlankText] = useState(sampleQuestionsText());
  const [status, setStatus] = useState('');
  const [studentLink, setStudentLink] = useState('');
  const [resultsLink, setResultsLink] = useState('');
  const [createdTitle, setCreatedTitle] = useState('');

  const modeHelp = useMemo(() => {
    if (activityType === 'tap-blank') {
      return 'Format: sentence | option1 | option2 | option3 | option4 | correctIndex (0-3) | optional image URL';
    }
    return 'Format: prompt, answer (or prompt -> answer). One pair per line.';
  }, [activityType]);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setStatus('Copied link to clipboard.');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStatus('Creating activity...');

      if (activityType === 'tap-blank') {
        const tapBlankQuestions = parseTapBlankQuestions(tapBlankText);
        const fallbackPairs = tapBlankQuestions.map((q) => ({ left: q.sentence, right: q.options[q.correctIndex] }));
        const activity = await createActivity({
          title: title.trim(),
          teacherName,
          pairs: fallbackPairs,
          activityType: 'tap-blank',
          tapBlankQuestions
        });

        const play = buildViewLink('play', activity.id);
        const results = buildViewLink('results', activity.id);
        setCreatedTitle(activity.title);
        setStudentLink(play);
        setResultsLink(results);
        setStatus('Tap Fill-in-the-Blank activity created successfully.');
        onCreated();
        return;
      }

      const pairs = parsePairs(pairsText);
      const activity = await createActivity({ title: title.trim(), teacherName, pairs, activityType: 'match' });
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
        <p className="text-sm text-slate-600">Build a matching or tap-blank activity, then instantly share student and results links.</p>
      </div>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900" placeholder="Activity title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <label className="block text-sm font-semibold text-slate-700">
          Activity Type
          <select value={activityType} onChange={(e) => setActivityType(e.target.value as 'match' | 'tap-blank')} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900">
            <option value="match">Match (drag + tap)</option>
            <option value="tap-blank">Tap Fill-in-the-Blank</option>
          </select>
        </label>
        {activityType === 'match' ? (
          <textarea className="h-40 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900" placeholder="prompt, answer (one pair per line)" value={pairsText} onChange={(e) => setPairsText(e.target.value)} required />
        ) : (
          <textarea className="h-52 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900" placeholder={modeHelp} value={tapBlankText} onChange={(e) => setTapBlankText(e.target.value)} required />
        )}
        <p className="text-xs text-slate-500">{modeHelp}</p>
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
