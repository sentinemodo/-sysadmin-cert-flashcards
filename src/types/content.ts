/** Static deck content: book, chapters, cards (overview.md §4). */

export interface DocLink {
  label: string;
  url: string;
}

export interface Book {
  id: string;
  title: string;
  description?: string;
  order?: number;
}

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  order: number;
  examQuestionCount?: number;
}

export interface Card {
  id: string;
  bookId: string;
  chapterId: string;
  question: string;
  goodAnswer: string;
  docLinks: DocLink[];
  tags?: string[];
  difficulty?: number;
}

export interface DeckContent {
  book: Book;
  chapters: Chapter[];
  cards: Card[];
}
