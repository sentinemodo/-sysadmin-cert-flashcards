export type AppRoute =
  | 'home'
  | 'study'
  | 'exam'
  | 'history'
  | 'settings'
  | 'notFound';

function firstSegmentFromHash(): string | undefined {
  const raw = window.location.hash.replace(/^#/, '').trim() || '/';
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const parts = path.split('/').filter(Boolean);
  return parts[0];
}

/** Hash-based routes: `#/`, `#/study`, `#/exam`, etc. */
export function parseHashRoute(): AppRoute {
  const seg = firstSegmentFromHash();
  switch (seg) {
    case undefined:
    case '':
    case 'home':
      return 'home';
    case 'study':
      return 'study';
    case 'exam':
      return 'exam';
    case 'history':
      return 'history';
    case 'settings':
      return 'settings';
    default:
      return 'notFound';
  }
}

export function navigateHash(path: string): void {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  window.location.hash = `#${normalized}`;
}

export function subscribeHashChange(handler: () => void): () => void {
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
