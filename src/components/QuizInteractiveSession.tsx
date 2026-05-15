/**
 * Step-by-step quiz UI: one question at a time with clear progress and large tap targets.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  VStack,
  Text,
  Button,
  HStack,
  Progress,
} from '@/shared/design-system';
import type { Question } from '@/types/quiz';

export interface QuizInteractiveSessionProps {
  questions: Question[];
  currentIndex: number;
  answers: Map<number, 'A' | 'B' | 'C' | 'D'>;
  onAnswerSelect: (questionNumber: number, answer: 'A' | 'B' | 'C' | 'D') => void;
  onStepChange: (index: number) => void;
  onShowOverview: () => void;
}

export const QuizInteractiveSession: React.FC<QuizInteractiveSessionProps> = ({
  questions,
  currentIndex,
  answers,
  onAnswerSelect,
  onStepChange,
  onShowOverview,
}) => {
  const q = questions[currentIndex];
  if (!q) {
    return null;
  }
  const selected = answers.get(q.number);
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const options = [
    { key: 'A' as const, label: q.options.A },
    { key: 'B' as const, label: q.options.B },
    { key: 'C' as const, label: q.options.C },
    { key: 'D' as const, label: q.options.D },
  ];

  return (
    <VStack spacing={6} width="100%" maxW="720px" mx="auto" align="stretch">
      <Box>
        <HStack justify="space-between" mb={2}>
          <Text fontSize="sm" fontWeight="bold" color="blue.700">
            Question {currentIndex + 1} / {questions.length}
          </Text>
          <Button size="xs" variant="link" colorScheme="blue" onClick={onShowOverview}>
            See all questions
          </Button>
        </HStack>
        <Progress value={progress} size="sm" colorScheme="blue" borderRadius="full" hasStripe />
      </Box>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.number}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
        >
          <Box
            borderRadius="2xl"
            bg="linear-gradient(135deg, #ebf8ff 0%, #e6fffa 100%)"
            borderWidth="1px"
            borderColor="blue.100"
            p={{ base: 5, md: 8 }}
            boxShadow="xl"
          >
            <Text
              fontSize={{ base: 'lg', md: 'xl' }}
              fontWeight="bold"
              color="gray.800"
              lineHeight="tall"
              mb={6}
            >
              {q.question}
            </Text>

            <VStack spacing={3} align="stretch">
              {options.map((opt, i) => {
                const isOn = selected === opt.key;
                return (
                  <motion.div
                    key={opt.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Button
                      width="100%"
                      height="auto"
                      py={4}
                      px={4}
                      justifyContent="flex-start"
                      whiteSpace="normal"
                      textAlign="left"
                      borderRadius="xl"
                      variant={isOn ? 'solid' : 'outline'}
                      colorScheme={isOn ? 'blue' : 'gray'}
                      borderWidth={2}
                      boxShadow={isOn ? 'md' : 'sm'}
                      onClick={() => onAnswerSelect(q.number, opt.key)}
                      leftIcon={
                        <Box
                          minW="36px"
                          h="36px"
                          borderRadius="full"
                          bg={isOn ? 'whiteAlpha.300' : 'blue.50'}
                          color={isOn ? 'white' : 'blue.600'}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          fontWeight="black"
                          fontSize="md"
                        >
                          {opt.key}
                        </Box>
                      }
                    >
                      <Text flex={1} fontSize={{ base: 'md', md: 'lg' }}>
                        {opt.label}
                      </Text>
                    </Button>
                  </motion.div>
                );
              })}
            </VStack>
          </Box>
        </motion.div>
      </AnimatePresence>

      <HStack justify="space-between" width="100%" flexWrap="wrap" gap={3}>
        <Button
          variant="outline"
          onClick={() => onStepChange(Math.max(0, currentIndex - 1))}
          isDisabled={currentIndex === 0}
        >
          ← Back
        </Button>
        <HStack spacing={1} flex={1} justify="center" display={{ base: 'none', sm: 'flex' }}>
          {questions.map((_, i) => (
            <Box
              key={i}
              w={i === currentIndex ? '10px' : '6px'}
              h={i === currentIndex ? '10px' : '6px'}
              borderRadius="full"
              bg={i === currentIndex ? 'blue.500' : i < currentIndex ? 'blue.200' : 'gray.200'}
              transition="all 0.2s"
            />
          ))}
        </HStack>
        <Button
          colorScheme="blue"
          onClick={() => onStepChange(Math.min(questions.length - 1, currentIndex + 1))}
          isDisabled={currentIndex >= questions.length - 1}
        >
          Next →
        </Button>
      </HStack>
    </VStack>
  );
};
