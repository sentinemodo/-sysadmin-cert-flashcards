import { DEFAULT_EXAM_QUESTION_COUNT } from '../appConstants';
import { requestRerender } from '../appBus';
import { loadStateMapForCards } from '../db/schedulingRepo';
import { db } from '../db/flashcardsDb';
import {
  applyReviewForExam,
  drawExamCards,
  isPassingGrade,
  selfGradeToQuality,
} from '../lib/scheduling';
import { scoreRatio } from '../lib/scoreRatio';
import type { AppRoute } from '../router';
import type { Card, DeckContent } from '../types/content';
import type { ExamResult, ExamResultPerCard, SelfGrade } from '../types/runtime';

type ExamSession = {
  chapterId: string;
  cards: Card[];
  index: number;
  examResultId: string;
  startedAt: string;
  perCard: ExamResultPerCard[];
};

let examSession: ExamSession | null = null;
let examResultView: ExamResult | null = null;

function chapterCards(deck: DeckContent, chapterId: string): Card[] {
  return deck.cards.filter((c) => c.chapterId === chapterId);
}

function chapterTitle(deck: DeckContent, chapterId: string): string {
  return deck.chapters.find((c) => c.id === chapterId)?.title ?? chapterId;
}

function cardQuestionPreview(card: Card): string {
  const t = card.question.trim();
  return t.length > 80 ? `${t.slice(0, 77)}…` : t;
}

export async function renderExam(
  outlet: HTMLElement,
  deck: DeckContent | null,
  loadError: string | null,
  route: Extract<AppRoute, { kind: 'exam' }>,
): Promise<void> {
  outlet.replaceChildren();

  if (loadError || !deck) {
    const p = document.createElement('p');
    p.className = 'banner banner-error';
    p.textContent = loadError ?? 'No deck loaded.';
    outlet.appendChild(p);
    return;
  }

  if (!route.chapterId) {
    examSession = null;
    examResultView = null;

    const section = document.createElement('section');
    section.className = 'view view-exam-pick';
    const h2 = document.createElement('h2');
    h2.textContent = 'Exam — pick chapter';
    section.appendChild(h2);

    const ul = document.createElement('ul');
    ul.className = 'chapter-list';
    const chapters = [...deck.chapters].sort((a, b) => a.order - b.order);
    for (const ch of chapters) {
      const n = ch.examQuestionCount ?? DEFAULT_EXAM_QUESTION_COUNT;
      const total = chapterCards(deck, ch.id).length;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#/exam/${ch.id}`;
      a.textContent = ch.title;
      const meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = ` · ${Math.min(n, total)} questions (of ${total})`;
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
  const pool = chapterCards(deck, chapterId);
  const chapter = deck.chapters.find((c) => c.id === chapterId);
  const n = Math.min(
    chapter?.examQuestionCount ?? DEFAULT_EXAM_QUESTION_COUNT,
    pool.length,
  );

  if (pool.length === 0) {
    const section = document.createElement('section');
    section.className = 'view';
    const empty = document.createElement('p');
    empty.textContent = 'No cards in this chapter.';
    section.appendChild(empty);
    const back = document.createElement('p');
    const a = document.createElement('a');
    a.href = '#/exam';
    a.textContent = '← Chapters';
    back.appendChild(a);
    section.appendChild(back);
    outlet.appendChild(section);
    return;
  }

  if (
    examSession &&
    examSession.chapterId === chapterId &&
    examSession.index >= examSession.cards.length &&
    examSession.cards.length > 0
  ) {
    await finalizeExam(deck, examSession);
    return;
  }

  if (examResultView && examResultView.chapterId === chapterId) {
    renderExamResult(outlet, deck, examResultView);
    return;
  }

  if (!examSession || examSession.chapterId !== chapterId) {
    const cards = drawExamCards(pool, n, Math.random);
    const startedAt = new Date().toISOString();
    examSession = {
      chapterId,
      cards,
      index: 0,
      examResultId: crypto.randomUUID(),
      startedAt,
      perCard: [],
    };
  }

  const session = examSession;
  if (session.index >= session.cards.length) {
    await finalizeExam(deck, session);
    return;
  }

  const card = session.cards[session.index]!;
  const now = Date.now();
  const stateMap = await loadStateMapForCards(db, [card.id], now);
  const section = document.createElement('section');
  section.className = 'view view-exam-run';

  const prog = document.createElement('p');
  prog.className = 'meta';
  prog.textContent = `Question ${session.index + 1} / ${session.cards.length}`;
  section.appendChild(prog);

  const h2 = document.createElement('h2');
  h2.textContent = chapterTitle(deck, chapterId);
  section.appendChild(h2);

  const cardEl = document.createElement('article');
  cardEl.className = 'flashcard';
  const q = document.createElement('p');
  q.className = 'flashcard-question';
  q.textContent = card.question;
  cardEl.appendChild(q);

  const answerBlock = document.createElement('div');
  answerBlock.className = 'flashcard-answer';
  answerBlock.hidden = true;
  const ans = document.createElement('p');
  ans.textContent = card.goodAnswer;
  answerBlock.appendChild(ans);
  const links = document.createElement('div');
  links.className = 'doc-links';
  for (const dl of card.docLinks) {
    const a = document.createElement('a');
    a.href = dl.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = dl.label;
    links.appendChild(a);
    links.appendChild(document.createTextNode(' · '));
  }
  if (card.docLinks.length) answerBlock.appendChild(links);
  cardEl.appendChild(answerBlock);
  section.appendChild(cardEl);

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
  section.appendChild(revealRow);

  const gradeRow = document.createElement('div');
  gradeRow.className = 'grade-buttons';
  gradeRow.hidden = true;

  // Exam uses binary self-assessment: Correct/Wrong.
  // Persist mapping per requirement: Correct -> good, Wrong -> hard.
  const grades: { label: string; value: SelfGrade }[] = [
    { label: 'Correct', value: 'good' },
    { label: 'Wrong', value: 'hard' },
  ];

  const onGrade = async (g: SelfGrade): Promise<void> => {
    const qv = selfGradeToQuality(g);
    const state = stateMap.get(card.id)!;
    const updated = applyReviewForExam(state, qv, Date.now(), Math.random);
    await db.cardSchedulingState.put(updated);
    await db.attempts.add({
      id: crypto.randomUUID(),
      cardId: card.id,
      mode: 'exam',
      gradedAt: new Date().toISOString(),
      selfGrade: g,
      examResultId: session.examResultId,
    });
    session.perCard.push({ cardId: card.id, grade: g });
    session.index += 1;
    requestRerender();
  };

  for (const { label, value } of grades) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => void onGrade(value));
    gradeRow.appendChild(b);
  }
  section.appendChild(gradeRow);

  const foot = document.createElement('p');
  const back = document.createElement('a');
  back.href = '#/exam';
  back.textContent = '← Cancel (chapters)';
  back.addEventListener('click', () => {
    examSession = null;
  });
  foot.appendChild(back);
  section.appendChild(foot);

  outlet.appendChild(section);
}

