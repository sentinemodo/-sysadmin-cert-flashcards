/** Derived field for ExamResult (overview.md §4). */
export function scoreRatio(correctCount: number, questionCount: number): number {
  if (questionCount <= 0) return 0;
  return correctCount / questionCount;
}
