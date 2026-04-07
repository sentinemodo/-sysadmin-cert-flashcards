import type { DeckContent } from '../types/content';
import { db } from '../db/flashcardsDb';

export async function loadEditableDecks(): Promise<DeckContent[] | null> {
  const rows = await db.editableDecks.toArray();
  if (!rows.length) return null;
  const decks = rows
    .map((r) => r.deck)
    .sort((a, b) => (a.book.order ?? 9999) - (b.book.order ?? 9999));
  if (!decks.length) return null;
  return decks;
}

export async function saveEditableDecks(decks: DeckContent[]): Promise<void> {
  await db.transaction('rw', db.editableDecks, async () => {
    await db.editableDecks.clear();
    if (decks.length === 0) return;
    await db.editableDecks.bulkPut(
      decks.map((deck) => ({
        bookId: deck.book.id,
        deck,
      })),
    );
  });
}

export async function clearEditableDecks(): Promise<void> {
  try {
    await db.editableDecks.clear();
  } catch {
    // Ignore clear failures; callers can continue with file-based decks.
  }
}
