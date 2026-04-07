export const RERENDER = 'app:rerender';

export function requestRerender(): void {
  window.dispatchEvent(new CustomEvent(RERENDER));
}

export function subscribeRerender(handler: () => void): () => void {
  window.addEventListener(RERENDER, handler);
  return () => window.removeEventListener(RERENDER, handler);
}
