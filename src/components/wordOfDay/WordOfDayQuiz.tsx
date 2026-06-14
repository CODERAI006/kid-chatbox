/**
 * Interactive vocabulary quiz for Word of the Day detail page.
 */

import { useState } from 'react';
import {
  Box, Text, VStack, Button, HStack, Badge,
} from '@/shared/design-system';
import type { WordQuiz } from '@/types/wordOfDay';

interface WordOfDayQuizProps {
  quiz: WordQuiz;
  word: string;
}

export const WordOfDayQuiz: React.FC<WordOfDayQuizProps> = ({ quiz, word }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handlePick = (option: string) => {
    if (revealed) return;
    setSelected(option);
    setRevealed(true);
  };

  const isCorrect = selected === quiz.answer;

  return (
    <Box bg="yellow.50" p={4} borderRadius="lg" borderLeft="4px solid" borderLeftColor="yellow.400">
      <HStack mb={3} spacing={2}>
        <Text fontWeight="bold" color="yellow.800">🎯 Daily Quiz</Text>
        <Badge colorScheme="yellow" fontSize="2xs">Vocabulary</Badge>
      </HStack>
      <Text color="gray.700" mb={3} fontSize="sm">{quiz.question}</Text>
      <VStack spacing={2} align="stretch">
        {quiz.options.map((option) => {
          let variant: 'outline' | 'solid' | 'ghost' = 'outline';
          let colorScheme = 'gray';
          if (revealed) {
            if (option === quiz.answer) { variant = 'solid'; colorScheme = 'green'; }
            else if (option === selected) { variant = 'solid'; colorScheme = 'red'; }
          } else if (option === selected) {
            variant = 'solid';
            colorScheme = 'purple';
          }
          return (
            <Button
              key={option}
              size="sm"
              variant={variant}
              colorScheme={colorScheme}
              justifyContent="flex-start"
              onClick={() => handlePick(option)}
              isDisabled={revealed}
            >
              {option}
            </Button>
          );
        })}
      </VStack>
      {revealed && (
        <Text mt={3} fontSize="sm" fontWeight="semibold" color={isCorrect ? 'green.700' : 'orange.700'}>
          {isCorrect
            ? `Great job! "${quiz.answer}" is the opposite of "${word}".`
            : `The answer is "${quiz.answer}". Keep learning!`}
        </Text>
      )}
    </Box>
  );
};
