import { navigateHash } from '../router';

/** TODO(architecture): overview §6 study loop + §5 SRS scheduler. */
export function renderStudyPlaceholder(outlet: HTMLElement): void {
  outlet.replaceChildren();
  const section = document.createElement('section');
  section.className = 'view view-study';
  const h2 = document.createElement('h2');
  h2.textContent = 'Study';
  const p = document.createElement('p');
  p.textContent =
    'Study mode will run the card queue with reveal and self-grade. SRS updates CardSchedulingState and logs Attempt rows.';
  const back = document.createElement('button');
  back.type = 'button';
  back.textContent = 'Back to home';
  back.addEventListener('click', () => navigateHash('/'));
  section.append(h2, p, back);
  outlet.appendChild(section);
}
