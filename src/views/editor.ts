import { requestRerender } from '../appBus';
import { db } from '../db/flashcardsDb';
import type { Card, Chapter, DeckContent } from '../types/content';
import type { CardSchedulingState, SelfGrade } from '../types/runtime';

type SaveDecks = (next: DeckContent[]) => void;

function promptRequired(label: string, initial = ''): string | null {
  const value = window.prompt(label, initial)?.trim();
  if (!value) return null;
  return value;
}

function chapterCards(deck: DeckContent, chapterId: string): Card[] {
  return deck.cards.filter((c) => c.chapterId === chapterId);
}

type CardStats = {
  good: number;
  other: number;
  comfort: string;
};

function isGoodGrade(grade: SelfGrade): boolean {
  return grade === 'good' || grade === true;
}

function comfortFromState(state: CardSchedulingState | undefined): string {
  if (!state) return 'New';
  if (state.suspended) return 'Suspended';
  if (state.repetitions >= 8 && state.intervalDays >= 45) return 'Very high';
  if (state.repetitions >= 5 && state.intervalDays >= 20) return 'High';
  if (state.repetitions >= 3 && state.intervalDays >= 7) return 'Medium';
  if (state.repetitions >= 1) return 'Low';
  return 'Learning';
}

async function loadStats(cards: Card[]): Promise<Map<string, CardStats>> {
  const [attempts, states] = await Promise.all([
    db.attempts.toArray(),
    db.cardSchedulingState.toArray(),
  ]);

  const stateById = new Map(states.map((s) => [s.cardId, s]));
  const statById = new Map<string, CardStats>();
  for (const c of cards) {
    statById.set(c.id, {
      good: 0,
      other: 0,
      comfort: comfortFromState(stateById.get(c.id)),
    });
  }
  for (const a of attempts) {
    const s = statById.get(a.cardId);
    if (!s) continue;
    if (isGoodGrade(a.selfGrade)) s.good += 1;
    else s.other += 1;
  }
  return statById;
}

