import type { DeckContent } from '../types/content';
import { navigateHash } from '../router';

export function renderHome(
  outlet: HTMLElement,
  deck: DeckContent | null,
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

  if (deck) {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = deck.book.title;
    li.appendChild(strong);
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = ` · ${deck.chapters.length} chapters · ${deck.cards.length} cards`;
    li.appendChild(meta);
    list.appendChild(li);
  } else if (!loadError) {
    const li = document.createElement('li');
    li.textContent = 'Loading…';
    list.appendChild(li);
  }

  section.appendChild(list);

  const actions = document.createElement('p');
  actions.className = 'actions';
  const studyBtn = document.createElement('button');
  studyBtn.type = 'button';
  studyBtn.textContent = 'Study';
  studyBtn.addEventListener('click', () => navigateHash('/study'));
  const examBtn = document.createElement('button');
  examBtn.type = 'button';
  examBtn.textContent = 'Exam';
  examBtn.addEventListener('click', () => navigateHash('/exam'));
  actions.append(studyBtn, document.createTextNode(' '), examBtn);
  section.appendChild(actions);

  outlet.appendChild(section);
}
