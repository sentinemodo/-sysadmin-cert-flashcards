import { navigateHash } from '../router';

export function renderNotFound(outlet: HTMLElement): void {
  outlet.replaceChildren();
  const section = document.createElement('section');
  section.className = 'view view-not-found';
  const h2 = document.createElement('h2');
  h2.textContent = 'Not found';
  const back = document.createElement('button');
  back.type = 'button';
  back.textContent = 'Home';
  back.addEventListener('click', () => navigateHash('/'));
  section.append(h2, back);
  outlet.appendChild(section);
}