export async function renderEditor(
  outlet: HTMLElement,
  decks: DeckContent[],
  saveDecks: SaveDecks,
): Promise<void> {
  outlet.replaceChildren();
  const section = document.createElement('section');
  section.className = 'view';

  const h2 = document.createElement('h2');
  h2.textContent = 'Content editor';
  section.appendChild(h2);

  const hint = document.createElement('p');
  hint.className = 'meta';
  hint.textContent =
    'Manage books, chapters, and cards. Changes are stored locally in this browser.';
  section.appendChild(hint);

  const bookActions = document.createElement('p');
  bookActions.className = 'actions';

  const addBook = document.createElement('button');
  addBook.type = 'button';
  addBook.textContent = 'Add book';
  addBook.addEventListener('click', () => {
    const id = promptRequired('Book ID (slug):');
    if (!id) return;
    if (decks.some((d) => d.book.id === id)) {
      window.alert('Book ID already exists.');
      return;
    }
    const title = promptRequired('Book title:');
    if (!title) return;
    const next: DeckContent[] = [
      ...decks,
      {
        book: { id, title, order: decks.length + 1 },
        chapters: [],
        cards: [],
      },
    ];
    saveDecks(next);
    requestRerender();
  });
  bookActions.appendChild(addBook);
  section.appendChild(bookActions);

  if (decks.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No books available.';
    section.appendChild(empty);
    outlet.appendChild(section);
    return;
  }

  const allCards = decks.flatMap((d) => d.cards);
  const statsByCardId = await loadStats(allCards);

  for (const deck of decks) {
    const block = document.createElement('article');
    block.className = 'history-card';
    const title = document.createElement('h3');
    title.textContent = `${deck.book.title} (${deck.book.id})`;
    block.appendChild(title);

    const bMeta = document.createElement('p');
    bMeta.className = 'meta';
    bMeta.textContent = `${deck.chapters.length} chapters · ${deck.cards.length} cards`;
    block.appendChild(bMeta);

    const bActions = document.createElement('p');
    bActions.className = 'actions';
    const editBook = document.createElement('button');
    editBook.type = 'button';
    editBook.textContent = 'Edit book';
    editBook.addEventListener('click', () => {
      const titleNext = promptRequired('Book title:', deck.book.title);
      if (!titleNext) return;
      const descNext = window.prompt('Book description (optional):', deck.book.description ?? '');
      const next = decks.map((d) =>
        d.book.id === deck.book.id
          ? {
              ...d,
              book: {
                ...d.book,
                title: titleNext,
                ...(descNext?.trim()
                  ? { description: descNext.trim() }
                  : {}),
              },
            }
          : d,
      );
      saveDecks(next);
      requestRerender();
    });
    const removeBook = document.createElement('button');
    removeBook.type = 'button';
    removeBook.textContent = 'Remove book';
    removeBook.addEventListener('click', () => {
      if (!window.confirm(`Remove book "${deck.book.title}" and all its chapters/cards?`)) return;
      saveDecks(decks.filter((d) => d.book.id !== deck.book.id));
      requestRerender();
    });
    const addChapter = document.createElement('button');
    addChapter.type = 'button';
    addChapter.textContent = 'Add chapter';
    addChapter.addEventListener('click', () => {
      const id = promptRequired('Chapter ID:');
      if (!id) return;
      if (deck.chapters.some((c) => c.id === id)) {
        window.alert('Chapter ID already exists in this book.');
        return;
      }
      const cTitle = promptRequired('Chapter title:');
      if (!cTitle) return;
      const chapter: Chapter = {
        id,
        bookId: deck.book.id,
        title: cTitle,
        order: deck.chapters.length + 1,
        examQuestionCount: 5,
      };
      const next = decks.map((d) =>
        d.book.id === deck.book.id ? { ...d, chapters: [...d.chapters, chapter] } : d,
      );
      saveDecks(next);
      requestRerender();
    });
    bActions.append(editBook, document.createTextNode(' '), removeBook, document.createTextNode(' '), addChapter);
    block.appendChild(bActions);

    for (const chapter of [...deck.chapters].sort((a, b) => a.order - b.order)) {
      const ch = document.createElement('div');
      ch.className = 'history-card';
      const h4 = document.createElement('h4');
      h4.textContent = chapter.title;
      ch.appendChild(h4);

      const cMeta = document.createElement('p');
      cMeta.className = 'meta';
      cMeta.textContent = `${chapterCards(deck, chapter.id).length} cards · id: ${chapter.id}`;
      ch.appendChild(cMeta);

      const cActions = document.createElement('p');
      cActions.className = 'actions';
      const editChapter = document.createElement('button');
      editChapter.type = 'button';
      editChapter.textContent = 'Edit chapter';
      editChapter.addEventListener('click', () => {
        const nextTitle = promptRequired('Chapter title:', chapter.title);
        if (!nextTitle) return;
        const next = decks.map((d) =>
          d.book.id !== deck.book.id
            ? d
            : {
                ...d,
                chapters: d.chapters.map((c) =>
                  c.id === chapter.id ? { ...c, title: nextTitle } : c,
                ),
              },
        );
        saveDecks(next);
        requestRerender();
      });
      const removeChapter = document.createElement('button');
      removeChapter.type = 'button';
      removeChapter.textContent = 'Remove chapter';
      removeChapter.addEventListener('click', () => {
        if (!window.confirm(`Remove chapter "${chapter.title}" and its cards?`)) return;
        const next = decks.map((d) =>
          d.book.id !== deck.book.id
            ? d
            : {
                ...d,
                chapters: d.chapters.filter((c) => c.id !== chapter.id),
                cards: d.cards.filter((c) => c.chapterId !== chapter.id),
              },
        );
        saveDecks(next);
        requestRerender();
      });
      const addCard = document.createElement('button');
      addCard.type = 'button';
      addCard.textContent = 'Add card';
      cActions.append(
        editChapter,
        document.createTextNode(' '),
        removeChapter,
        document.createTextNode(' '),
        addCard,
      );
      ch.appendChild(cActions);

      const cards = chapterCards(deck, chapter.id);
      if (cards.length) {
        const ul = document.createElement('ul');
        for (const card of cards.slice(0, 15)) {
          const li = document.createElement('li');
          li.className = 'editor-card-item';
          const label = document.createElement('span');
          label.textContent =
            card.question.length > 180
              ? `${card.question.slice(0, 177)}...`
              : card.question;
          li.appendChild(label);

          const stats = statsByCardId.get(card.id);
          const statLine = document.createElement('p');
          statLine.className = 'meta';
          statLine.textContent = `Answered good: ${stats?.good ?? 0} · other: ${stats?.other ?? 0} · comfort: ${stats?.comfort ?? 'New'}`;
          li.appendChild(statLine);

          const form = document.createElement('div');
          form.className = 'editor-card-form';
          form.hidden = true;

          const qLabel = document.createElement('label');
          qLabel.textContent = 'Question';
          const qInput = document.createElement('textarea');
          qInput.rows = 4;
          qInput.value = card.question;
          qInput.className = 'editor-textarea';
          qLabel.appendChild(qInput);

          const aLabel = document.createElement('label');
          aLabel.textContent = 'Good answer';
          const aInput = document.createElement('textarea');
          aInput.rows = 6;
          aInput.value = card.goodAnswer;
          aInput.className = 'editor-textarea';
          aLabel.appendChild(aInput);

          const formActions = document.createElement('p');
          formActions.className = 'actions';
          const save = document.createElement('button');
          save.type = 'button';
          save.textContent = 'Save card';
          save.addEventListener('click', () => {
            const q = qInput.value.trim();
            const a = aInput.value.trim();
            if (!q || !a) {
              window.alert('Question and answer are required.');
              return;
            }
            const next = decks.map((d) =>
              d.book.id !== deck.book.id
                ? d
                : {
                    ...d,
                    cards: d.cards.map((c) =>
                      c.id === card.id ? { ...c, question: q, goodAnswer: a } : c,
                    ),
                  },
            );
            saveDecks(next);
            requestRerender();
          });
          const cancel = document.createElement('button');
          cancel.type = 'button';
          cancel.textContent = 'Cancel';
          cancel.addEventListener('click', () => {
            form.hidden = true;
            qInput.value = card.question;
            aInput.value = card.goodAnswer;
          });
          formActions.append(save, document.createTextNode(' '), cancel);
          form.append(qLabel, aLabel, formActions);

          const edit = document.createElement('button');
          edit.type = 'button';
          edit.textContent = 'Edit';
          edit.addEventListener('click', () => {
            form.hidden = !form.hidden;
          });

          const remove = document.createElement('button');
          remove.type = 'button';
          remove.textContent = 'Remove';
          remove.addEventListener('click', () => {
            if (!window.confirm('Remove this card?')) return;
            const next = decks.map((d) =>
              d.book.id !== deck.book.id
                ? d
                : { ...d, cards: d.cards.filter((c) => c.id !== card.id) },
            );
            saveDecks(next);
            requestRerender();
          });
          li.append(document.createTextNode(' '), edit, document.createTextNode(' '), remove);
          li.appendChild(form);
          ul.appendChild(li);
        }
        if (cards.length > 15) {
          const more = document.createElement('p');
          more.className = 'meta';
          more.textContent = `Showing 15 of ${cards.length} cards in this chapter.`;
          ch.appendChild(more);
        }
        ch.appendChild(ul);
      }

      const addForm = document.createElement('div');
      addForm.className = 'editor-card-form';
      addForm.hidden = true;

      const addQLabel = document.createElement('label');
      addQLabel.textContent = 'New question';
      const addQ = document.createElement('textarea');
      addQ.rows = 4;
      addQ.className = 'editor-textarea';
      addQLabel.appendChild(addQ);

      const addALabel = document.createElement('label');
      addALabel.textContent = 'New good answer';
      const addA = document.createElement('textarea');
      addA.rows = 6;
      addA.className = 'editor-textarea';
      addALabel.appendChild(addA);

      const addActions = document.createElement('p');
      addActions.className = 'actions';
      const addSave = document.createElement('button');
      addSave.type = 'button';
      addSave.textContent = 'Create card';
      addSave.addEventListener('click', () => {
        const question = addQ.value.trim();
        const answer = addA.value.trim();
        if (!question || !answer) {
          window.alert('Question and answer are required.');
          return;
        }
        const id = `${deck.book.id}/${chapter.id}/${crypto.randomUUID().slice(0, 8)}`;
        const card: Card = {
          id,
          bookId: deck.book.id,
          chapterId: chapter.id,
          question,
          goodAnswer: answer,
          docLinks: [],
        };
        const next = decks.map((d) =>
          d.book.id === deck.book.id ? { ...d, cards: [...d.cards, card] } : d,
        );
        saveDecks(next);
        requestRerender();
      });
      const addCancel = document.createElement('button');
      addCancel.type = 'button';
      addCancel.textContent = 'Cancel';
      addCancel.addEventListener('click', () => {
        addForm.hidden = true;
        addQ.value = '';
        addA.value = '';
      });
      addActions.append(addSave, document.createTextNode(' '), addCancel);
      addForm.append(addQLabel, addALabel, addActions);
      ch.appendChild(addForm);

      addCard.addEventListener('click', () => {
        addForm.hidden = !addForm.hidden;
      });
      block.appendChild(ch);
    }
    section.appendChild(block);
  }

  outlet.appendChild(section);
}
