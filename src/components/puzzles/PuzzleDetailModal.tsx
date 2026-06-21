/**
 * Puzzle detail modal — check answer with ✓ / ✗ icons, no difficulty shown.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  VStack, Text, Button, Badge, HStack, Box, Flex, Icon,
} from '@/shared/design-system';
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';
import type { Puzzle } from '@/types/puzzle';
import { PUZZLE_CATEGORY_EMOJI } from '@/constants/puzzles';

interface Props {
  puzzle: Puzzle | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PuzzleDetailModal({ puzzle, isOpen, onClose }: Props) {
  const [selected, setSelected] = useState<string | number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    if (!puzzle || !isOpen) return;
    setSelected(null);
    setRevealed(false);
    setIsCorrect(false);
  }, [puzzle, isOpen]);

  const checkAnswer = useCallback(() => {
    if (!puzzle) return;
    if (puzzle.options?.length && selected == null) return;
    setRevealed(true);
    if (puzzle.options?.length) {
      setIsCorrect(String(selected) === String(puzzle.answer));
    }
  }, [puzzle, selected]);

  if (!puzzle) return null;

  const emoji = PUZZLE_CATEGORY_EMOJI[puzzle.category] || '🧩';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md">{emoji} {puzzle.puzzleType}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack align="stretch" spacing={4}>
            <Badge colorScheme="purple" alignSelf="flex-start">{puzzle.category}</Badge>
            {puzzle.skillArea && (
              <Text fontSize="xs" color="teal.600">🎯 Skill: {puzzle.skillArea}</Text>
            )}
            <Text whiteSpace="pre-wrap" fontWeight="medium">{puzzle.question}</Text>

            {puzzle.options?.length ? (
              <VStack align="stretch" spacing={2}>
                {puzzle.options.map((opt) => {
                  const optStr = String(opt);
                  const isSelected = selected === opt;
                  const answerMatch = String(puzzle.answer) === optStr;
                  const showCorrect = revealed && answerMatch;
                  const showWrong = revealed && isSelected && !answerMatch;

                  return (
                    <Button
                      key={optStr}
                      variant={isSelected ? 'solid' : 'outline'}
                      colorScheme={showCorrect ? 'green' : showWrong ? 'red' : 'blue'}
                      justifyContent="space-between"
                      onClick={() => !revealed && setSelected(opt)}
                      isDisabled={revealed}
                      rightIcon={
                        showCorrect ? <Icon as={FiCheckCircle} boxSize={5} /> :
                        showWrong ? <Icon as={FiXCircle} boxSize={5} /> : undefined
                      }
                    >
                      {optStr}
                    </Button>
                  );
                })}
              </VStack>
            ) : (
              <Text fontSize="sm" color="gray.600">Think of your answer, then tap below to reveal.</Text>
            )}

            {!revealed ? (
              <Button colorScheme="purple" onClick={checkAnswer} isDisabled={!!puzzle.options?.length && selected == null}>
                {puzzle.options?.length ? 'Check Answer' : 'Reveal Answer'}
              </Button>
            ) : (
              <VStack spacing={3} align="stretch">
                {isCorrect && (
                  <Flex align="center" justify="center" gap={2} py={3} bg="green.50" borderRadius="lg">
                    <Icon as={FiCheckCircle} boxSize={10} color="green.500" />
                    <Text fontWeight="bold" color="green.700" fontSize="lg">Correct!</Text>
                  </Flex>
                )}
                {revealed && puzzle.options?.length && !isCorrect && (
                  <Flex align="center" justify="center" gap={2} py={2} bg="orange.50" borderRadius="lg">
                    <Icon as={FiXCircle} boxSize={8} color="orange.500" />
                    <Text fontWeight="semibold" color="orange.700">Keep learning!</Text>
                  </Flex>
                )}
                <Box bg="blue.50" p={3} borderRadius="md">
                  <HStack mb={1}>
                    <Icon as={FiCheckCircle} color="blue.600" />
                    <Text fontSize="sm" fontWeight="bold" color="blue.700">Answer: {String(puzzle.answer)}</Text>
                  </HStack>
                  <Text fontSize="sm" mt={2}>{puzzle.explanation}</Text>
                </Box>
              </VStack>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
