import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { AnswerOption } from '../../types/models';

const WORDWALL_GRADIENTS = [
  'linear-gradient(135deg, #6ea8ff, #3b82f6)',
  'linear-gradient(135deg, #ff7a7a, #dc2626)',
  'linear-gradient(135deg, #ffb86b, #f97316)',
  'linear-gradient(135deg, #7ee7a8, #16a34a)'
] as const;

type ItemProps = { option: AnswerOption; index: number; selectedOptionId: string | null; onSelect: (id: string) => void };
function BankOption({ option, index, selectedOptionId, onSelect }: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: option.id });
  const gradient = WORDWALL_GRADIENTS[index % WORDWALL_GRADIENTS.length];
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    backgroundImage: gradient,
    borderRadius: '20px',
    minHeight: '120px',
    fontSize: 'clamp(24px, 3.2vw, 32px)',
    boxShadow: '0 6px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.4)'
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      onClick={() => onSelect(option.id)}
      {...listeners}
      {...attributes}
      className={`h-full w-full touch-none border-0 px-5 py-6 text-left font-black leading-tight text-white transition-all duration-150 ease-in-out hover:scale-[0.97] hover:brightness-95 active:scale-[0.97] active:brightness-95 ${selectedOptionId === option.id ? 'ring-4 ring-white/90' : 'ring-0'} ${isDragging ? 'opacity-50' : ''}`}
    >
      <span className="whitespace-normal break-words">{option.answerText}</span>
    </button>
  );
}

type Props = { options: AnswerOption[]; selectedOptionId: string | null; onSelect: (id: string) => void; columns: number };

export default function AnswerBank({ options, selectedOptionId, onSelect }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'answer-bank' });
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-600">Answer Bank</h2>
      <div
        ref={setNodeRef}
        style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gridAutoRows: '1fr' }}
        className={`grid gap-3 rounded-2xl border-2 border-dashed p-3 ${isOver ? 'border-emerald-400 bg-emerald-50' : 'border-indigo-200 bg-white/80'}`}
      >
        {options.map((option, index) => (
          <BankOption key={option.id} option={option} index={index} selectedOptionId={selectedOptionId} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}
