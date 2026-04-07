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

const CONTENT_FILES = [
  'maag-11-2-1.json',
  'm3-application-foundation.json',
  'm3-business-controlling-user-guide-30072025-controlling.json',
  'm3-financial-accounting.json',
  'm3-financial-controlling.json',
  'm3-sales-management.json',
  'm3cloud-configfinaccounting-workbook-watermark.json',
  'm3cloud-configuringadhocreports-workbook-watermark.json',
  'm3cloud-configuringcostingandinternalaccounting-workbook-watermark.json',
] as const;
const ACTIVE_BOOK_STORAGE_KEY = 'activeBookId';

let decks: DeckContent[] = [];
let loadError: string | null = null;
let navLinks: HTMLAnchorElement[] = [];
let activeBookId: string | null = null;

function updateBookScopedNavTargets(deck: DeckContent | null): void {
  for (const link of navLinks) {
    const text = (link.textContent ?? '').trim();
    if (!deck) {
      if (text === 'Study') link.href = '#/study';
      if (text === 'Exam') link.href = '#/exam';
      continue;
    }
    if (text === 'Study') link.href = `#/study/${deck.book.id}`;
    if (text === 'Exam') link.href = `#/exam/${deck.book.id}`;
  }
}

function setActiveBookId(bookId: string | null): void {
  activeBookId = bookId;
  if (bookId) {
    localStorage.setItem(ACTIVE_BOOK_STORAGE_KEY, bookId);
  } else {
    localStorage.removeItem(ACTIVE_BOOK_STORAGE_KEY);
  }
}

function currentDeck(bookId?: string): DeckContent | null {
  if (decks.length === 0) return null;
  if (bookId) {
    const byRoute = decks.find((d) => d.book.id === bookId);
    if (byRoute) {
      setActiveBookId(byRoute.book.id);
      return byRoute;
    }
  }
  if (activeBookId) {
    const byActive = decks.find((d) => d.book.id === activeBookId);
    if (byActive) return byActive;
  }
  const first = decks[0] ?? null;
  if (first) setActiveBookId(first.book.id);
  return first;
}

async function loadAllDecks(): Promise<DeckContent[]> {
  const urls = CONTENT_FILES.map(
    (f) => `${import.meta.env.BASE_URL}content/${f}`,
  );
  const settled = await Promise.allSettled(urls.map((url) => loadDeckContent(url)));
  const loaded: DeckContent[] = [];
  const errs: string[] = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') loaded.push(r.value);
    else errs.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
  }
  if (loaded.length === 0 && errs.length > 0) {
    throw new Error(errs.join(' | '));
  }
  loaded.sort((a, b) => (a.book.order ?? 9999) - (b.book.order ?? 9999));
  if (errs.length > 0) {
    loadError = `Some decks failed to load (${errs.length}). Loaded ${loaded.length} deck(s).`;
  }
  return loaded;
}

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
  const routeBookId =
    route.kind === 'study' || route.kind === 'exam' ? route.bookId : undefined;
  const deck = currentDeck(routeBookId);
  updateBookScopedNavTargets(deck);
  setCurrentNav(route.kind);
  switch (route.kind) {
    case 'home':
      renderHome(outlet, decks, activeBookId, loadError);
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

  if (deck) {
    subtitle.textContent = `${deck.book.title} (${deck.chapters.length} chapters)`;
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
    const rememberedBookId = localStorage.getItem(ACTIVE_BOOK_STORAGE_KEY);
    setActiveBookId(rememberedBookId);
    decks = await loadAllDecks();
    if (!loadError) loadError = null;
  } catch (e: unknown) {
    decks = [];
    loadError = e instanceof Error ? e.message : String(e);
  }

  refresh();
}

void bootstrap();
