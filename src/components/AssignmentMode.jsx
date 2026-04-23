import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import AnswerBank from './AnswerBank';
import PromptGrid from './PromptGrid';
import DraggableAnswer from './DraggableAnswer';
import { getActivity, saveSubmission } from '../lib/supabase';
import { sharedAudio } from '../lib/audio';

function shuffle(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export default function AssignmentMode({ activityId, columns }) {
  const [studentName, setStudentName] = useState('');
  const [activity, setActivity] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [options, setOptions] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [activeDragId, setActiveDragId] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState('Loading activity…');

  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getActivity(activityId);
        const nextPrompts = data.pairs.map((pair, i) => ({ id: `P${i}`, pairId: i, promptText: pair.left }));
        const nextOptions = shuffle(data.pairs.map((pair, i) => ({ id: `O${i}`, pairId: i, answerText: pair.right })));
        setActivity(data);
        setPrompts(nextPrompts);
        setOptions(nextOptions);
        setStatus('Ready');
      } catch (error) {
        setStatus(error.message || 'Failed to load activity');
      }
    };

    load();
  }, [activityId]);

  const optionsById = useMemo(() => Object.fromEntries(options.map((o) => [o.id, o])), [options]);

  const availableOptions = options.filter((option) => !Object.values(assignments).includes(option.id));

  const assignOption = async (optionId, promptId) => {
    setAssignments((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((existingPromptId) => {
        if (next[existingPromptId] === optionId) delete next[existingPromptId];
      });
      next[promptId] = optionId;
      return next;
    });
    setSelectedOptionId(null);
    await sharedAudio.play('place');
  };

  const onDragStart = ({ active }) => {
    setActiveDragId(active.id);
  };

  const onDragEnd = async ({ active, over }) => {
    setActiveDragId(null);
    if (!over) return;
    if (over.id === 'answer-bank') return;
    await assignOption(active.id, over.id);
  };

  const onTapAssign = async (promptId) => {
    if (!selectedOptionId) return;
    await assignOption(selectedOptionId, promptId);
  };

  const onClear = (promptId) => {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[promptId];
      return next;
    });
  };

  const submit = async () => {
    setAttempts((prev) => prev + 1);
    if (Object.keys(assignments).length !== prompts.length) {
      await sharedAudio.play('wrong');
      setStatus('Assign every prompt before submit');
      return;
    }

    let correct = 0;
    prompts.forEach((prompt) => {
      const optionId = assignments[prompt.id];
      const option = optionsById[optionId];
      if (option?.pairId === prompt.pairId) correct += 1;
    });

    const payload = {
      activity_id: activityId,
      student_name: studentName || 'Student',
      score: correct,
      total: prompts.length,
      attempts: attempts + 1,
      duration_seconds: 0,
    };

    try {
      await saveSubmission(payload);
      await sharedAudio.play(correct === prompts.length ? 'correct' : 'wrong');
      setStatus(`Submitted: ${correct}/${prompts.length}`);
    } catch (error) {
      setStatus(error.message || 'Submit failed');
    }
  };

  const activeOption = activeDragId ? optionsById[activeDragId] : null;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-panel p-3" style={{ '--col-count': columns }}>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-base font-semibold">{activity?.title || 'Assignment Mode'}</h1>
        <button className="rounded-md border border-slate-700 px-2 py-1 text-xs" onClick={() => sharedAudio.unlock()} type="button">Enable sound</button>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <label className="text-xs text-slate-400">
          Student
          <input
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
            value={studentName}
            onChange={(event) => setStudentName(event.target.value)}
          />
        </label>
        <button className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold" onClick={submit}>Submit</button>
      </div>

      <p className="text-xs text-slate-400">{status}</p>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <AnswerBank options={availableOptions} selectedOptionId={selectedOptionId} onSelect={setSelectedOptionId} />
        <div className="pt-1">
          <PromptGrid
            prompts={prompts}
            assignments={assignments}
            optionsById={optionsById}
            onTapAssign={onTapAssign}
            onClear={onClear}
          />
        </div>
        <DragOverlay>{activeOption ? <DraggableAnswer option={activeOption} /> : null}</DragOverlay>
      </DndContext>
    </section>
  );
}
