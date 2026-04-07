export type AppRoute =
  | { kind: 'home' }
  | { kind: 'study'; bookId?: string; chapterId?: string }
  | { kind: 'exam'; bookId?: string; chapterId?: string }
  | { kind: 'history'; examId?: string }
  | { kind: 'editor' }
  | { kind: 'settings' }
  | { kind: 'notFound' };

function segmentsFromHash(): string[] {
  const raw = window.location.hash.replace(/^#/, '').trim() || '/';
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return path.split('/').filter(Boolean);
}

/** Hash routes: `#/`, `#/study/:bookId?/:chapterId?`, `#/exam/:bookId?/:chapterId?`, `#/history/:examId?` */
export function parseHashRoute(): AppRoute {
  const parts = segmentsFromHash();
  const head = parts[0];

  switch (head) {
    case undefined:
    case '':
    case 'home':
      return { kind: 'home' };
    case 'study': {
      const bookId = parts[1];
      const chapterId = parts[2];
      if (bookId && chapterId) return { kind: 'study', bookId, chapterId };
      if (bookId) return { kind: 'study', bookId };
      return { kind: 'study' };
    }
    case 'exam': {
      const bookId = parts[1];
      const chapterId = parts[2];
      if (bookId && chapterId) return { kind: 'exam', bookId, chapterId };
      if (bookId) return { kind: 'exam', bookId };
      return { kind: 'exam' };
    }
    case 'history': {
      const examId = parts[1];
      return examId ? { kind: 'history', examId } : { kind: 'history' };
    }
    case 'editor':
      return { kind: 'editor' };
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
