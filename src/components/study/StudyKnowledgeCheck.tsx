/**
 * Knowledge check — true/false, fill-blank, match, sequence.
 */
import { useState } from 'react';
import {
  Box, VStack, Text, Button, Badge, Input, HStack, SimpleGrid,
} from '@/shared/design-system';
import type { KnowledgeCheckItem } from '@/types/studyInteractive';

interface Props {
  items: KnowledgeCheckItem[];
}

export const StudyKnowledgeCheck: React.FC<Props> = ({ items }) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  return (
    <VStack spacing={4} align="stretch">
      {items.map((item, i) => {
        const userAnswer = answers[i] ?? '';
        const isChecked = checked[i];
        const correct = String(item.answer).toLowerCase() === userAnswer.toLowerCase();

        return (
          <Box key={i} p={4} bg="white" borderRadius="xl" borderWidth={1} borderColor="gray.200">
            <Badge mb={2} colorScheme="teal">{item.kind.replace('-', ' ')}</Badge>
            <Text fontWeight="medium" mb={3}>{item.prompt}</Text>

            {item.kind === 'true-false' && (
              <HStack spacing={2}>
                {['True', 'False'].map((opt) => (
                  <Button
                    key={opt}
                    size="sm"
                    variant={userAnswer === opt ? 'solid' : 'outline'}
                    colorScheme={isChecked && opt === String(item.answer) ? 'green' : 'blue'}
                    onClick={() => !isChecked && setAnswers((a) => ({ ...a, [i]: opt }))}
                    isDisabled={isChecked}
                  >
                    {opt}
                  </Button>
                ))}
              </HStack>
            )}

            {item.kind === 'fill-blank' && (
              <Input
                placeholder="Type your answer"
                value={userAnswer}
                onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                isDisabled={isChecked}
                size="sm"
              />
            )}

            {item.kind === 'match' && item.pairs && (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                {item.pairs.map((pair, pi) => (
                  <HStack key={pi} fontSize="sm">
                    <Text fontWeight="semibold">{pair.left}</Text>
                    <Text>→</Text>
                    <Text color="gray.600">{pair.right}</Text>
                  </HStack>
                ))}
              </SimpleGrid>
            )}

            {item.kind === 'sequence' && item.sequence && (
              <VStack align="stretch" spacing={1}>
                {item.sequence.map((step, si) => (
                  <HStack key={si} p={2} bg="gray.50" borderRadius="md">
                    <Badge>{si + 1}</Badge>
                    <Text fontSize="sm">{step}</Text>
                  </HStack>
                ))}
              </VStack>
            )}

            {!isChecked && item.kind !== 'match' && item.kind !== 'sequence' && userAnswer && (
              <Button mt={2} size="xs" colorScheme="blue" onClick={() => setChecked((c) => ({ ...c, [i]: true }))}>
                Check
              </Button>
            )}
            {isChecked && (
              <Text mt={2} fontSize="sm" color={correct ? 'green.600' : 'orange.600'}>
                {correct ? '✅ Correct!' : `Answer: ${String(item.answer)}`}
              </Text>
            )}
          </Box>
        );
      })}
    </VStack>
  );
};
