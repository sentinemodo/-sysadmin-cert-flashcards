/** IndexedDB / user state entities (overview.md §4). */

export type StudyExamMode = 'study' | 'exam';

/** SM-2 style scale or boolean correct (overview.md §4 Attempt). */
export type SelfGrade =
  | 'again'
  | 'hard'
  | 'good'
  | 'easy'
  | boolean;

export interface CardSchedulingState {
  cardId: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  /** Next show time (ms since epoch). */
  dueAt: number;
  lastReviewedAt: number;
  lapseCount?: number;
  suspended: boolean;
}

export interface Attempt {
  id: string;
  cardId: string;
  mode: StudyExamMode;
  /** ISO 8601 timestamp. */
  gradedAt: string;
  selfGrade: SelfGrade;
  examResultId: string | null;
  userAnswerText?: string;
}

export interface ExamResultPerCard {
  cardId: string;
  grade: SelfGrade;
  durationMs?: number;
}

export interface ExamResult {
  id: string;
  bookId: string;
  chapterId: string;
  startedAt: string;
  completedAt: string;
  questionCount: number;
  correctCount: number;
  incorrectCount: number;
  scoreRatio: number;
  perCard?: ExamResultPerCard[];
}
