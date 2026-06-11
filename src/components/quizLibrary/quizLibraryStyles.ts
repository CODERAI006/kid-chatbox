/** Quiz library ownership / generation source metadata from GET /quizzes/library */

export type QuizGenerationSource = 'mine' | 'peer' | 'admin' | 'other';

export type LibraryFilter = 'all' | 'mine' | 'peer';

export interface LibraryQuizMeta {
  created_by_id?: string | null;
  is_mine?: boolean;
  is_same_grade?: boolean;
  generation_source?: QuizGenerationSource;
}

export const SOURCE_LABEL: Record<QuizGenerationSource, string> = {
  mine: 'My Quiz',
  peer: 'Same Grade',
  admin: 'Teacher',
  other: 'Library',
};

export const SOURCE_COLOR: Record<QuizGenerationSource, string> = {
  mine: 'blue',
  peer: 'teal',
  admin: 'purple',
  other: 'gray',
};

export const SOURCE_BORDER: Record<QuizGenerationSource, string> = {
  mine: 'blue.400',
  peer: 'teal.400',
  admin: 'purple.400',
  other: 'gray.200',
};

export function resolveGenerationSource(quiz: LibraryQuizMeta): QuizGenerationSource {
  if (quiz.generation_source) return quiz.generation_source;
  if (quiz.is_mine) return 'mine';
  if (quiz.is_same_grade) return 'peer';
  return 'other';
}

export function filterByOwnership<T extends LibraryQuizMeta>(
  quizzes: T[],
  filter: LibraryFilter
): T[] {
  if (filter === 'mine') return quizzes.filter((q) => resolveGenerationSource(q) === 'mine');
  if (filter === 'peer') return quizzes.filter((q) => resolveGenerationSource(q) === 'peer');
  return quizzes;
}
