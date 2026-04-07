import type { FlashcardsDB } from './flashcardsDb';
import { initialSchedulingState } from '../lib/scheduling';
import type { CardSchedulingState } from '../types/runtime';

export async function getOrCreateSchedulingState(
  database: FlashcardsDB,
  cardId: string,
  nowMs: number,
): Promise<CardSchedulingState> {
  const existing = await database.cardSchedulingState.get(cardId);
  if (existing) return existing;
  const initial = initialSchedulingState(cardId, nowMs);
  await database.cardSchedulingState.add(initial);
  return initial;
}

export async function loadStateMapForCards(
  database: FlashcardsDB,
  cardIds: string[],
  nowMs: number,
): Promise<Map<string, CardSchedulingState>> {
  const keys = await database.cardSchedulingState.bulkGet(cardIds);
  const map = new Map<string, CardSchedulingState>();
  for (let i = 0; i < cardIds.length; i++) {
    const id = cardIds[i]!;
    let state = keys[i];
    if (!state) {
      state = initialSchedulingState(id, nowMs);
      await database.cardSchedulingState.add(state);
    }
    map.set(id, state);
  }
  return map;
}
