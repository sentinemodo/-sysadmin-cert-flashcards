import { loadStateMapForCards } from '../db/schedulingRepo';
import { db } from '../db/flashcardsDb';
import { applyReview, nextStudyCard, selfGradeToQuality } from '../lib/scheduling';
import type { SelfGrade } from '../types/runtime';
import { requestRerender } from '../appBus';
import type { AppRoute } from '../router';
import type { Card, DeckContent } from '../types/content';

let cramIncludeNotDue = false;

function chapterCards(deck: DeckContent, chapterId: string): Card[] {
  return deck.cards.filter((c) => c.chapterId === chapterId);
}

function chapterTitle(deck: DeckContent, chapterId: string): string {
  return deck.chapters.find((c) => c.id === chapterId)?.title ?? chapterId;
}

export async function renderStudy(
  outlet: HTMLElement,
  deck: DeckContent | null,
  loadError: string | null,
  route: Extract<AppRoute, { kind: 'study' }>,
): Promise<void> {
  outlet.replaceChildren();

  if (loadError || !deck) {
    const p = document.createElement('p');
    p.className = 'banner banner-error';
    p.textContent = loadError ?? 'No deck loaded.';
    outlet.appendChild(p);
    return;
  }

  const chapters = [...deck.chapters].sort((a, b) => a.order - b.order);
  const now = Date.now();

  if (!route.chapterId) {
    const section = document.createElement('section');
    section.className = 'view view-study-pick';
    const h2 = document.createElement('h2');
    h2.textContent = 'Study — pick chapter';
    section.appendChild(h2);

    const cram = document.createElement('label');
    cram.className = 'cram-toggle';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = cramIncludeNotDue;
    cb.addEventListener('change', () => {
      cramIncludeNotDue = cb.checked;
    });
    cram.append(cb, document.createTextNode(' Include cards not due yet (cram)'));
    section.appendChild(cram);

    const ul = document.createElement('ul');
    ul.className = 'chapter-list';

    for (const ch of chapters) {
      const cardIds = chapterCards(deck, ch.id).map((c) => c.id);
      const stateMap = await loadStateMapForCards(db, cardIds, now);
      const total = cardIds.length;
      let due = 0;
      for (const id of cardIds) {
        const s = stateMap.get(id)!;
        if (!s.suspended && s.dueAt <= now) due += 1;
      }

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#/study/${ch.id}`;
      a.textContent = ch.title;
      const meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = ` · ${due} due / ${total} cards`;
      li.append(a, meta);
      ul.appendChild(li);
    }

    section.appendChild(ul);
    const back = document.createElement('p');
    const link = document.createElement('a');
    link.href = '#/';
    link.textContent = '← Home';
    back.appendChild(link);
    section.appendChild(back);
    outlet.appendChild(section);
    return;
  }

  const chapterId = route.chapterId;
  const cards = chapterCards(deck, chapterId);
  if (cards.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No cards in this chapter.';
    outlet.appendChild(p);
    return;
  }

  const stateMap = await loadStateMapForCards(
    db,
    cards.map((c) => c.id),
    now,
  );
  const next = nextStudyCard(cards, stateMap, now, {
    includeNotDue: cramIncludeNotDue,
    poolSize: 20,
  });

  const section = document.createElement('section');
  section.className = 'view view-study-session';

  const title = document.createElement('h2');
  title.textContent = chapterTitle(deck, chapterId);
  section.appendChild(title);

  if (!next) {
    const p = document.createElement('p');
    p.className = 'banner';
    p.textContent = cramIncludeNotDue
      ? 'No cards available (all suspended?).'
      : 'No due cards in this chapter. Enable “cram” on the chapter list or come back later.';
    const nav = document.createElement('p');
    const a = document.createElement('a');
    a.href = '#/study';
    a.textContent = '← Chapters';
    nav.appendChild(a);
    section.append(p, nav);
    outlet.appendChild(section);
    return;
  }

  const cardEl = document.createElement('article');
  cardEl.className = 'flashcard';

  const q = document.createElement('p');
  q.className = 'flashcard-question';
  q.textContent = next.question;
  cardEl.appendChild(q);

  const answerBlock = document.createElement('div');
  answerBlock.className = 'flashcard-answer';
  answerBlock.hidden = true;

  const ans = document.createElement('p');
  ans.textContent = next.goodAnswer;
  answerBlock.appendChild(ans);

  const links = document.createElement('div');
  links.className = 'doc-links';
  for (const dl of next.docLinks) {
    const a = document.createElement('a');
    a.href = dl.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = dl.label;
    links.appendChild(a);
    links.appendChild(document.createTextNode(' · '));
  }
  if (next.docLinks.length) answerBlock.appendChild(links);

  cardEl.appendChild(answerBlock);

  const revealRow = document.createElement('p');
  revealRow.className = 'actions';
  const revealBtn = document.createElement('button');
  revealBtn.type = 'button';
  revealBtn.textContent = 'Reveal answer';
  revealBtn.addEventListener('click', () => {
    answerBlock.hidden = false;
    revealBtn.hidden = true;
    gradeRow.hidden = false;
  });
  revealRow.appendChild(revealBtn);
  section.appendChild(cardEl);
  section.appendChild(revealRow);

  const gradeRow = document.createElement('div');
  gradeRow.className = 'grade-buttons';
  gradeRow.hidden = true;

  const grades: { label: string; value: SelfGrade }[] = [
    { label: 'Again', value: 'again' },
    { label: 'Hard', value: 'hard' },
    { label: 'Good', value: 'good' },
    { label: 'Easy', value: 'easy' },
  ];

  const persistGrade = async (g: SelfGrade): Promise<void> => {
    const qv = selfGradeToQuality(g);
    const state = stateMap.get(next.id)!;
    const updated = applyReview(state, qv, Date.now(), Math.random);
    await db.cardSchedulingState.put(updated);
    await db.attempts.add({
      id: crypto.randomUUID(),
      cardId: next.id,
      mode: 'study',
      gradedAt: new Date().toISOString(),
      selfGrade: g,
      examResultId: null,
    });
    requestRerender();
  };

  for (const { label, value } of grades) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => void persistGrade(value));
    gradeRow.appendChild(b);
  }
  section.appendChild(gradeRow);

  const foot = document.createElement('p');
  const back = document.createElement('a');
  back.href = '#/study';
  back.textContent = '← Chapters';
  foot.appendChild(back);
  section.appendChild(foot);

  outlet.appendChild(section);
}
