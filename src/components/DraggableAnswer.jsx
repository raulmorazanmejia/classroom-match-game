import { useDraggable } from '@dnd-kit/core';

export default function DraggableAnswer({ option }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: option.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`touch-none rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm ${isDragging ? 'opacity-60' : ''}`}
    >
      {option.answerText}
    </div>
  );
}