async function finalizeExam(deck: DeckContent, session: ExamSession): Promise<void> {
  let correct = 0;
  let incorrect = 0;
  for (const row of session.perCard) {
    if (isPassingGrade(selfGradeToQuality(row.grade))) correct += 1;
    else incorrect += 1;
  }
  const questionCount = session.perCard.length;
  const ratio = scoreRatio(correct, questionCount);
  const completedAt = new Date().toISOString();
  const result: ExamResult = {
    id: session.examResultId,
    bookId: deck.book.id,
    chapterId: session.chapterId,
    startedAt: session.startedAt,
    completedAt,
    questionCount,
    correctCount: correct,
    incorrectCount: incorrect,
    scoreRatio: ratio,
    perCard: session.perCard,
  };
  await db.examResults.add(result);
  examSession = null;
  examResultView = result;
  requestRerender();
}

function renderExamResult(outlet: HTMLElement, deck: DeckContent, result: ExamResult): void {
  const section = document.createElement('section');
  section.className = 'view view-exam-result';

  const h2 = document.createElement('h2');
  h2.textContent = 'Exam result';
  section.appendChild(h2);

  const sum = document.createElement('p');
  sum.className = 'exam-score';
  sum.textContent = `${result.correctCount} / ${result.questionCount} correct (${Math.round(result.scoreRatio * 100)}%)`;
  section.appendChild(sum);

  const wrong = result.perCard?.filter((p) => !isPassingGrade(selfGradeToQuality(p.grade))) ?? [];
  if (wrong.length) {
    const wh = document.createElement('h3');
    wh.textContent = 'Review these cards';
    section.appendChild(wh);
    const ul = document.createElement('ul');
    for (const p of wrong) {
      const card = deck.cards.find((c) => c.id === p.cardId);
      const li = document.createElement('li');
      li.textContent = card ? cardQuestionPreview(card) : p.cardId;
      ul.appendChild(li);
    }
    section.appendChild(ul);
  }

  const actions = document.createElement('p');
  actions.className = 'actions';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Retry chapter';
  retry.addEventListener('click', () => {
    examResultView = null;
    examSession = null;
    requestRerender();
  });
  const chapters = document.createElement('a');
  chapters.href = '#/exam';
  chapters.textContent = 'All chapters';
  chapters.addEventListener('click', () => {
    examResultView = null;
  });
  actions.append(retry, document.createTextNode(' '), chapters);
  section.appendChild(actions);

  outlet.appendChild(section);
}
