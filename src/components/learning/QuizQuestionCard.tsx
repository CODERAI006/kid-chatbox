/**
 * Single multiple-choice quiz question with instant feedback.
 */
import { useState } from 'react';
import { Box, Button, Text, VStack } from '@/shared/design-system';
import type { LearningWorkspaceCard } from '@/types/learningWorkspace';

interface Props {
  card: LearningWorkspaceCard;
  questionNumber?: number;
  compact?: boolean;
  onAnswered?: (correct: boolean) => void;
}

export function QuizQuestionCard({ card, questionNumber, compact, onAnswered }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const correct = card.correctOptionId;
  const isCorrect = picked != null && picked === correct;

  const pick = (id: string) => {
    if (picked != null) return;
    setPicked(id);
    onAnswered?.(id === correct);
  };

  return (
    <VStack align="stretch" spacing={2}>
      {questionNumber != null && (
        <Text fontSize="xs" color="gray.500" fontWeight="semibold">
          Question {questionNumber}
        </Text>
      )}
      <Text fontSize={compact ? 'sm' : 'md'} fontWeight="semibold">
        {card.question}
      </Text>
      <VStack align="stretch" spacing={1}>
        {(card.options || []).map((opt) => {
          const chosen = picked === opt.id;
          const showCorrect = picked != null && opt.id === correct;
          const showWrong = chosen && opt.id !== correct;
          return (
            <Button
              key={opt.id}
              size="sm"
              variant={chosen ? 'solid' : 'outline'}
              colorScheme={showCorrect ? 'green' : showWrong ? 'red' : 'blue'}
              justifyContent="flex-start"
              isDisabled={picked != null}
              onClick={() => pick(opt.id)}
            >
              {opt.label}
            </Button>
          );
        })}
      </VStack>
      {picked != null && (
        <Box mt={1} p={2} borderRadius="md" bg={isCorrect ? 'green.50' : 'orange.50'}>
          <Text fontSize="sm" fontWeight="semibold" color={isCorrect ? 'green.700' : 'orange.700'}>
            {isCorrect ? '✅ Correct' : '💡 Not quite'}
          </Text>
          <Text fontSize="sm" mt={1}>
            {isCorrect ? card.correctFeedback : card.wrongFeedback || card.correctFeedback}
          </Text>
        </Box>
      )}
    </VStack>
  );
}
