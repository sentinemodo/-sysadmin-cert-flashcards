import type { DeckContent } from '../types/content';

export function renderHome(
  outlet: HTMLElement,
  decks: DeckContent[],
  activeBookId: string | null,
  loadError: string | null,
): void {
  outlet.replaceChildren();

  const section = document.createElement('section');
  section.className = 'view view-home';

  const h2 = document.createElement('h2');
  h2.textContent = 'Books';
  section.appendChild(h2);

  if (loadError) {
    const err = document.createElement('p');
    err.className = 'banner banner-error';
    err.textContent = loadError;
    section.appendChild(err);
  }

  const list = document.createElement('ul');
  list.className = 'book-list';

  if (decks.length > 0) {
    for (const deck of decks) {
      const li = document.createElement('li');
      const strong = document.createElement('strong');
      strong.textContent = deck.book.title;
      li.appendChild(strong);
      const meta = document.createElement('span');
      meta.className = 'meta';
      const marker = activeBookId === deck.book.id ? ' · active' : '';
      meta.textContent = ` · ${deck.chapters.length} chapters · ${deck.cards.length} cards${marker}`;
      li.appendChild(meta);

      const actions = document.createElement('span');
      actions.className = 'actions';
      const study = document.createElement('a');
      study.href = `#/study/${deck.book.id}`;
      study.textContent = 'Study';
      const exam = document.createElement('a');
      exam.href = `#/exam/${deck.book.id}`;
      exam.textContent = 'Exam';
      actions.append(study, document.createTextNode(' · '), exam);
      li.appendChild(document.createTextNode(' '));
      li.appendChild(actions);
      list.appendChild(li);
    }
  } else if (!loadError) {
    const li = document.createElement('li');
    li.textContent = 'Loading…';
    list.appendChild(li);
  }

  section.appendChild(list);

  outlet.appendChild(section);
}
