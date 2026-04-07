export type AppRoute =
  | { kind: 'home' }
  | { kind: 'study'; chapterId?: string }
  | { kind: 'exam'; chapterId?: string }
  | { kind: 'history'; examId?: string }
  | { kind: 'settings' }
  | { kind: 'notFound' };

function segmentsFromHash(): string[] {
  const raw = window.location.hash.replace(/^#/, '').trim() || '/';
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return path.split('/').filter(Boolean);
}

/** Hash routes: `#/`, `#/study`, `#/study/:chapterId`, `#/exam/:chapterId`, `#/history/:examId?` */
export function parseHashRoute(): AppRoute {
  const parts = segmentsFromHash();
  const head = parts[0];

  switch (head) {
    case undefined:
    case '':
    case 'home':
      return { kind: 'home' };
    case 'study': {
      const chapterId = parts[1];
      return chapterId ? { kind: 'study', chapterId } : { kind: 'study' };
    }
    case 'exam': {
      const chapterId = parts[1];
      return chapterId ? { kind: 'exam', chapterId } : { kind: 'exam' };
    }
    case 'history': {
      const examId = parts[1];
      return examId ? { kind: 'history', examId } : { kind: 'history' };
    }
    case 'settings':
      return { kind: 'settings' };
    default:
      return { kind: 'notFound' };
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
