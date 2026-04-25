import { useEffect, useMemo, useState } from 'react';
import { sharedAudio } from '../../lib/audio.ts';
import type { TapBlankQuestion } from '../../types/models';

const ADVANCE_DELAY_MS = 800;
const TRANSITION_MS = 170;

const TILE_GRADIENTS = [
  'from-sky-500 to-blue-600',
  'from-rose-500 to-red-600',
  'from-orange-400 to-amber-500',
  'from-emerald-500 to-green-600'
];

function withVisibleBlank(sentence: string): string {
  return sentence.includes('______') ? sentence : `${sentence} ______`;
}

function sentenceParts(sentence: string) {
  const normalized = withVisibleBlank(sentence);
  const [before, after] = normalized.split('______');
  return { before: before ?? '', after: after ?? '' };
}

type Props = {
  questions: TapBlankQuestion[];
  onComplete?: (score: number, total: number) => void;
};

export default function TapFillBlankPlayer({ questions, onComplete }: Props) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const total = questions.length;
  const currentQuestion = questions[currentQuestionIndex];

  const correctIndex = currentQuestion?.correctIndex ?? -1;

  const selectedIsCorrect = selectedAnswer != null && selectedAnswer === correctIndex;

  const progressText = useMemo(() => `${Math.min(currentQuestionIndex + 1, total)} of ${total}`, [currentQuestionIndex, total]);

  useEffect(() => {
    if (!isComplete || !total) return;
    void sharedAudio.play('complete');
    onComplete?.(score, total);
  }, [isComplete, total, onComplete, score]);

  const reset = async () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsLocked(false);
    setScore(0);
    setIsComplete(false);
    setIsTransitioning(false);
    await sharedAudio.play('start');
  };

  const moveToNext = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= total) {
      setIsComplete(true);
      return;
    }

    setIsTransitioning(true);
    window.setTimeout(() => {
      setCurrentQuestionIndex(nextIndex);
      setSelectedAnswer(null);
      setIsLocked(false);
      setIsTransitioning(false);
    }, TRANSITION_MS);
  };

  const onTapAnswer = async (optionIndex: number) => {
    if (isLocked || isComplete || !currentQuestion) return;

    setIsLocked(true);
    setSelectedAnswer(optionIndex);
    await sharedAudio.play('place');

    const isCorrect = optionIndex === correctIndex;
    if (isCorrect) {
      setScore((prev) => prev + 1);
      await sharedAudio.play('correct');
    } else {
      await sharedAudio.play('wrong');
    }

    window.setTimeout(moveToNext, ADVANCE_DELAY_MS);
  };

  if (!total) {
    return (
      <section className="rounded-3xl bg-white p-4 text-center text-slate-600 shadow-md ring-1 ring-indigo-100">
        No tap fill-in-the-blank questions available.
      </section>
    );
  }

  if (isComplete) {
    return (
      <section className="mx-auto flex min-h-[70dvh] w-full max-w-2xl flex-col items-center justify-center rounded-3xl bg-white p-6 text-center shadow-lg ring-1 ring-indigo-100">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">Activity Complete</p>
        <h2 className="mt-2 text-4xl font-black text-slate-900">Great Job!</h2>
        <p className="mt-4 text-2xl font-bold text-slate-700">Score: {score} / {total}</p>
        <button
          onClick={() => { void reset(); }}
          className="mt-6 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 px-8 py-4 text-xl font-bold text-white shadow-lg shadow-indigo-200"
        >
          Restart
        </button>
      </section>
    );
  }

  const { before, after } = sentenceParts(currentQuestion.sentence);

  return (
    <section className="mx-auto flex min-h-[70dvh] w-full max-w-3xl touch-manipulation flex-col gap-5 overflow-hidden rounded-3xl bg-white p-4 shadow-md ring-1 ring-indigo-100 sm:p-6">
      <header className={`tap-blank-question transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        <p className="text-center text-[clamp(1.75rem,6.2vw,2.25rem)] font-black leading-tight text-slate-900">
          {before}
          <span className="tap-blank-blank mx-2 inline-block rounded-lg px-2 py-1 text-indigo-700">______</span>
          {after}
        </p>
      </header>

      {currentQuestion.imageUrl ? (
        <div className={`tap-blank-question mx-auto w-full max-w-lg overflow-hidden rounded-2xl bg-slate-100 transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          <img src={currentQuestion.imageUrl} alt="Question hint" className="h-[180px] w-full object-cover sm:h-[220px]" loading="lazy" />
        </div>
      ) : null}

      <div className={`tap-blank-question grid flex-1 grid-cols-2 gap-3 transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {currentQuestion.options.map((option, optionIndex) => {
          const isSelected = selectedAnswer === optionIndex;
          const isCorrectOption = optionIndex === correctIndex;

          let stateClass = 'ring-0';
          if (selectedAnswer != null) {
            if (isCorrectOption) stateClass = 'tap-option-correct';
            else if (isSelected && !selectedIsCorrect) stateClass = 'tap-option-wrong';
            else stateClass = 'opacity-70';
          }

          return (
            <button
              key={option}
              type="button"
              disabled={isLocked}
              onClick={() => { void onTapAnswer(optionIndex); }}
              className={`tap-option relative min-h-[110px] rounded-[20px] bg-gradient-to-br ${TILE_GRADIENTS[optionIndex % TILE_GRADIENTS.length]} px-3 py-4 text-center text-[clamp(1.25rem,5.4vw,1.8rem)] font-black text-white shadow-lg shadow-slate-300/40 transition duration-150 active:scale-[0.97] ${stateClass}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      <footer className="flex items-center justify-center">
        <p className="rounded-full bg-indigo-50 px-4 py-2 text-base font-bold text-indigo-700 ring-1 ring-indigo-100">{progressText}</p>
      </footer>
    </section>
  );
}
