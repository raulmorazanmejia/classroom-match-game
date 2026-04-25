import { useEffect, useMemo, useState } from 'react';
import { sharedAudio } from '../../lib/audio.ts';
import type { TapBlankQuestion } from '../../types/models';

const CORRECT_ADVANCE_DELAY_MS = 700;
const WRONG_ADVANCE_DELAY_MS = 1050;
const CORRECT_FEEDBACK_MS = 350;
const WRONG_FEEDBACK_MS = 400;
const MICRO_DELAY_MS = 120;
const NEXT_QUESTION_TRANSITION_MS = 260;

const TILE_GRADIENTS = [
  'from-sky-500 to-blue-600',
  'from-fuchsia-500 to-violet-600',
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

type OptionState = 'default' | 'correct' | 'wrong' | 'dimmed';

function getOptionState(params: {
  optionIndex: number;
  selectedAnswer: number | null;
  correctIndex: number;
  selectedIsCorrect: boolean;
  revealCorrect: boolean;
}): OptionState {
  const { optionIndex, selectedAnswer, correctIndex, selectedIsCorrect, revealCorrect } = params;
  if (selectedAnswer == null) return 'default';
  if (optionIndex === correctIndex && (selectedIsCorrect || revealCorrect)) return 'correct';
  if (optionIndex === selectedAnswer && !selectedIsCorrect) return 'wrong';
  return 'dimmed';
}

function feedbackMessage(scoreRatio: number): string {
  if (scoreRatio >= 0.9) return 'Excellent work!';
  if (scoreRatio >= 0.7) return 'Good job!';
  return 'Try again';
}

export default function TapFillBlankPlayer({ questions, onComplete }: Props) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [feedbackTone, setFeedbackTone] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [revealCorrect, setRevealCorrect] = useState(false);

  const total = questions.length;
  const currentQuestion = questions[currentQuestionIndex];
  const correctIndex = currentQuestion?.correctIndex ?? -1;
  const selectedIsCorrect = selectedAnswer != null && selectedAnswer === correctIndex;

  const progressText = useMemo(() => `${Math.min(currentQuestionIndex + 1, total)} / ${total}`, [currentQuestionIndex, total]);
  const progressPercent = useMemo(() => {
    if (!total) return 0;
    return (Math.min(currentQuestionIndex + 1, total) / total) * 100;
  }, [currentQuestionIndex, total]);

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
    setFeedbackTone('idle');
    setRevealCorrect(false);
    await sharedAudio.play('start');
  };

  const moveToNext = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= total) {
      setIsComplete(true);
      return;
    }

    setIsTransitioning(true);
    window.setTimeout(
      () => {
        setCurrentQuestionIndex(nextIndex);
        setSelectedAnswer(null);
        setIsLocked(false);
        setFeedbackTone('idle');
        setRevealCorrect(false);
        setIsTransitioning(false);
      },
      NEXT_QUESTION_TRANSITION_MS
    );
  };

  const onTapAnswer = async (optionIndex: number) => {
    if (isLocked || isComplete || !currentQuestion) return;

    setIsLocked(true);
    setSelectedAnswer(optionIndex);
    await sharedAudio.play('tap');

    const isCorrect = optionIndex === correctIndex;
    if (isCorrect) {
      setScore((prev) => prev + 1);
      setFeedbackTone('correct');
      await sharedAudio.play('correct');
      window.setTimeout(() => {
        setFeedbackTone('idle');
      }, CORRECT_FEEDBACK_MS);
      window.setTimeout(moveToNext, CORRECT_ADVANCE_DELAY_MS + MICRO_DELAY_MS);
    } else {
      setFeedbackTone('wrong');
      setRevealCorrect(false);
      await sharedAudio.play('wrong');
      window.setTimeout(() => {
        setRevealCorrect(true);
      }, 110);
      window.setTimeout(() => {
        setFeedbackTone('idle');
      }, WRONG_FEEDBACK_MS);
      window.setTimeout(moveToNext, WRONG_ADVANCE_DELAY_MS + MICRO_DELAY_MS);
    }
  };

  if (!total) {
    return (
      <section className="rounded-3xl bg-white p-4 text-center text-slate-600 shadow-md ring-1 ring-indigo-100">
        No tap fill-in-the-blank questions available.
      </section>
    );
  }

  if (isComplete) {
    const scoreRatio = score / total;
    return (
      <section className="relative mx-auto flex min-h-[72dvh] w-full max-w-2xl flex-col items-center justify-center overflow-hidden rounded-3xl bg-white p-6 text-center shadow-lg ring-1 ring-indigo-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.13),transparent_52%),radial-gradient(circle_at_80%_80%,rgba(52,211,153,0.12),transparent_54%)]" aria-hidden />
        <div className="tap-confetti" aria-hidden>
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="tap-complete-check" aria-hidden>
          <svg viewBox="0 0 52 52" className="h-16 w-16">
            <circle cx="26" cy="26" r="24" fill="none" className="tap-complete-check-ring" />
            <path d="M14 27.5l8.1 8.2L38 19.8" fill="none" className="tap-complete-check-mark" />
          </svg>
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-500">Activity Complete</p>
        <h2 className="mt-3 bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-4xl font-black text-transparent">Nice run!</h2>
        <p className="mt-4 text-5xl font-black text-slate-900">{score} / {total}</p>
        <p className="mt-2 text-lg font-semibold text-slate-600">{feedbackMessage(scoreRatio)}</p>
        <button
          onClick={() => { void reset(); }}
          className="mt-7 min-h-[56px] rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 px-10 py-3 text-xl font-bold text-white shadow-lg shadow-indigo-200"
        >
          Play Again
        </button>
      </section>
    );
  }

  const { before, after } = sentenceParts(currentQuestion.sentence);

  return (
    <section className="relative mx-auto flex min-h-[72dvh] w-full max-w-3xl touch-manipulation flex-col gap-4 overflow-hidden rounded-3xl bg-white p-3 shadow-md ring-1 ring-indigo-100 sm:gap-5 sm:p-5">
      <div className="tap-blank-atmosphere absolute inset-0 pointer-events-none" aria-hidden />
      <header className="flex items-center justify-between gap-2">
        <p className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700 ring-1 ring-indigo-100">Question {progressText}</p>
        {feedbackTone === 'wrong' && selectedAnswer != null ? (
          <p className="text-sm font-semibold text-rose-600">Correct: {currentQuestion.options[correctIndex]}</p>
        ) : (
          <p className="text-sm font-semibold text-slate-500">Tap the best answer</p>
        )}
      </header>
      <div className="relative">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-indigo-100 ring-1 ring-indigo-100">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="mt-1.5 text-right text-xs font-semibold text-slate-500">{progressText}</p>
      </div>

      <div className={`tap-blank-question relative rounded-2xl bg-slate-50/90 px-3 py-3 transition-all duration-300 ${isTransitioning ? 'scale-[0.98] opacity-0' : 'scale-100 opacity-100'}`}>
        <p className="text-center text-[clamp(1.5rem,6.2vw,2.25rem)] font-black leading-tight text-slate-900">
          {before}
          <span className="tap-blank-blank mx-2 inline-block rounded-lg px-2 py-1 text-indigo-700">______</span>
          {after}
        </p>
      </div>

      {currentQuestion.imageUrl ? (
        <div className={`tap-blank-question mx-auto w-full max-w-lg overflow-hidden rounded-2xl bg-slate-100 transition-all duration-300 ${isTransitioning ? 'scale-[0.98] opacity-0' : 'scale-100 opacity-100'}`}>
          <img src={currentQuestion.imageUrl} alt="Question hint" className="mx-auto h-auto max-h-[22dvh] w-full object-contain" loading="lazy" />
        </div>
      ) : null}

      <div className={`tap-blank-question grid flex-1 grid-cols-2 gap-3 transition-all duration-300 sm:gap-4 ${isTransitioning ? 'scale-[0.98] opacity-0' : 'scale-100 opacity-100'}`}>
        {currentQuestion.options.map((option, optionIndex) => {
          const optionState = getOptionState({
            optionIndex,
            selectedAnswer,
            correctIndex,
            selectedIsCorrect,
            revealCorrect
          });

          const stateClass = {
            default: 'ring-0',
            correct: 'tap-option-correct',
            wrong: 'tap-option-wrong',
            dimmed: 'opacity-65'
          }[optionState];

          return (
            <button
              key={option}
              type="button"
              disabled={isLocked}
              onClick={() => { void onTapAnswer(optionIndex); }}
              className={`tap-option relative isolate flex min-h-[102px] items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-b ${TILE_GRADIENTS[optionIndex % TILE_GRADIENTS.length]} px-3 py-3 text-center text-[clamp(1.1rem,4.7vw,1.45rem)] font-black leading-tight text-white transition duration-200 active:scale-[0.96] ${stateClass}`}
            >
              <span className="tap-option-ripple" aria-hidden />
              <span className="max-h-[3.1em] overflow-hidden break-words">{option}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
