import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sharedAudio, type AudioDiagnostics } from '../../lib/audio.ts';
import { getActivity, saveSubmission } from '../../lib/supabase.ts';
import type { Activity, AnswerOption, PromptItem, TapBlankQuestion } from '../../types/models';
import AnswerBank from './AnswerBank';
import PromptGrid from './PromptGrid';
import TapFillBlankPlayer from './TapFillBlankPlayer';
import { SAMPLE_TAP_BLANK_QUESTIONS } from './sampleTapBlankQuestions';

const TILE_COLORS = ['bg-fuchsia-500', 'bg-violet-500', 'bg-blue-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
const COUNTDOWN_SEQUENCE = ['3', '2', '1', 'Ready?'];
const SHOW_AUDIO_DEBUG = new URLSearchParams(window.location.search).get('debugAudio') === '1';

function shuffle<T>(items: T[]): T[] { const next = [...items]; for (let i = next.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [next[i], next[j]] = [next[j], next[i]]; } return next; }

export default function AssignmentPlayer({ activityId, columns }: { activityId: string; columns: number }) {
  const [studentName, setStudentName] = useState('');
  const [started, setStarted] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [countdownText, setCountdownText] = useState(COUNTDOWN_SEQUENCE[0]);
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
        setActivity(data); setPrompts(promptList); setOptions(optionList); setStatus('Enter your name to begin.');
      } catch (error) { setStatus((error as Error).message || 'Failed to load activity'); }
    }; void load();
  }, [activityId]);

  const optionsById = useMemo(() => Object.fromEntries(options.map((o) => [o.id, o])) as Record<string, AnswerOption>, [options]);
  const availableOptions = options.filter((option) => !Object.values(assignments).includes(option.id));

  const tapBlankQuestions = useMemo(() => {
    const questions = (activity?.tap_blank_questions?.length ? activity.tap_blank_questions : SAMPLE_TAP_BLANK_QUESTIONS) as TapBlankQuestion[];
    return questions
      .filter((q) => q && typeof q.sentence === 'string' && Array.isArray(q.options) && q.options.length === 4)
      .map((q) => ({ ...q, options: q.options.slice(0, 4) as [string, string, string, string], correctIndex: Math.max(0, Math.min(3, q.correctIndex)) }));
  }, [activity]);

  const isTapBlankActivity = (activity?.activity_type ?? '').toLowerCase() === 'tap-blank';

  const assignOption = async (optionId: string, promptId: string) => {
    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((existingPromptId) => { if (next[existingPromptId] === optionId) delete next[existingPromptId]; });
      next[promptId] = optionId; return next;
    });
    setSelectedOptionId(null);
    await sharedAudio.play('tap');
  };

  const startLaunchSequence = async () => {
    if (!studentName.trim()) {
      setStatus('Please enter your name.');
      return;
    }

    await sharedAudio.armAndPrime('start-activity');
    await sharedAudio.play('start');

    setLaunching(true);
    setStatus('Get ready...');

    COUNTDOWN_SEQUENCE.forEach((text, index) => {
      window.setTimeout(() => {
        setCountdownText(text);
        if (index === COUNTDOWN_SEQUENCE.length - 1) {
          window.setTimeout(() => {
            setLaunching(false);
            setStarted(true);
            setStartTs(Date.now());
            setStatus(isTapBlankActivity ? 'Tap the best answer to fill in the blank.' : 'Match the answers to the prompts.');
          }, 260);
        }
      }, index * 420);
    });
  };


  const submitTapBlank = async (finalScore: number, totalQuestions: number) => {
    setAttempts((prev) => prev + 1);
    try {
      await saveSubmission({
        activity_id: activityId,
        student_name: studentName || 'Student',
        score: finalScore,
        total: totalQuestions,
        attempts: attempts + 1,
        duration_seconds: Math.floor((Date.now() - startTs) / 1000)
      });
      setStatus(`Completed: ${finalScore}/${totalQuestions}`);
    } catch (error) {
      setStatus((error as Error).message || 'Unable to save completion score.');
    }
  };

  const submit = async () => {
    setAttempts((prev) => prev + 1);
    if (Object.keys(assignments).length !== prompts.length) {
      await sharedAudio.play('wrong');
      setStatus('Assign every prompt before submit.');
      return;
    }

    let correct = 0;
    prompts.forEach((prompt) => { const option = optionsById[assignments[prompt.id]]; if (option?.pairId === prompt.pairId) correct += 1; });

    try {
      await saveSubmission({
        activity_id: activityId,
        student_name: studentName || 'Student',
        score: correct,
        total: prompts.length,
        attempts: attempts + 1,
        duration_seconds: Math.floor((Date.now() - startTs) / 1000)
      });
      await sharedAudio.play(correct === prompts.length ? 'complete' : 'wrong');
      setStatus(`Submitted: ${correct}/${prompts.length}`);
    } catch (error) {
      setStatus((error as Error).message || 'Submit failed');
    }
  };

  if (!started) {
    const showStatusMessage = !isTapBlankActivity || status === 'Loading activity...' || status === 'Please enter your name.' || status.includes('Failed');
    return (
      <section className={`relative overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-indigo-100 ${isTapBlankActivity ? 'p-6 sm:p-7' : 'p-5'}`}>
        <div className={`mx-auto text-center transition duration-300 ${isTapBlankActivity ? 'max-w-md' : 'max-w-xl'} ${launching ? 'pointer-events-none scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
          <p className={`font-semibold uppercase tracking-wide text-indigo-500 ${isTapBlankActivity ? 'text-sm tracking-[0.2em]' : 'text-xs'}`}>Classroom Match</p>
          <h1 className={`mt-2 font-extrabold text-slate-900 ${isTapBlankActivity ? 'text-4xl leading-tight' : 'text-3xl'}`}>{activity?.title ?? 'Assignment'}</h1>
          <p className={`mx-auto mt-3 text-slate-600 ${isTapBlankActivity ? 'max-w-sm text-base' : 'text-sm'}`}>{isTapBlankActivity ? 'Read the sentence, tap the best word, and keep your streak going.' : 'Match the answers to the prompts.'}</p>
          <input
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Enter your name"
            className={`mx-auto mt-5 w-full max-w-sm rounded-2xl border border-indigo-200 px-4 text-center text-slate-900 shadow-sm focus:border-indigo-400 focus:outline-none ${isTapBlankActivity ? 'py-3.5 text-lg' : 'py-3 text-base'}`}
          />
          <button
            onClick={() => { void startLaunchSequence(); }}
            className={`mt-4 min-h-[56px] rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 px-10 text-xl font-extrabold text-white shadow-lg shadow-indigo-200 transition active:scale-[0.98] ${isTapBlankActivity ? 'py-3.5' : 'py-4 hover:brightness-110'}`}
          >
            Start
          </button>
          {showStatusMessage ? <p className="mt-3 text-xs text-slate-500">{status}</p> : null}

          {SHOW_AUDIO_DEBUG ? (
            <div className="mx-auto mt-4 max-w-sm rounded-xl bg-slate-50 px-3 py-2 text-left text-[11px] text-slate-700 ring-1 ring-slate-200">
              <p><span className="font-semibold">Sound enabled:</span> {audioDiagnostics.soundEnabled ? 'yes' : 'no'}</p>
              <p><span className="font-semibold">Needs re-arm:</span> {audioDiagnostics.needsRearm ? 'yes' : 'no'}</p>
              <p><span className="font-semibold">Last sound:</span> {audioDiagnostics.lastSoundPlayed}</p>
              <p><span className="font-semibold">Last event:</span> {audioDiagnostics.lastEvent}</p>
              <p><span className="font-semibold">Last error:</span> {audioDiagnostics.lastError}</p>
              <p><span className="font-semibold">Fallback:</span> {audioDiagnostics.lastFallbackUsed}</p>
            </div>
          ) : null}
        </div>

        {launching ? (
          <div className="launch-overlay absolute inset-0 flex flex-col items-center justify-center bg-indigo-950/85 text-white">
            <div className="launch-card rounded-3xl bg-white/10 px-9 py-7 text-center shadow-2xl ring-1 ring-white/25 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.25em] text-indigo-100">Get set</p>
              <p key={countdownText} className="launch-count mt-2 text-5xl font-black">{countdownText}</p>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section onPointerDown={() => { void sharedAudio.resumeForGesture('pointerdown'); }} className="space-y-2.5 rounded-3xl bg-gradient-to-b from-indigo-50 via-cyan-50 to-emerald-50 p-2.5 shadow-md ring-1 ring-indigo-100">
      <div className="flex items-center justify-between"><h1 className="text-lg font-bold text-slate-900">{activity?.title || 'Assignment Mode'}</h1></div>
      {!isTapBlankActivity ? <p className="text-xs text-slate-600">{status}</p> : null}

      {SHOW_AUDIO_DEBUG ? (
        <div className="rounded-xl bg-white/75 px-2 py-1.5 text-[11px] text-slate-700 ring-1 ring-slate-200">
          <p><span className="font-semibold">Sound enabled:</span> {audioDiagnostics.soundEnabled ? 'yes' : 'no'}</p>
          <p><span className="font-semibold">Needs re-arm:</span> {audioDiagnostics.needsRearm ? 'yes' : 'no'}</p>
          <p><span className="font-semibold">Last sound:</span> {audioDiagnostics.lastSoundPlayed}</p>
          <p><span className="font-semibold">Audio event:</span> {audioDiagnostics.lastEvent}</p>
          <p><span className="font-semibold">Last audio error:</span> {audioDiagnostics.lastError}</p>
          <p><span className="font-semibold">Fallback path used:</span> {audioDiagnostics.lastFallbackUsed}</p>
        </div>
      ) : null}

      {isTapBlankActivity ? (
        <TapFillBlankPlayer questions={tapBlankQuestions} onComplete={(finalScore, totalQuestions) => { void submitTapBlank(finalScore, totalQuestions); }} />
      ) : (
        <>
          <div className="flex items-center justify-between"><p className="text-sm text-slate-700">Student: <span className="font-semibold">{studentName}</span></p><button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-500" onClick={() => { void sharedAudio.resumeForGesture('submit-click'); void submit(); }}>Submit</button></div>
          <DndContext sensors={sensors} onDragStart={({ active }) => { setActiveDragId(String(active.id)); void sharedAudio.resumeForGesture('drag-start'); }} onDragEnd={({ active, over }) => { setActiveDragId(null); if (!over || over.id === 'answer-bank') return; void assignOption(String(active.id), String(over.id)); }}>
            <AnswerBank options={availableOptions} selectedOptionId={selectedOptionId} onSelect={(id) => { void sharedAudio.resumeForGesture('answer-select'); setSelectedOptionId(id); }} columns={columns} />
            <PromptGrid prompts={prompts} assignments={assignments} optionsById={optionsById} onTapAssign={(promptId) => { if (selectedOptionId) void assignOption(selectedOptionId, promptId); }} onClear={(promptId) => setAssignments((prev) => { const next = { ...prev }; delete next[promptId]; return next; })} columns={columns} />
            <DragOverlay>{activeDragId && optionsById[activeDragId] ? <div className={`rounded-2xl px-3 py-2 text-sm font-semibold text-white shadow-xl ${optionsById[activeDragId].colorClass}`}>{optionsById[activeDragId].answerText}</div> : null}</DragOverlay>
          </DndContext>
        </>
      )}
    </section>
  );
}
