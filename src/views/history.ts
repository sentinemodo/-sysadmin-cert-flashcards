import { db } from '../db/flashcardsDb';
import type { AppRoute } from '../router';
import type { DeckContent } from '../types/content';
import type { ExamResult } from '../types/runtime';
import { isPassingGrade, selfGradeToQuality } from '../lib/scheduling';

function chapterTitle(deck: DeckContent, chapterId: string): string {
  return deck.chapters.find((c) => c.id === chapterId)?.title ?? chapterId;
}

export async function renderHistory(
  outlet: HTMLElement,
  deck: DeckContent | null,
  loadError: string | null,
  route: Extract<AppRoute, { kind: 'history' }>,
): Promise<void> {
  outlet.replaceChildren();

  if (loadError || !deck) {
    const p = document.createElement('p');
    p.className = 'banner banner-error';
    p.textContent = loadError ?? 'No deck loaded.';
    outlet.appendChild(p);
    return;
  }

  const rows = await db.examResults
    .where('bookId')
    .equals(deck.book.id)
    .toArray();
  rows.sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  if (route.examId) {
    const one = rows.find((r) => r.id === route.examId);
    if (!one) {
      const p = document.createElement('p');
      p.textContent = 'Exam not found.';
      outlet.appendChild(p);
      return;
    }
    renderExamDetail(outlet, deck, one);
    return;
  }

  const section = document.createElement('section');
  section.className = 'view view-history';
  const h2 = document.createElement('h2');
  h2.textContent = 'Exam history';
  section.appendChild(h2);

  if (rows.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No exams yet.';
    section.appendChild(p);
  } else {
    const cards = document.createElement('div');
    cards.className = 'history-cards';
    for (const r of rows) {
      const item = document.createElement('article');
      item.className = 'history-card';
      const dt = new Date(r.completedAt);
      const when = document.createElement('p');
      when.className = 'meta';
      when.textContent = dt.toLocaleString();
      const title = document.createElement('p');
      title.textContent = chapterTitle(deck, r.chapterId);
      const score = document.createElement('p');
      score.textContent = `${r.correctCount}/${r.questionCount} (${Math.round(r.scoreRatio * 100)}%)`;
      const link = document.createElement('a');
      link.href = `#/history/${r.id}`;
      link.textContent = 'Detail';
      item.append(when, title, score, link);
      cards.appendChild(item);
    }
    section.appendChild(cards);

    const table = document.createElement('table');
    table.className = 'data-table';
    const thead = document.createElement('thead');
    const hr = document.createElement('tr');
    for (const label of ['Completed', 'Chapter', 'Score', 'N', '']) {
      const th = document.createElement('th');
      th.textContent = label;
      hr.appendChild(th);
    }
    thead.appendChild(hr);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const r of rows) {
      const tr = document.createElement('tr');
      const dt = new Date(r.completedAt);
      tr.appendChild(td(dt.toLocaleString()));
      tr.appendChild(td(chapterTitle(deck, r.chapterId)));
      tr.appendChild(td(`${r.correctCount}/${r.questionCount} (${Math.round(r.scoreRatio * 100)}%)`));
      tr.appendChild(td(String(r.questionCount)));
      const linkTd = document.createElement('td');
      const a = document.createElement('a');
      a.href = `#/history/${r.id}`;
      a.textContent = 'Detail';
      linkTd.appendChild(a);
      tr.appendChild(linkTd);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    section.appendChild(table);
  }

  const back = document.createElement('p');
  const home = document.createElement('a');
  home.href = '#/';
  home.textContent = '← Home';
  back.appendChild(home);
  section.appendChild(back);
  outlet.appendChild(section);
}

function td(text: string): HTMLTableCellElement {
  const c = document.createElement('td');
  c.textContent = text;
  return c;
}

function renderExamDetail(outlet: HTMLElement, deck: DeckContent, r: ExamResult): void {
  const section = document.createElement('section');
  section.className = 'view view-history-detail';
  const h2 = document.createElement('h2');
  h2.textContent = `Exam — ${chapterTitle(deck, r.chapterId)}`;
  section.appendChild(h2);

  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.textContent = `Completed ${new Date(r.completedAt).toLocaleString()} · ${r.correctCount}/${r.questionCount} (${Math.round(r.scoreRatio * 100)}%)`;
  section.appendChild(meta);

  if (r.perCard?.length) {
    const ul = document.createElement('ul');
    ul.className = 'per-card-list';
    for (const p of r.perCard) {
      const card = deck.cards.find((c) => c.id === p.cardId);
      const pass = isPassingGrade(selfGradeToQuality(p.grade));
      const li = document.createElement('li');
      li.textContent = `${pass ? '✓' : '✗'} ${card?.question.slice(0, 100) ?? p.cardId} — ${String(p.grade)}`;
      ul.appendChild(li);
    }
    section.appendChild(ul);
  }

  const back = document.createElement('p');
  const a = document.createElement('a');
  a.href = '#/history';
  a.textContent = '← All exams';
  back.appendChild(a);
  section.appendChild(back);
  outlet.appendChild(section);
}
