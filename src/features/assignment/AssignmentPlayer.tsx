import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sharedAudio, type AudioDiagnostics } from '../../lib/audio';
import { getActivity, saveSubmission } from '../../lib/supabase.ts';
import type { Activity, AnswerOption, PromptItem } from '../../types/models';
import AnswerBank from './AnswerBank';
import PromptGrid from './PromptGrid';

const TILE_COLORS = ['bg-fuchsia-500', 'bg-violet-500', 'bg-blue-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

function shuffle<T>(items: T[]): T[] { const next = [...items]; for (let i = next.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [next[i], next[j]] = [next[j], next[i]]; } return next; }

export default function AssignmentPlayer({ activityId, columns }: { activityId: string; columns: number }) {
  const [studentName, setStudentName] = useState('');
  const [started, setStarted] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [options, setOptions] = useState<AnswerOption[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState('Loading activity...');
  const [startTs, setStartTs] = useState<number>(0);
  const [audioDiagnostics, setAudioDiagnostics] = useState<AudioDiagnostics>(sharedAudio.getDiagnostics());

  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));

  useEffect(() => {
    const unsubscribe = sharedAudio.subscribe((snapshot) => setAudioDiagnostics(snapshot));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getActivity(activityId);
        const promptList = data.pairs.map((pair, i) => ({ id: `P${i}`, pairId: i, promptText: pair.left }));
        const optionList = shuffle(data.pairs.map((pair, i) => ({ id: `O${i}`, pairId: i, answerText: pair.right, colorClass: TILE_COLORS[i % TILE_COLORS.length] })));
        setActivity(data); setPrompts(promptList); setOptions(optionList); setStatus('Ready. Enter name to start.');
      } catch (error) { setStatus((error as Error).message || 'Failed to load activity'); }
    }; void load();
  }, [activityId]);

  const optionsById = useMemo(() => Object.fromEntries(options.map((o) => [o.id, o])) as Record<string, AnswerOption>, [options]);
  const availableOptions = options.filter((option) => !Object.values(assignments).includes(option.id));

  const assignOption = async (optionId: string, promptId: string) => {
    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((existingPromptId) => { if (next[existingPromptId] === optionId) delete next[existingPromptId]; });
      next[promptId] = optionId; return next;
    });
    setSelectedOptionId(null);
    await sharedAudio.play('place');
  };

  const submit = async () => {
    setAttempts((prev) => prev + 1);
    if (Object.keys(assignments).length !== prompts.length) { await sharedAudio.play('wrong'); setStatus('Assign every prompt before submit.'); return; }
    let correct = 0;
    prompts.forEach((prompt) => { const option = optionsById[assignments[prompt.id]]; if (option?.pairId === prompt.pairId) correct += 1; });
    try {
      await saveSubmission({ activity_id: activityId, student_name: studentName || 'Student', score: correct, total: prompts.length, attempts: attempts + 1, duration_seconds: Math.floor((Date.now() - startTs) / 1000) });
      await sharedAudio.play(correct === prompts.length ? 'correct' : 'wrong');
      setStatus(`Submitted: ${correct}/${prompts.length}`);
    } catch (error) { setStatus((error as Error).message || 'Submit failed'); }
  };

  if (!started) {
    return <section className="space-y-3 rounded-3xl bg-white p-4 shadow-md ring-1 ring-indigo-100"><h1 className="text-xl font-bold text-slate-900">{activity?.title ?? 'Assignment'}</h1><p className="text-sm text-slate-600">{status}</p><input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Enter your name" className="w-full rounded-xl border px-3 py-2 text-slate-900" /><div className="flex gap-2"><button onClick={() => { if (!studentName.trim()) { setStatus('Please enter your name.'); return; } void sharedAudio.resumeForGesture('start-activity'); setStarted(true); setStartTs(Date.now()); }} className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white">Start Activity</button><button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" onClick={async () => { await sharedAudio.resumeForGesture('test-sound-before-start'); await sharedAudio.play('place'); }}>Test Sound</button></div><div className="rounded-xl bg-slate-50 px-2 py-1.5 text-[11px] text-slate-700 ring-1 ring-slate-200"><p><span className="font-semibold">AudioContext:</span> {audioDiagnostics.contextState}</p><p><span className="font-semibold">Sound enabled:</span> {audioDiagnostics.soundEnabled ? 'yes' : 'no'}</p><p><span className="font-semibold">Last sound event:</span> {audioDiagnostics.lastEvent}</p><p><span className="font-semibold">Last audio error:</span> {audioDiagnostics.lastError}</p></div></section>;
  }

  return (
    <section onPointerDown={() => { void sharedAudio.resumeForGesture('pointerdown'); }} className="space-y-2.5 rounded-3xl bg-gradient-to-b from-indigo-50 via-cyan-50 to-emerald-50 p-2.5 shadow-md ring-1 ring-indigo-100">
      <div className="flex items-center justify-between"><h1 className="text-lg font-bold text-slate-900">{activity?.title || 'Assignment Mode'}</h1><button className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white" onClick={async () => { await sharedAudio.resumeForGesture('test-sound-button'); await sharedAudio.play('place'); }}>Test Sound</button></div>
      <div className="flex items-center justify-between"><p className="text-sm text-slate-700">Student: <span className="font-semibold">{studentName}</span></p><button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-500" onClick={() => { void sharedAudio.resumeForGesture('submit-click'); void submit(); }}>Submit</button></div>
      <p className="text-xs text-slate-600">{status}</p>
      <div className="rounded-xl bg-white/75 px-2 py-1.5 text-[11px] text-slate-700 ring-1 ring-slate-200">
        <p><span className="font-semibold">AudioContext:</span> {audioDiagnostics.contextState}</p>
        <p><span className="font-semibold">Sound enabled:</span> {audioDiagnostics.soundEnabled ? 'yes' : 'no'}</p>
        <p><span className="font-semibold">Last sound played:</span> {audioDiagnostics.lastSoundPlayed}</p>
        <p><span className="font-semibold">Audio event:</span> {audioDiagnostics.lastEvent}</p>
        <p><span className="font-semibold">Last audio error:</span> {audioDiagnostics.lastError}</p>
      </div>
      <DndContext sensors={sensors} onDragStart={({ active }) => { setActiveDragId(String(active.id)); void sharedAudio.resumeForGesture('drag-start'); }} onDragEnd={({ active, over }) => { setActiveDragId(null); if (!over || over.id === 'answer-bank') return; void assignOption(String(active.id), String(over.id)); }}>
        <AnswerBank options={availableOptions} selectedOptionId={selectedOptionId} onSelect={(id) => { void sharedAudio.resumeForGesture('answer-select'); setSelectedOptionId(id); }} columns={columns} />
        <PromptGrid prompts={prompts} assignments={assignments} optionsById={optionsById} onTapAssign={(promptId) => { if (selectedOptionId) void assignOption(selectedOptionId, promptId); }} onClear={(promptId) => setAssignments((prev) => { const next = { ...prev }; delete next[promptId]; return next; })} columns={columns} />
        <DragOverlay>{activeDragId && optionsById[activeDragId] ? <div className={`rounded-2xl px-3 py-2 text-sm font-semibold text-white shadow-xl ${optionsById[activeDragId].colorClass}`}>{optionsById[activeDragId].answerText}</div> : null}</DragOverlay>
      </DndContext>
    </section>
  );
}
