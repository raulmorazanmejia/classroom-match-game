export type Pair = { left: string; right: string };

export type TapBlankQuestion = {
  id: string;
  sentence: string;
  imageUrl?: string;
  options: [string, string, string, string] | string[];
  correctIndex: number;
};

export type ActivityType = 'match' | 'tap-blank';

export type Activity = {
  id: string;
  title: string;
  teacher_name?: string;
  teacher_password?: string;
  pairs: Pair[];
  created_at: string;
  activity_type?: ActivityType;
  tap_blank_questions?: TapBlankQuestion[];
};

export type Submission = { id?: string; activity_id: string; student_name: string; score: number; total: number; attempts: number; duration_seconds: number; created_at?: string };
export type PromptItem = { id: string; pairId: number; promptText: string };
export type AnswerOption = { id: string; pairId: number; answerText: string; colorClass: string };
export type TeacherSession = { teacherName: string; loggedIn: boolean; teacherPassword: string };
