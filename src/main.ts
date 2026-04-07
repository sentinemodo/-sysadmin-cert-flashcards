import './styles/main.css';
import { subscribeRerender } from './appBus';
import { loadDeckContent } from './content/loadContent';
import { db } from './db/flashcardsDb';
import { parseHashRoute, subscribeHashChange } from './router';
import type { DeckContent } from './types/content';
import { renderExam } from './views/exam';
import { renderHistory } from './views/history';
import { renderHome } from './views/home';
import { renderNotFound } from './views/notFound';
import { renderSettings } from './views/settings';
import { renderStudy } from './views/study';

const CONTENT_URL = '/content/maag-11-2-1.json';

let deck: DeckContent | null = null;
let loadError: string | null = null;
let navLinks: HTMLAnchorElement[] = [];

function setCurrentNav(routeKind: string): void {
  for (const link of navLinks) {
    const href = link.getAttribute('href') ?? '#/';
    const target = href.replace(/^#\//, '').split('/')[0] || 'home';
    const current = routeKind === 'home' ? target === 'home' : target === routeKind;
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

async function renderRoute(outlet: HTMLElement, subtitle: HTMLElement): Promise<void> {
  const route = parseHashRoute();
  setCurrentNav(route.kind);
  switch (route.kind) {
    case 'home':
      renderHome(outlet, deck, loadError);
      break;
    case 'study':
      await renderStudy(outlet, deck, loadError, route);
      break;
    case 'exam':
      await renderExam(outlet, deck, loadError, route);
      break;
    case 'history':
      await renderHistory(outlet, deck, loadError, route);
      break;
    case 'settings':
      await renderSettings(outlet);
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
    /* surfaced via settings / browser */
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
    navLinks.push(a);
    nav.appendChild(a);
  }

  header.append(h1, subtitle, nav);

  const mainEl = document.createElement('main');
  mainEl.className = 'outlet';

  shell.append(header, mainEl);
  mount.appendChild(shell);

  const refresh = (): void => {
    void renderRoute(mainEl, subtitle);
  };

  subscribeHashChange(refresh);
  subscribeRerender(refresh);
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
