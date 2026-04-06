import './styles/main.css';
import { loadDeckContent } from './content/loadContent';
import { db } from './db/flashcardsDb';
import { parseHashRoute, subscribeHashChange } from './router';
import type { DeckContent } from './types/content';
import { renderExamPlaceholder } from './views/examPlaceholder';
import { renderHome } from './views/home';
import { renderNotFound } from './views/notFound';
import { renderSimplePlaceholder } from './views/simplePlaceholder';
import { renderStudyPlaceholder } from './views/studyPlaceholder';

const CONTENT_URL = '/content/maag-11-2-1.json';

let deck: DeckContent | null = null;
let loadError: string | null = null;

function renderRoute(outlet: HTMLElement, subtitle: HTMLElement): void {
  const route = parseHashRoute();
  switch (route) {
    case 'home':
      renderHome(outlet, deck, loadError);
      break;
    case 'study':
      renderStudyPlaceholder(outlet);
      break;
    case 'exam':
      renderExamPlaceholder(outlet);
      break;
    case 'history':
      renderSimplePlaceholder(
        outlet,
        'History',
        'TODO(architecture): overview §7 — list ExamResult rows with filters.',
      );
      break;
    case 'settings':
      renderSimplePlaceholder(
        outlet,
        'Settings',
        'TODO(architecture): overview §7 — algorithm caps, export/import, wipe data.',
      );
      break;
    default:
      renderNotFound(outlet);
  }

  if (deck && !loadError) {
    subtitle.textContent = deck.book.title;
    subtitle.hidden = false;
  } else if (loadError) {
    subtitle.textContent = 'Content failed to load';
    subtitle.hidden = false;
  } else {
    subtitle.textContent = '';
    subtitle.hidden = true;
  }
}

async function bootstrap(): Promise<void> {
  const mount = document.querySelector<HTMLDivElement>('#app');
  if (!mount) {
    throw new Error('Missing #app root');
  }

  void db.open().catch(() => {
    /* TODO(architecture): surface IndexedDB errors in settings UI */
  });

  const shell = document.createElement('div');
  shell.className = 'shell';

  const header = document.createElement('header');
  const h1 = document.createElement('h1');
  h1.textContent = 'Sysadmin cert flashcards';
  const subtitle = document.createElement('p');
  subtitle.className = 'subtitle';
  subtitle.hidden = true;

  const nav = document.createElement('nav');
  nav.className = 'site-nav';
  const links: [string, string][] = [
    ['Home', '#/'],
    ['Study', '#/study'],
    ['Exam', '#/exam'],
    ['History', '#/history'],
    ['Settings', '#/settings'],
  ];
  for (const [label, href] of links) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    nav.appendChild(a);
  }

  header.append(h1, subtitle, nav);

  const mainEl = document.createElement('main');
  mainEl.className = 'outlet';

  shell.append(header, mainEl);
  mount.appendChild(shell);

  const refresh = (): void => {
    renderRoute(mainEl, subtitle);
  };

  subscribeHashChange(refresh);
  refresh();

  try {
    deck = await loadDeckContent(CONTENT_URL);
    loadError = null;
  } catch (e: unknown) {
    deck = null;
    loadError = e instanceof Error ? e.message : String(e);
  }

  refresh();
}

void bootstrap();
