import { describe, expect, it } from 'vitest';
import type { Card } from '../types/content';
import type { CardSchedulingState } from '../types/runtime';
import {
  applyReview,
  applyReviewForExam,
  DAY_MS,
  drawExamCards,
  initialSchedulingState,
  isPassingGrade,
  MAX_INTERVAL_DAYS,
  nextEaseFactor,
  nextStudyCard,
  selfGradeToQuality,
} from './scheduling';

function fixedRng(values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i] ?? 0.5;
    i += 1;
    return v;
  };
}

const card = (id: string): Card => ({
  id,
  bookId: 'b1',
  chapterId: 'c1',
  question: 'q',
  goodAnswer: 'a',
  docLinks: [],
});

describe('selfGradeToQuality', () => {
  it('maps string grades', () => {
    expect(selfGradeToQuality('again')).toBe(0);
    expect(selfGradeToQuality('hard')).toBe(2);
    expect(selfGradeToQuality('good')).toBe(4);
    expect(selfGradeToQuality('easy')).toBe(5);
  });
  it('maps boolean', () => {
    expect(selfGradeToQuality(true)).toBe(4);
    expect(selfGradeToQuality(false)).toBe(0);
  });
});

describe('isPassingGrade', () => {
  it('uses threshold 3', () => {
    expect(isPassingGrade(2)).toBe(false);
    expect(isPassingGrade(3)).toBe(true);
  });
});

describe('nextEaseFactor', () => {
  it('clamps to bounds', () => {
    expect(nextEaseFactor(2.5, 0)).toBeGreaterThanOrEqual(1.3);
    expect(nextEaseFactor(2.5, 5)).toBeLessThanOrEqual(3.0);
  });
});

describe('applyReview', () => {
  const now = 1_700_000_000_000;
  const rng = fixedRng([0.5]);

  it('failed review resets repetitions and shortens interval', () => {
    const s: CardSchedulingState = {
      cardId: 'a',
      easeFactor: 2.5,
      intervalDays: 10,
      repetitions: 3,
      dueAt: now,
      lastReviewedAt: now - DAY_MS,
      suspended: false,
    };
    const next = applyReview(s, 0, now, rng);
    expect(next.repetitions).toBe(0);
    expect(next.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
    expect(next.dueAt).toBeGreaterThan(now);
  });

  it('first success uses ~1 day interval (with jitter center)', () => {
    const s = initialSchedulingState('a', now);
    const next = applyReview(s, 4, now, fixedRng([0.5]));
    expect(next.repetitions).toBe(1);
    expect(next.intervalDays).toBeGreaterThan(0);
    expect(next.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
  });

  it('respects max interval cap', () => {
    const s: CardSchedulingState = {
      cardId: 'a',
      easeFactor: 3,
      intervalDays: 200,
      repetitions: 5,
      dueAt: now,
      lastReviewedAt: now - DAY_MS,
      suspended: false,
    };
    const next = applyReview(s, 5, now, fixedRng([0.5]), {
      maxIntervalDays: 180,
      jitter: 0,
    });
    expect(next.intervalDays).toBeLessThanOrEqual(180);
  });
});

describe('applyReviewForExam', () => {
  const now = 1_700_000_000_000;

  it('never increases interval beyond study when cap applies (exam <= study)', () => {
    const s: CardSchedulingState = {
      cardId: 'a',
      easeFactor: 2.5,
      intervalDays: 5,
      repetitions: 4,
      dueAt: now,
      lastReviewedAt: now - DAY_MS,
      suspended: false,
    };
    const study = applyReview(s, 5, now, () => 0.5);
    const exam = applyReviewForExam(s, 5, now, () => 0.5);
    expect(exam.intervalDays).toBeLessThanOrEqual(study.intervalDays);
  });
});

describe('nextStudyCard', () => {
  const cards = [card('1'), card('2'), card('3')];
  const now = 1_000_000;

  it('returns null when none due', () => {
    const map = new Map<string, CardSchedulingState>();
    for (const c of cards) {
      map.set(c.id, {
        cardId: c.id,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        dueAt: now + DAY_MS,
        lastReviewedAt: 0,
        suspended: false,
      });
    }
    expect(nextStudyCard(cards, map, now, { includeNotDue: false, poolSize: 20 }, () => 0)).toBeNull();
  });

  it('includes not due when flag set', () => {
    const map = new Map<string, CardSchedulingState>();
    for (const c of cards) {
      map.set(c.id, {
        cardId: c.id,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 0,
        dueAt: now + DAY_MS,
        lastReviewedAt: 0,
        suspended: false,
      });
    }
    const pick = nextStudyCard(cards, map, now, { includeNotDue: true, poolSize: 20 }, () => 0);
    expect(pick).not.toBeNull();
  });

  it('picks earliest due first when rng=0', () => {
    const map = new Map<string, CardSchedulingState>();
    map.set('1', {
      cardId: '1',
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueAt: now - 1000,
      lastReviewedAt: 0,
      suspended: false,
    });
    map.set('2', {
      cardId: '2',
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueAt: now - 500,
      lastReviewedAt: 0,
      suspended: false,
    });
    map.set('3', {
      cardId: '3',
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      dueAt: now,
      lastReviewedAt: 0,
      suspended: false,
    });
    const pick = nextStudyCard(cards, map, now, { includeNotDue: false, poolSize: 20 }, () => 0);
    expect(pick?.id).toBe('1');
  });
});

describe('drawExamCards', () => {
  const cards = [card('a'), card('b'), card('c')];

  it('returns at most n cards', () => {
    expect(drawExamCards(cards, 2, () => 0).length).toBe(2);
    expect(drawExamCards(cards, 10, () => 0).length).toBe(3);
  });
});

describe('initialSchedulingState', () => {
  it('marks due now', () => {
    const now = 5_000;
    const s = initialSchedulingState('x', now);
    expect(s.dueAt).toBe(now);
    expect(s.repetitions).toBe(0);
  });
});
