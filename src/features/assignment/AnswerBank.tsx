import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { AnswerOption } from '../../types/models';

type ItemProps = { option: AnswerOption; selectedOptionId: string | null; onSelect: (id: string) => void };
function BankOption({ option, selectedOptionId, onSelect }: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: option.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <button ref={setNodeRef} style={style} type="button" onClick={() => onSelect(option.id)} {...listeners} {...attributes}
      className={`min-h-16 touch-none rounded-2xl px-3 py-2 text-left text-sm font-semibold text-white shadow-md transition ${option.colorClass} ${selectedOptionId === option.id ? 'ring-4 ring-amber-200' : 'ring-0'} ${isDragging ? 'opacity-50' : ''}`}>
      <span className="whitespace-normal break-words">{option.answerText}</span>
    </button>
  );
}

type Props = { options: AnswerOption[]; selectedOptionId: string | null; onSelect: (id: string) => void; columns: number };

export default function AnswerBank({ options, selectedOptionId, onSelect, columns }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'answer-bank' });
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-600">Answer Bank</h2>
      <div ref={setNodeRef} style={{ gridTemplateColumns: `repeat(${columns},minmax(0,1fr))` }}
        className={`grid gap-2 rounded-2xl border-2 border-dashed p-2 ${isOver ? 'border-emerald-400 bg-emerald-50' : 'border-indigo-200 bg-white/80'}`}>
        {options.map((option) => <BankOption key={option.id} option={option} selectedOptionId={selectedOptionId} onSelect={onSelect} />)}
      </div>
    </section>
  );
}
