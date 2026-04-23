import { useDroppable } from '@dnd-kit/core';

function PromptSlot({ prompt, assignedOption, isOver, onTapAssign, onClear }) {
  return (
    <div
      className={`min-h-20 rounded-lg border p-2 ${isOver ? 'border-amber-300 bg-amber-500/10' : 'border-slate-700 bg-slate-900'}`}
      onClick={onTapAssign}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onTapAssign();
        }
      }}
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">{prompt.promptText}</p>
      {assignedOption ? (
        <button
          className="w-full rounded-md border border-emerald-500/60 bg-emerald-500/10 px-2 py-1 text-left text-sm text-emerald-100"
          onClick={(event) => {
            event.stopPropagation();
            onClear();
          }}
        >
          {assignedOption.answerText}
        </button>
      ) : (
        <p className="text-xs text-slate-500">Drop or tap to assign</p>
      )}
    </div>
  );
}

function DroppablePrompt({ prompt, assignedOption, onTapAssign, onClear }) {
  const { setNodeRef, isOver } = useDroppable({ id: prompt.id });
  return (
    <div ref={setNodeRef}>
      <PromptSlot
        prompt={prompt}
        assignedOption={assignedOption}
        isOver={isOver}
        onTapAssign={onTapAssign}
        onClear={onClear}
      />
    </div>
  );
}

export default function PromptGrid({ prompts, assignments, optionsById, onTapAssign, onClear }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Prompts</h2>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(var(--col-count), minmax(0, 1fr))' }}>
        {prompts.map((prompt) => {
          const optionId = assignments[prompt.id];
          const assignedOption = optionId ? optionsById[optionId] : null;
          return (
            <DroppablePrompt
              key={prompt.id}
              prompt={prompt}
              assignedOption={assignedOption}
              onTapAssign={() => onTapAssign(prompt.id)}
              onClear={() => onClear(prompt.id)}
            />
          );
        })}
      </div>
    </section>
  );
}
