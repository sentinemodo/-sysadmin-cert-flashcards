import { navigateHash } from '../router';

export function renderSimplePlaceholder(
  outlet: HTMLElement,
  title: string,
  blurb: string,
): void {
  outlet.replaceChildren();
  const section = document.createElement('section');
  section.className = 'view view-placeholder';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  const p = document.createElement('p');
  p.textContent = blurb;
  const back = document.createElement('button');
  back.type = 'button';
  back.textContent = 'Back to home';
  back.addEventListener('click', () => navigateHash('/'));
  section.append(h2, p, back);
  outlet.appendChild(section);
}
