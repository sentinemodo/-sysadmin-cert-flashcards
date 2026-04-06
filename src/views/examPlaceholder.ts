import { navigateHash } from '../router';

/** TODO(architecture): overview §6 exam flow + ExamResult / Attempt linkage. */
export function renderExamPlaceholder(outlet: HTMLElement): void {
  outlet.replaceChildren();
  const section = document.createElement('section');
  section.className = 'view view-exam';
  const h2 = document.createElement('h2');
  h2.textContent = 'Exam';
  const p = document.createElement('p');
  p.textContent =
    'Exam mode will sample N cards per chapter, self-grade, and persist ExamResult + Attempt records.';
  const back = document.createElement('button');
  back.type = 'button';
  back.textContent = 'Back to home';
  back.addEventListener('click', () => navigateHash('/'));
  section.append(h2, p, back);
  outlet.appendChild(section);
}
