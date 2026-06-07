/**
 * Compact word list for dashboard sidebar — full content, no internal scroll.
 */

import { useNavigate } from 'react-router-dom';
import { Box, Text, HStack, Badge, Button, VStack } from '@/shared/design-system';
import type { WordEntry, WordComplexity } from '@/types/wordOfDay';

const CHIP_COLORS = ['purple', 'blue', 'teal'] as const;

interface WordOfDayDashboardListProps {
  words: WordEntry[];
  complexity: WordComplexity;
  grade: string;
  date: string;
}

export const WordOfDayDashboardList: React.FC<WordOfDayDashboardListProps> = ({
  words,
  complexity,
  grade,
  date,
}) => {
  const navigate = useNavigate();

  const openWord = (word: string) => {
    const params = new URLSearchParams({ date, grade });
    navigate(`/word-of-day/${encodeURIComponent(word)}?${params}`);
  };

  return (
    <VStack spacing={3} align="stretch">
      {words.map((entry, index) => {
        const definition = entry.meanings[0]?.definitions[0]?.definition ?? '';
        const partOfSpeech = entry.meanings[0]?.partOfSpeech;
        const color = CHIP_COLORS[index % CHIP_COLORS.length];
        return (
          <Box
            key={entry.word}
            p={3}
            borderRadius="md"
            bg={`${color}.50`}
            borderWidth="1px"
            borderColor={`${color}.200`}
            cursor="pointer"
            onClick={() => openWord(entry.word)}
            _hover={{ boxShadow: 'sm' }}
            transition="box-shadow 0.2s"
          >
            <HStack justify="space-between" mb={1} flexWrap="wrap" gap={1}>
              <Text
                fontSize="md"
                fontWeight="bold"
                color={`${color}.700`}
                textTransform="capitalize"
              >
                {entry.word}
              </Text>
              {index === 0 && (
                <Badge colorScheme={color} fontSize="2xs">
                  {complexity}
                </Badge>
              )}
            </HStack>
            {partOfSpeech && (
              <Text fontSize="xs" color="gray.500" textTransform="capitalize" mb={1}>
                {partOfSpeech}
              </Text>
            )}
            <Text fontSize="sm" color="gray.700" noOfLines={2} lineHeight="1.5">
              {definition}
            </Text>
          </Box>
        );
      })}

      <Button
        size="sm"
        variant="outline"
        colorScheme="purple"
        onClick={() => openWord(words[0]?.word ?? '')}
      >
        Open word details
      </Button>
    </VStack>
  );
};
