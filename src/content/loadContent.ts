import { z } from 'zod';
import type { DeckContent } from '../types/content';

const docLinkSchema = z.object({
  label: z.string(),
  url: z.string().url(),
});

const bookSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string().optional(),
  order: z.number().int().optional(),
});

const chapterSchema = z.object({
  id: z.string().min(1),
  bookId: z.string().min(1),
  title: z.string(),
  order: z.number().int(),
  examQuestionCount: z.number().int().positive().optional(),
});

const cardSchema = z.object({
  id: z.string().min(1),
  bookId: z.string().min(1),
  chapterId: z.string().min(1),
  question: z.string(),
  goodAnswer: z.string(),
  docLinks: z.array(docLinkSchema),
  tags: z.array(z.string()).optional(),
  difficulty: z.number().optional(),
});

const deckContentSchema = z.object({
  book: bookSchema,
  chapters: z.array(chapterSchema),
  cards: z.array(cardSchema),
});

export type ParsedDeckContent = z.infer<typeof deckContentSchema>;

function normalizeDeck(parsed: ParsedDeckContent): DeckContent {
  return {
    book: {
      id: parsed.book.id,
      title: parsed.book.title,
      ...(parsed.book.description !== undefined
        ? { description: parsed.book.description }
        : {}),
      ...(parsed.book.order !== undefined ? { order: parsed.book.order } : {}),
    },
    chapters: parsed.chapters.map((c) => ({
      id: c.id,
      bookId: c.bookId,
      title: c.title,
      order: c.order,
      ...(c.examQuestionCount !== undefined
        ? { examQuestionCount: c.examQuestionCount }
        : {}),
    })),
    cards: parsed.cards.map((c) => ({
      id: c.id,
      bookId: c.bookId,
      chapterId: c.chapterId,
      question: c.question,
      goodAnswer: c.goodAnswer,
      docLinks: c.docLinks,
      ...(c.tags !== undefined ? { tags: c.tags } : {}),
      ...(c.difficulty !== undefined ? { difficulty: c.difficulty } : {}),
    })),
  };
}

/**
 * Fetch and validate deck JSON (e.g. `/content/maag-11-2-1.json`).
 */
export async function loadDeckContent(url: string): Promise<DeckContent> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: failed to fetch ${url}`);
  }
  const raw: unknown = await res.json();
  const parsed = deckContentSchema.parse(raw);
  return normalizeDeck(parsed);
}
