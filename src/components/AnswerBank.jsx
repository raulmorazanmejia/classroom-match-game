import { useDraggable, useDroppable } from '@dnd-kit/core';

function BankOption({ option, selectedOptionId, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: option.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      className={`min-h-14 touch-none rounded-lg border px-2 py-1 text-left text-sm transition ${
        selectedOptionId === option.id
          ? 'border-sky-300 bg-sky-500/20 text-sky-100'
          : 'border-slate-700 bg-slate-800 text-slate-100 active:scale-[0.99]'
      } ${isDragging ? 'opacity-60' : ''}`}
      onClick={() => onSelect(option.id)}
      {...listeners}
      {...attributes}
    >
      {option.answerText}
    </button>
  );
}

export default function AnswerBank({ options, selectedOptionId, onSelect }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'answer-bank' });

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Answer Bank</h2>
      <div
        ref={setNodeRef}
        className={`grid gap-2 rounded-xl border p-2 ${isOver ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/80'}`}
        style={{ gridTemplateColumns: 'repeat(var(--col-count), minmax(0, 1fr))' }}
      >
        {options.map((option) => (
          <BankOption key={option.id} option={option} selectedOptionId={selectedOptionId} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}
