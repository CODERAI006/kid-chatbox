/** Default and bounds for Guru AI multi-question quizzes. */
export const DEFAULT_QUIZ_COUNT = 10;
export const MIN_QUIZ_COUNT = 3;
export const MAX_QUIZ_COUNT = 25;
export const QUIZ_COUNT_OPTIONS = [5, 10, 15, 20] as const;

export function clampQuizCount(value: number): number {
  return Math.max(MIN_QUIZ_COUNT, Math.min(MAX_QUIZ_COUNT, Math.round(value)));
}
