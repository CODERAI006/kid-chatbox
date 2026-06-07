/**
 * AllQuestionsView component displays all quiz questions at once for quick answering
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Box, VStack, Text, Button, Card, CardBody, HStack } from '@/shared/design-system';
import { Question } from '@/types/quiz';
import { QuizQuestionImage } from '@/components/quiz/QuizQuestionImage';

interface AllQuestionsViewProps {
  questions: Question[];
  answers: Map<number, 'A' | 'B' | 'C' | 'D'>;
  onAnswerSelect: (questionNumber: number, answer: 'A' | 'B' | 'C' | 'D') => void;
}

/**
 * Displays all quiz questions at once for quick answering
 * @param questions - Array of all questions
 * @param answers - Map of question numbers to selected answers
 * @param onAnswerSelect - Callback when an answer is selected
 */
export const AllQuestionsView: React.FC<AllQuestionsViewProps> = ({
  questions,
  answers,
  onAnswerSelect,
}) => {
  return (
    <VStack spacing={6} width="100%" maxWidth="1000px" marginX="auto">
      <AnimatePresence mode="popLayout">
        {questions.map((question, index) => {
          const selectedAnswer = answers.get(question.number);
          const options = [
            { key: 'A' as const, value: question.options.A },
            { key: 'B' as const, value: question.options.B },
            { key: 'C' as const, value: question.options.C },
            { key: 'D' as const, value: question.options.D },
          ];

          return (
            <motion.div
              key={question.number}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                duration: 0.4,
                delay: index * 0.1,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              whileHover={{ scale: 1.02 }}
              style={{ width: '100%' }}
            >
              <Card width="100%" boxShadow="lg" borderRadius="xl" overflow="hidden">
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      <Text fontSize="lg" fontWeight="bold" color="blue.600">
                        Q{question.number}. {question.question}
                      </Text>
                    </motion.div>

                    <QuizQuestionImage imageUrl={question.imageUrl} />

                    <HStack spacing={2} flexWrap="wrap" w="100%">
                      {options.map((option, optIndex) => {
                        const isSelected = selectedAnswer === option.key;
                        return (
                          <motion.div
                            key={option.key}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: index * 0.1 + optIndex * 0.05 + 0.3,
                              type: 'spring',
                              stiffness: 200,
                              damping: 15,
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              onClick={() => onAnswerSelect(question.number, option.key)}
                              colorScheme={isSelected ? 'blue' : 'gray'}
                              variant={isSelected ? 'solid' : 'outline'}
                              size={{ base: 'sm', md: 'md' }}
                              minWidth={{ base: '100%', sm: '120px' }}
                              flex={{ base: '1 1 100%', sm: '0 1 auto' }}
                              whiteSpace="normal"
                              height="auto"
                              py={2}
                              boxShadow={isSelected ? 'md' : 'sm'}
                              transition="all 0.2s"
                            >
                              {option.key}) {option.value}
                            </Button>
                          </motion.div>
                        );
                      })}
                    </HStack>

                    <AnimatePresence>
                      {selectedAnswer && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Box
                            padding={2}
                            borderRadius="md"
                            bg="blue.50"
                            borderLeftWidth={4}
                            borderLeftColor="blue.500"
                          >
                            <Text fontSize="sm" color="blue.700" fontWeight="semibold">
                              ✓ Selected: {selectedAnswer}
                            </Text>
                          </Box>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </VStack>
                </CardBody>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </VStack>
  );
};

