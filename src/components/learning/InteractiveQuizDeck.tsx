/**
 * Multi-question quiz deck — navigate questions one at a time.
 */
import { useCallback, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  HStack,
  IconButton,
  Progress,
  Text,
  VStack,
} from '@/shared/design-system';
import type { LearningWorkspaceCard } from '@/types/learningWorkspace';
import { useHorizontalSwipe } from '@/hooks/useHorizontalSwipe';
import { QuizQuestionCard } from './QuizQuestionCard';

interface Props {
  cards: LearningWorkspaceCard[];
}

export function InteractiveQuizDeck({ cards }: Props) {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const didSwipe = useRef(false);

  const total = cards.length;
  const current = cards[idx];
  const progressPct = total ? Math.round((answered.size / total) * 100) : 0;

  const goNext = useCallback(() => {
    setIdx((i) => Math.min(i + 1, total - 1));
  }, [total]);

  const goPrev = useCallback(() => {
    setIdx((i) => Math.max(i - 1, 0));
  }, []);

  const swipe = useHorizontalSwipe(
    () => {
      didSwipe.current = true;
      goNext();
    },
    () => {
      didSwipe.current = true;
      goPrev();
    }
  );

  if (!current) return null;

  return (
    <Box
      borderWidth="1px"
      borderColor="green.200"
      borderRadius="lg"
      bg="white"
      overflow="hidden"
      boxShadow="sm"
    >
      <HStack px={3} py={2} bg="green.50" borderBottomWidth="1px" borderColor="green.100">
        <Text fontSize="lg">🎮</Text>
        <Text fontSize="sm" fontWeight="bold" color="green.800">
          Quiz · {total} questions
        </Text>
      </HStack>
      <Box px={3} py={3}>
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <Badge colorScheme="green" borderRadius="full">
              {idx + 1} / {total}
            </Badge>
            <Text fontSize="xs" color="gray.500">
              Score {score} · {progressPct}% done
            </Text>
          </HStack>
          <Progress value={progressPct} size="xs" colorScheme="green" borderRadius="full" />

          <Box
            onTouchStart={(e) => {
              didSwipe.current = false;
              swipe.onTouchStart(e);
            }}
            onTouchEnd={swipe.onTouchEnd}
            onPointerDown={(e) => {
              didSwipe.current = false;
              swipe.onPointerDown(e);
            }}
            onPointerUp={swipe.onPointerUp}
            onPointerCancel={swipe.onPointerCancel}
            sx={{ touchAction: 'pan-y' }}
          >
            <QuizQuestionCard
              key={idx}
              card={current}
              questionNumber={idx + 1}
              compact
              onAnswered={(correct) => {
                setAnswered((prev) => {
                  if (prev.has(idx)) return prev;
                  const next = new Set(prev);
                  next.add(idx);
                  if (correct) setScore((s) => s + 1);
                  return next;
                });
              }}
            />
          </Box>

          <HStack justify="center" spacing={2}>
            <IconButton
              aria-label="Previous question"
              size="sm"
              variant="outline"
              icon={<Text>←</Text>}
              isDisabled={idx === 0}
              onClick={goPrev}
            />
            <Button size="sm" colorScheme="green" onClick={goNext} isDisabled={idx >= total - 1}>
              Next →
            </Button>
            <IconButton
              aria-label="Next question"
              size="sm"
              variant="outline"
              icon={<Text>→</Text>}
              isDisabled={idx >= total - 1}
              onClick={goNext}
            />
          </HStack>
          <Text fontSize="xs" color="gray.500" textAlign="center">
            Swipe ← → between questions
          </Text>
        </VStack>
      </Box>
    </Box>
  );
}
