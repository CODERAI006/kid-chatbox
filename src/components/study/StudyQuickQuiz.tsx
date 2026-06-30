/**
 * Interactive quiz for quick-quiz section — easy → medium → hard progression.
 */
import { useState } from 'react';
import {
  Box, VStack, Text, Button, Badge, Collapse, HStack,
} from '@/shared/design-system';
import type { QuickQuizQuestion } from '@/types/studyInteractive';

interface Props {
  questions: QuickQuizQuestion[];
}

const DIFF_COLOR = { easy: 'green', medium: 'orange', hard: 'red' } as const;

export const StudyQuickQuiz: React.FC<Props> = ({ questions }) => {
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const sorted = [...questions].sort((a, b) => {
    const order = { easy: 0, medium: 1, hard: 2 };
    return order[a.difficulty] - order[b.difficulty];
  });

  return (
    <VStack spacing={4} align="stretch">
      {sorted.map((q, qi) => {
        const selected = answers[qi];
        const show = revealed[qi];
        const isCorrect = selected === q.correctIndex;

        return (
          <Box key={qi} p={4} bg="white" borderRadius="xl" borderWidth={1} borderColor="gray.200">
            <HStack mb={2} flexWrap="wrap" gap={2}>
              <Badge colorScheme={DIFF_COLOR[q.difficulty]}>{q.difficulty}</Badge>
              <Text fontWeight="semibold" flex={1}>{q.question}</Text>
            </HStack>
            <VStack spacing={2} align="stretch">
              {q.options.map((opt, oi) => {
                let scheme = 'gray';
                if (show && oi === q.correctIndex) scheme = 'green';
                else if (show && oi === selected) scheme = 'red';
                else if (selected === oi) scheme = 'blue';

                return (
                  <Button
                    key={oi}
                    size="sm"
                    variant={selected === oi ? 'solid' : 'outline'}
                    colorScheme={scheme}
                    justifyContent="flex-start"
                    onClick={() => !show && setAnswers((a) => ({ ...a, [qi]: oi }))}
                    isDisabled={show}
                  >
                    {String.fromCharCode(65 + oi)}. {opt}
                  </Button>
                );
              })}
            </VStack>
            {selected !== undefined && selected !== null && !show && (
              <Button mt={2} size="sm" colorScheme="blue" onClick={() => setRevealed((r) => ({ ...r, [qi]: true }))}>
                Check answer
              </Button>
            )}
            <Collapse in={show}>
              <Box mt={3} p={3} bg={isCorrect ? 'green.50' : 'orange.50'} borderRadius="lg">
                <Text fontSize="sm" fontWeight="semibold" mb={1}>
                  {isCorrect ? '✅ Correct!' : '💡 Not quite'}
                </Text>
                <Text fontSize="sm">{q.explanation}</Text>
                {q.whyWrong?.map((w, i) => (
                  <Text key={i} fontSize="xs" color="gray.600" mt={1}>• {w}</Text>
                ))}
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </VStack>
  );
};
