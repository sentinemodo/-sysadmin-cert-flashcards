/**
 * SM-2-inspired scheduling (overview.md §5). Pure functions; inject rng for jitter tests.
 */
import type { Card } from '../types/content';
import type { CardSchedulingState, SelfGrade } from '../types/runtime';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;
/** Cap maximum interval after jitter (days). */
export const MAX_INTERVAL_DAYS = 180;
/** Jitter ± this fraction of interval (e.g. 0.15 = ±15%). */
export const INTERVAL_JITTER = 0.15;
/** After failed review, due in this many days (same-day-ish minimum). */
export const RELEARN_INTERVAL_DAYS = 1;
/** Exam: do not more than multiply interval by this in one exam pass (overview §5). */
export const EXAM_INTERVAL_JUMP_CAP = 2;
export const EXAM_MIN_INTERVAL_AFTER_PASS_DAYS = 7;

export interface SchedulingOpts {
  maxIntervalDays: number;
  jitter: number;
}

export const defaultSchedulingOpts: SchedulingOpts = {
  maxIntervalDays: MAX_INTERVAL_DAYS,
  jitter: INTERVAL_JITTER,
};

export function selfGradeToQuality(g: SelfGrade): number {
  if (typeof g === 'boolean') return g ? 4 : 0;
  switch (g) {
    case 'again':
      return 0;
    case 'hard':
      return 2;
    case 'good':
      return 4;
    case 'easy':
      return 5;
    default:
      return 0;
  }
}

export function isPassingGrade(q: number): boolean {
  return q >= 3;
}

function clampEase(ef: number): number {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, ef));
}

/** SM-2 ease update after quality q in 0..5 */
export function nextEaseFactor(current: number, q: number): number {
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  return clampEase(current + delta);
}

function applyJitter(intervalDays: number, rng: () => number, jitter: number): number {
  const factor = 1 + (rng() * 2 - 1) * jitter;
  const out = intervalDays * factor;
  return Math.max(RELEARN_INTERVAL_DAYS / 24, out);
}

function capInterval(intervalDays: number, maxDays: number): number {
  return Math.min(intervalDays, maxDays);
}

/**
 * Next scheduling state after a study review.
 */
export function applyReview(
  state: CardSchedulingState,
  q: number,
  nowMs: number,
  rng: () => number,
  opts: SchedulingOpts = defaultSchedulingOpts,
): CardSchedulingState {
  let easeFactor = state.easeFactor;
  let repetitions = state.repetitions;
  let intervalDays: number;

  if (q < 3) {
    repetitions = 0;
    easeFactor = clampEase(easeFactor - 0.2);
    intervalDays = RELEARN_INTERVAL_DAYS;
  } else {
    easeFactor = nextEaseFactor(easeFactor, q);
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.max(1, Math.round(state.intervalDays * easeFactor));
    }
    repetitions += 1;
  }

  intervalDays = applyJitter(intervalDays, rng, opts.jitter);
  intervalDays = capInterval(intervalDays, opts.maxIntervalDays);

  const dueAt = nowMs + intervalDays * DAY_MS;

  return {
    cardId: state.cardId,
    easeFactor,
    intervalDays,
    repetitions,
    dueAt,
    lastReviewedAt: nowMs,
    lapseCount: q < 3 ? (state.lapseCount ?? 0) + 1 : (state.lapseCount ?? 0),
    suspended: state.suspended,
  };
}

/**
 * Same as study, but limits how far interval can jump in one step (exam self-grade).
 */
export function applyReviewForExam(
  state: CardSchedulingState,
  q: number,
  nowMs: number,
  rng: () => number,
  opts: SchedulingOpts = defaultSchedulingOpts,
): CardSchedulingState {
  const studyNext = applyReview(state, q, nowMs, rng, opts);
  if (q < 3) return studyNext;

  const prevInterval = state.intervalDays > 0 ? state.intervalDays : 1;
  const maxAllowed = Math.max(
    prevInterval * EXAM_INTERVAL_JUMP_CAP,
    EXAM_MIN_INTERVAL_AFTER_PASS_DAYS,
  );
  if (studyNext.intervalDays <= maxAllowed) return studyNext;

  let intervalDays = applyJitter(maxAllowed, rng, opts.jitter);
  intervalDays = capInterval(intervalDays, opts.maxIntervalDays);

  return {
    ...studyNext,
    intervalDays,
    dueAt: nowMs + intervalDays * DAY_MS,
  };
}

export interface NextStudyOpts {
  includeNotDue: boolean;
  /** Breadth pool before random pick (overview §5). */
  poolSize: number;
}

export const defaultNextStudyOpts: NextStudyOpts = {
  includeNotDue: false,
  poolSize: 20,
};

export function nextStudyCard(
  cards: Card[],
  stateById: Map<string, CardSchedulingState>,
  nowMs: number,
  opts: NextStudyOpts = defaultNextStudyOpts,
  rng: () => number = Math.random,
): Card | null {
  const candidates: Card[] = [];
  for (const card of cards) {
    const s = stateById.get(card.id);
    if (!s || s.suspended) continue;
    if (!opts.includeNotDue && s.dueAt > nowMs) continue;
    candidates.push(card);
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const sa = stateById.get(a.id)!;
    const sb = stateById.get(b.id)!;
    if (sa.dueAt !== sb.dueAt) return sa.dueAt - sb.dueAt;
    return sa.easeFactor - sb.easeFactor;
  });

  const k = Math.min(opts.poolSize, candidates.length);
  const pool = candidates.slice(0, k);
  const idx = Math.floor(rng() * pool.length);
  return pool[idx] ?? null;
}

/** Fisher–Yates sample up to n distinct cards. */
export function drawExamCards(cards: Card[], n: number, rng: () => number = Math.random): Card[] {
  if (n <= 0 || cards.length === 0) return [];
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

/** Initial state for a card never seen (due immediately). */
export function initialSchedulingState(cardId: string, nowMs: number): CardSchedulingState {
  return {
    cardId,
    easeFactor: DEFAULT_EASE_FACTOR,
    intervalDays: 0,
    repetitions: 0,
    dueAt: nowMs,
    lastReviewedAt: 0,
    suspended: false,
  };
}
