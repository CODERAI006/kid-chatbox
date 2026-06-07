/**
 * Practice Q&A section for study lessons.
 */
import { useState } from 'react';
import {
  Box, VStack, Text, Button, Badge, Collapse, HStack,
} from '@/shared/design-system';
import { motion } from 'framer-motion';
import type { PracticeQuestion } from '@/services/study';

interface PracticeQASectionProps {
  questions: PracticeQuestion[];
  fontSize?: string;
}

export const PracticeQASection: React.FC<PracticeQASectionProps> = ({
  questions,
  fontSize = '16px',
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  if (!questions.length) return null;

  const toggleReveal = (idx: number) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <VStack spacing={4} align="stretch">
      {questions.map((item, index) => {
        const isOpen = openIndex === index;
        const showAnswer = revealed.has(index);
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <Box
              borderRadius="xl"
              borderWidth={2}
              borderColor={isOpen ? 'blue.300' : 'gray.200'}
              bg={isOpen ? 'blue.50' : 'white'}
              overflow="hidden"
              boxShadow="sm"
            >
              <Button
                variant="ghost"
                w="100%"
                justifyContent="flex-start"
                py={4}
                px={4}
                h="auto"
                borderRadius={0}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                _hover={{ bg: 'blue.50' }}
              >
                <HStack spacing={3} align="start" w="100%">
                  <Badge colorScheme="blue" borderRadius="full" flexShrink={0}>
                    Q{index + 1}
                  </Badge>
                  <Text fontSize={fontSize} fontWeight="semibold" textAlign="left" flex={1}>
                    {item.question}
                  </Text>
                </HStack>
              </Button>
              <Collapse in={isOpen}>
                <Box px={4} pb={4}>
                  {item.hint && !showAnswer && (
                    <Text fontSize="sm" color="gray.600" mb={3} fontStyle="italic">
                      💡 Hint: {item.hint}
                    </Text>
                  )}
                  <Button
                    size="sm"
                    colorScheme={showAnswer ? 'green' : 'blue'}
                    variant={showAnswer ? 'outline' : 'solid'}
                    onClick={() => toggleReveal(index)}
                    mb={showAnswer ? 3 : 0}
                  >
                    {showAnswer ? 'Hide answer' : 'Show answer'}
                  </Button>
                  <Collapse in={showAnswer}>
                    <Box
                      mt={2}
                      p={4}
                      bg="green.50"
                      borderRadius="lg"
                      borderLeftWidth={4}
                      borderLeftColor="green.400"
                    >
                      <Text fontSize="xs" fontWeight="bold" color="green.700" mb={1}>
                        ANSWER
                      </Text>
                      <Text fontSize={fontSize} color="gray.800" lineHeight="tall">
                        {item.answer}
                      </Text>
                    </Box>
                  </Collapse>
                </Box>
              </Collapse>
            </Box>
          </motion.div>
        );
      })}
    </VStack>
  );
};
