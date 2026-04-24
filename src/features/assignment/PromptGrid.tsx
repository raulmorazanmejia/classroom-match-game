import { useDroppable } from '@dnd-kit/core';
import type { AnswerOption, PromptItem } from '../../types/models';

type SlotProps = {
  prompt: PromptItem;
  assignedOption: AnswerOption | null;
  isOver: boolean;
  onTapAssign: () => void;
  onClear: () => void;
};

function PromptSlot({ prompt, assignedOption, isOver, onTapAssign, onClear }: SlotProps) {
  return (
    <div onClick={onTapAssign} className={`min-h-24 rounded-2xl border-2 p-2.5 transition ${isOver ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{prompt.promptText}</p>
      {assignedOption ? (
        <button type="button" onClick={(e) => { e.stopPropagation(); onClear(); }} className={`mt-2 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-white shadow-sm ${assignedOption.colorClass}`}>
          <span className="whitespace-normal break-words">{assignedOption.answerText}</span>
        </button>
      ) : (
        <p className="mt-2 text-sm text-slate-400">Drop or tap to assign</p>
      )}
    </div>
  );
}

export default function PromptGrid({ prompts, assignments, optionsById, onTapAssign, onClear, columns }: {
  prompts: PromptItem[]; assignments: Record<string, string>; optionsById: Record<string, AnswerOption>; onTapAssign: (promptId: string) => void; onClear: (promptId: string) => void; columns: number;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-600">Prompt Grid</h2>
      <div style={{ gridTemplateColumns: `repeat(${columns},minmax(0,1fr))` }} className="grid gap-2">
        {prompts.map((prompt) => {
          const optionId = assignments[prompt.id];
          const assignedOption = optionId ? optionsById[optionId] : null;
          return <DroppablePrompt key={prompt.id} prompt={prompt} assignedOption={assignedOption} onTapAssign={() => onTapAssign(prompt.id)} onClear={() => onClear(prompt.id)} />;
        })}
      </div>
    </section>
  );
}

function DroppablePrompt({ prompt, assignedOption, onTapAssign, onClear }: { prompt: PromptItem; assignedOption: AnswerOption | null; onTapAssign: () => void; onClear: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: prompt.id });
  return <div ref={setNodeRef}><PromptSlot prompt={prompt} assignedOption={assignedOption} isOver={isOver} onTapAssign={onTapAssign} onClear={onClear} /></div>;
}
