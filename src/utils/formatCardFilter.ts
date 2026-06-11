/**
 * Keep workspace cards aligned with the study format the user picked.
 */
import type { LearningCardType, LearningStudyFormat, LearningWorkspaceCard } from '@/types/learningWorkspace';
import { flashcardsFromWorkspaceCard } from '@/utils/flashcardNormalize';

const FORMAT_ALLOWED: Record<LearningStudyFormat, Set<LearningCardType>> = {
  learn: new Set(['hook', 'explanation', 'text']),
  detail: new Set(['hook', 'explanation', 'text', 'timeline', 'example', 'comparison']),
  flashcards: new Set(['flashcard']),
  quiz: new Set(['quiz', 'hook', 'text']),
  chat: new Set(),
  studyplan: new Set(['hook', 'explanation', 'text', 'quiz']),
  'studyplan-lesson': new Set(['hook', 'explanation', 'text', 'example', 'quiz']),
};

function mergeFlashcardCards(cards: LearningWorkspaceCard[]): LearningWorkspaceCard[] {
  const hooks = cards.filter((c) => c.type === 'hook');
  const flash = cards.filter((c) => c.type === 'flashcard');
  if (flash.length <= 1) return cards;

  const merged: LearningWorkspaceCard = {
    type: 'flashcard',
    title: flash[0]?.title || 'Flashcards',
    flashcards: flash.flatMap((c) => flashcardsFromWorkspaceCard(c)),
  };
  return [...hooks, merged];
}

/** Client-side guard when the model returns extra card types. */
export function filterCardsByStudyFormat(
  cards: LearningWorkspaceCard[],
  format: LearningStudyFormat | null | undefined
): LearningWorkspaceCard[] {
  if (!format || format === 'chat') return cards;

  const allowed = FORMAT_ALLOWED[format];
  if (!allowed.size) return cards;

  let filtered = cards.filter((c) => allowed.has(c.type));

  if (format === 'flashcards') {
    filtered = mergeFlashcardCards(filtered);
    if (!filtered.some((c) => c.type === 'flashcard') && cards.some((c) => c.type === 'flashcard')) {
      filtered = mergeFlashcardCards(cards.filter((c) => c.type === 'flashcard'));
    }
  }

  return filtered.length ? filtered : cards.slice(0, 1);
}
