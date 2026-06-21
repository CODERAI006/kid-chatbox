/**
 * Puzzle detail modal — attempt, reveal answer, show explanation.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  VStack, Text, Button, Badge, HStack, Box, useToast,
} from '@/shared/design-system';
import type { Puzzle } from '@/types/puzzle';
import { PUZZLE_CATEGORY_EMOJI, DIFFICULTY_COLOR } from '@/constants/puzzles';

interface Props {
  puzzle: Puzzle | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PuzzleDetailModal({ puzzle, isOpen, onClose }: Props) {
  const toast = useToast();
  const [selected, setSelected] = useState<string | number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!puzzle || !isOpen) return;
    setSelected(null);
    setRevealed(false);
    setTimeLeft(puzzle.timeLimit);
  }, [puzzle, isOpen]);

  useEffect(() => {
    if (!isOpen || !puzzle || revealed || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isOpen, puzzle, revealed, timeLeft]);

  const checkAnswer = useCallback(() => {
    if (!puzzle || selected == null) return;
    setRevealed(true);
    const correct = String(selected) === String(puzzle.answer);
    toast({
      title: correct ? 'Correct! 🎉' : 'Not quite — learn from the explanation',
      status: correct ? 'success' : 'info',
      duration: 3000,
    });
  }, [puzzle, selected, toast]);

  if (!puzzle) return null;

  const emoji = PUZZLE_CATEGORY_EMOJI[puzzle.category] || '🧩';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md">
          {emoji} {puzzle.puzzleType}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack align="stretch" spacing={4}>
            <HStack flexWrap="wrap" gap={2}>
              <Badge colorScheme="purple">{puzzle.category}</Badge>
              <Badge colorScheme={DIFFICULTY_COLOR[puzzle.difficulty]}>{puzzle.difficulty}</Badge>
              <Badge>{puzzle.points} pts</Badge>
              {!revealed && <Badge colorScheme={timeLeft <= 10 ? 'red' : 'gray'}>{timeLeft}s</Badge>}
            </HStack>
            <Text whiteSpace="pre-wrap" fontWeight="medium">{puzzle.question}</Text>
            {puzzle.options?.length ? (
              <VStack align="stretch" spacing={2}>
                {puzzle.options.map((opt) => {
                  const isSelected = selected === opt;
                  const isCorrect = revealed && String(opt) === String(puzzle.answer);
                  const isWrong = revealed && isSelected && !isCorrect;
                  return (
                    <Button
                      key={String(opt)}
                      variant={isSelected ? 'solid' : 'outline'}
                      colorScheme={isCorrect ? 'green' : isWrong ? 'red' : 'blue'}
                      justifyContent="flex-start"
                      onClick={() => !revealed && setSelected(opt)}
                      isDisabled={revealed}
                    >
                      {String(opt)}
                    </Button>
                  );
                })}
              </VStack>
            ) : (
              <Box>
                <Text fontSize="sm" color="gray.600">Type your answer mentally, then reveal.</Text>
              </Box>
            )}
            {!revealed ? (
              <Button colorScheme="purple" onClick={checkAnswer} isDisabled={puzzle.options?.length ? selected == null : false}>
                Check Answer
              </Button>
            ) : (
              <Box bg="blue.50" p={3} borderRadius="md">
                <Text fontSize="sm" fontWeight="bold" color="blue.700">Answer: {String(puzzle.answer)}</Text>
                <Text fontSize="sm" mt={2}>{puzzle.explanation}</Text>
              </Box>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
