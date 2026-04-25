import type { TapBlankQuestion } from '../../types/models';

export const SAMPLE_TAP_BLANK_QUESTIONS: TapBlankQuestion[] = [
  {
    id: 'tb-1',
    sentence: '______ is here yet. They will come later.',
    options: ['Nobody', 'Anybody', 'Everybody', 'Somebody'],
    correctIndex: 0,
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'tb-2',
    sentence: 'My sister ______ to school by bus every day.',
    options: ['go', 'goes', 'going', 'gone'],
    correctIndex: 1,
    imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'tb-3',
    sentence: 'Can you pass me the ______ book on the table?',
    options: ['red', 'read', 'ride', 'road'],
    correctIndex: 0,
    imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'tb-4',
    sentence: 'We ______ dinner before we watched the movie.',
    options: ['eat', 'eaten', 'ate', 'eating'],
    correctIndex: 2,
    imageUrl: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'tb-5',
    sentence: 'The test was hard, ______ I still finished on time.',
    options: ['but', 'because', 'or', 'if'],
    correctIndex: 0,
    imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80'
  }
];
