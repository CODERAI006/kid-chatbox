/**
 * Interactive flashcard deck — question-first study flow.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Text,
  Badge,
  Button,
  HStack,
  VStack,
  Progress,
  IconButton,
} from '@/shared/design-system';
import { MIN_FLASHCARD_COUNT } from '@/constants/flashcards';
import type { FlashcardItem } from '@/utils/flashcardNormalize';

export type { FlashcardItem };

interface Props {
  cards: FlashcardItem[];
  minCards?: number;
  onRequestMore?: () => void;
  compact?: boolean;
}

function shuffleCards(items: FlashcardItem[]): FlashcardItem[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function InteractiveFlashcardDeck({
  cards,
  minCards = MIN_FLASHCARD_COUNT,
  onRequestMore,
  compact = false,
}: Props) {
  const [deck, setDeck] = useState(cards);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());

  const current = deck[idx];
  const total = deck.length;
  const knownCount = known.size;
  const masteryPct = total ? Math.round((knownCount / total) * 100) : 0;
  const needsMore = total < minCards;

  const goNext = useCallback(() => {
    setFlipped(false);
    setIdx((i) => (i + 1) % total);
  }, [total]);

  const goPrev = useCallback(() => {
    setFlipped(false);
    setIdx((i) => (i - 1 + total) % total);
  }, [total]);

  const markKnown = useCallback(() => {
    setKnown((prev) => new Set(prev).add(idx));
    goNext();
  }, [idx, goNext]);

  const markReview = useCallback(() => {
    setKnown((prev) => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
    goNext();
  }, [idx, goNext]);

  const onShuffle = useCallback(() => {
    setDeck(shuffleCards(cards));
    setIdx(0);
    setFlipped(false);
    setKnown(new Set());
  }, [cards]);

  const deckKey = useMemo(() => cards.map((c) => `${c.front}::${c.back}`).join('|'), [cards]);

  useEffect(() => {
    setDeck(cards);
    setIdx(0);
    setFlipped(false);
    setKnown(new Set());
  }, [deckKey, cards]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  if (!current) return null;

  return (
    <VStack align="stretch" spacing={compact ? 2 : 3}>
      {needsMore && (
        <Box p={2} bg="orange.50" borderRadius="md" borderWidth="1px" borderColor="orange.200">
          <Text fontSize="xs" color="orange.800">
            {total} of {minCards} recommended cards — add more for better revision.
          </Text>
          {onRequestMore && (
            <Button size="xs" mt={2} colorScheme="orange" onClick={onRequestMore}>
              Generate {minCards - total}+ more
            </Button>
          )}
        </Box>
      )}

      <HStack justify="space-between" flexWrap="wrap" gap={2}>
        <Badge colorScheme="purple" borderRadius="full">
          Question {idx + 1} / {total}
        </Badge>
        <Text fontSize="xs" color="gray.500">
          Mastered {knownCount} · {masteryPct}%
        </Text>
      </HStack>

      <Progress value={masteryPct} size="xs" colorScheme="green" borderRadius="full" />

      <Box
        as="button"
        type="button"
        w="100%"
        p={compact ? 4 : 5}
        minH={compact ? '110px' : '130px'}
        borderRadius="xl"
        borderWidth={2}
        borderColor={flipped ? 'green.400' : 'blue.400'}
        bg={flipped ? 'green.50' : 'blue.50'}
        textAlign="center"
        cursor="pointer"
        onClick={() => setFlipped((f) => !f)}
        boxShadow="md"
        transition="background 0.2s, border-color 0.2s"
      >
        <HStack justify="center" mb={2} spacing={2}>
          <Text fontSize="lg">{flipped ? '✅' : '❓'}</Text>
          <Badge colorScheme={flipped ? 'green' : 'blue'}>
            {flipped ? 'Answer' : 'Your question'}
          </Badge>
        </HStack>
        {!flipped && (
          <Text fontSize="xs" color="blue.700" mb={2} fontWeight="medium">
            Think of the answer, then tap to reveal
          </Text>
        )}
        <Text
          fontSize={compact ? 'sm' : 'md'}
          fontWeight="semibold"
          lineHeight="tall"
          whiteSpace="pre-wrap"
          fontStyle={flipped ? 'normal' : 'italic'}
        >
          {flipped
            ? current.back || 'Answer missing for this card.'
            : current.front || 'Question missing for this card.'}
        </Text>
        <Text fontSize="xs" color="gray.500" mt={2}>
          Tap to {flipped ? 'see question again' : 'check answer'}
        </Text>
      </Box>

      <HStack justify="center" spacing={2} flexWrap="wrap">
        <IconButton aria-label="Previous" size="sm" variant="outline" icon={<Text>←</Text>} onClick={goPrev} />
        {!flipped ? (
          <Button size="sm" colorScheme="blue" onClick={() => setFlipped(true)}>
            Show answer
          </Button>
        ) : (
          <>
            <Button size="sm" colorScheme="green" variant="outline" onClick={markKnown}>
              ✓ Got it
            </Button>
            <Button size="sm" colorScheme="orange" variant="outline" onClick={markReview}>
              ↻ Review
            </Button>
          </>
        )}
        <IconButton aria-label="Next" size="sm" variant="outline" icon={<Text>→</Text>} onClick={goNext} />
      </HStack>

      <HStack justify="space-between">
        <Button size="xs" variant="ghost" onClick={onShuffle}>
          🔀 Shuffle
        </Button>
        <Text fontSize="xs" color="gray.500">
          Space / Enter to flip · ← → to move
        </Text>
      </HStack>
    </VStack>
  );
}
