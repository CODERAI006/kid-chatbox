/**
 * Flashcards section for study lessons — interactive deck (20+ cards).
 */
import { InteractiveFlashcardDeck } from '@/components/shared/InteractiveFlashcardDeck';
import type { Flashcard } from '@/services/study';

interface StudyFlashcardsProps {
  cards: Flashcard[];
}

export const StudyFlashcards: React.FC<StudyFlashcardsProps> = ({ cards }) => {
  if (!cards.length) return null;

  return <InteractiveFlashcardDeck cards={cards} compact={false} />;
};
