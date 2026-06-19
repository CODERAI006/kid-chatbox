/**
 * Flashcards section for study lessons — interactive deck (20+ cards).
 */
import { InteractiveFlashcardDeck } from '@/components/shared/InteractiveFlashcardDeck';
import type { Flashcard } from '@/services/study';
import { Box } from '@/shared/design-system';

interface StudyFlashcardsProps {
  cards: Flashcard[];
}

export const StudyFlashcards: React.FC<StudyFlashcardsProps> = ({ cards }) => {
  if (!cards.length) return null;

  return (
    <Box py={2} px={{ base: 1, md: 4 }} bg="purple.50" borderRadius="xl">
      <InteractiveFlashcardDeck cards={cards} compact={false} />
    </Box>
  );
};
