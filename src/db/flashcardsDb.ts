import Dexie, { type Table } from 'dexie';
import type { Attempt, CardSchedulingState, ExamResult } from '../types/runtime';

/** Versioned DB name; bump when schema changes (overview.md §4). */
export const DB_NAME = 'sysadmin-cert-flashcards';

/**
 * IndexedDB stores for user state (overview.md §4 — CardSchedulingState, Attempt, ExamResult).
 * TODO(architecture): migrations when adding Session store or new indexes.
 */
export class FlashcardsDB extends Dexie {
  cardSchedulingState!: Table<CardSchedulingState, string>;
  attempts!: Table<Attempt, string>;
  examResults!: Table<ExamResult, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      cardSchedulingState: 'cardId, dueAt, suspended',
      attempts: 'id, cardId, gradedAt, examResultId, mode',
      examResults: 'id, bookId, chapterId, completedAt',
    });
  }
}

export const db = new FlashcardsDB();
