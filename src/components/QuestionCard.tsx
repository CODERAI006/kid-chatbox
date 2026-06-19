/**
 * QuestionCard component displays a single quiz question with options
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Box, VStack, Text, Button, Card, CardBody, HStack } from '@/shared/design-system';
import { Question } from '@/types/quiz';
import { QuizQuestionImage } from '@/components/quiz/QuizQuestionImage';

interface QuestionCardProps {
  question: Question;
  onAnswerSelect: (answer: 'A' | 'B' | 'C' | 'D') => void;
  selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
  showFeedback: boolean;
  isCorrect: boolean | null;
}

/**
 * Displays a quiz question with multiple choice options
 * @param question - The question object to display
 * @param onAnswerSelect - Callback when an answer is selected
 * @param selectedAnswer - Currently selected answer
 * @param showFeedback - Whether to show feedback after answering
 * @param isCorrect - Whether the selected answer is correct
 */
export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onAnswerSelect,
  selectedAnswer,
  showFeedback,
  isCorrect,
}) => {
  const options = [
    { key: 'A' as const, value: question.options.A },
    { key: 'B' as const, value: question.options.B },
    { key: 'C' as const, value: question.options.C },
    { key: 'D' as const, value: question.options.D },
  ];

  return (
    <Card width="100%" maxWidth="800px" margin="0 auto">
      <CardBody p={{ base: 3, sm: 4, md: 5, lg: 6 }}>
        <VStack spacing={{ base: 4, md: 6 }} align="stretch">
          <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="blue.600">
            Q{question.number}. {question.question}
          </Text>

          <QuizQuestionImage imageUrl={question.imageUrl} imagePrompt={question.imagePrompt} />

          <VStack spacing={3} align="stretch">
            {options.map((option) => {
              const isSelected = selectedAnswer === option.key;
              const isCorrectOption = option.key === question.correctAnswer;
              let buttonColorScheme = 'gray';
              let variant: 'solid' | 'outline' = 'outline';

              if (showFeedback) {
                if (isCorrectOption) {
                  buttonColorScheme = 'green';
                  variant = 'solid';
                } else if (isSelected && !isCorrect) {
                  buttonColorScheme = 'red';
                  variant = 'solid';
                }
              } else if (isSelected) {
                buttonColorScheme = 'blue';
                variant = 'solid';
              }

              return (
                <Button
                  key={option.key}
                  onClick={() => onAnswerSelect(option.key)}
                  colorScheme={buttonColorScheme}
                  variant={variant}
                  size={{ base: 'md', md: 'lg' }}
                  justifyContent="flex-start"
                  textAlign="left"
                  height="auto"
                  paddingY={{ base: 3, md: 4 }}
                  whiteSpace="normal"
                  isDisabled={showFeedback}
                  w="100%"
                >
                  <Text fontWeight="bold" marginRight={2} fontSize={{ base: 'sm', md: 'md' }}>
                    {option.key})
                  </Text>
                  <Text flex={1} fontSize={{ base: 'sm', md: 'md' }}>{option.value}</Text>
                </Button>
              );
            })}
          </VStack>

          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
              >
                <Box
                  padding={5}
                  borderRadius="xl"
                  bg={isCorrect ? 'green.50' : 'orange.50'}
                  borderWidth={3}
                  borderColor={isCorrect ? 'green.400' : 'orange.400'}
                  boxShadow="lg"
                  position="relative"
                  overflow="hidden"
                >
                  {/* Animated background effect */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '200px',
                      height: '200px',
                      borderRadius: '50%',
                      background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(251, 146, 60, 0.1)',
                      transform: 'translate(-50%, -50%)',
                    }}
                  />

                  <VStack spacing={4} align="stretch" position="relative" zIndex={1}>
                    {/* Header with animated icon */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    >
                      <HStack spacing={3} align="center">
                        <motion.div
                          animate={{
                            rotate: [0, 10, -10, 0],
                            scale: [1, 1.1, 1],
                          }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            repeatDelay: 2,
                          }}
                        >
                          <Text fontSize="3xl" role="img" aria-label={isCorrect ? 'Correct' : 'Incorrect'}>
                            {isCorrect ? '🎉' : '💡'}
                          </Text>
                        </motion.div>
                        <VStack align="flex-start" spacing={1}>
                          <Text
                            fontSize={{ base: 'lg', md: 'xl' }}
                            fontWeight="bold"
                            color={isCorrect ? 'green.800' : 'orange.800'}
                          >
                            {isCorrect ? 'Excellent! Correct Answer!' : 'Not Quite Right'}
                          </Text>
                          {!isCorrect && (
                            <Text fontSize="md" color="orange.700" fontWeight="semibold">
                              Correct Answer: {question.correctAnswer}
                            </Text>
                          )}
                        </VStack>
                      </HStack>
                    </motion.div>

                    {/* Success/Encouragement Message */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Box
                        padding={3}
                        borderRadius="md"
                        bg={isCorrect ? 'green.100' : 'orange.100'}
                        borderLeftWidth={4}
                        borderLeftColor={isCorrect ? 'green.500' : 'orange.500'}
                      >
                        <Text fontSize="sm" fontWeight="semibold" color={isCorrect ? 'green.800' : 'orange.800'}>
                          {isCorrect
                            ? '🌟 Great job! You got it right! Keep up the excellent work!'
                            : "Don't worry! Every mistake is a learning opportunity. Let's review the explanation below."}
                        </Text>
                      </Box>
                    </motion.div>

                    {/* Detailed Explanation */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Box
                        padding={4}
                        bg="white"
                        borderRadius="lg"
                        borderLeftWidth={4}
                        borderLeftColor={isCorrect ? 'green.500' : 'orange.500'}
                        boxShadow="sm"
                      >
                        <HStack spacing={2} marginBottom={3}>
                          <Text fontSize="xl" role="img" aria-label="Book">
                            📚
                          </Text>
                          <Text fontSize="md" fontWeight="bold" color="gray.700">
                            Detailed Explanation:
                          </Text>
                        </HStack>
                        <Text fontSize="md" color="gray.700" lineHeight="tall">
                          {question.explanation}
                        </Text>
                      </Box>
                    </motion.div>

                    {/* Incorrect Answer Feedback */}
                    {!isCorrect && selectedAnswer && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <Box
                          padding={4}
                          bg="red.50"
                          borderRadius="lg"
                          borderWidth={2}
                          borderColor="red.200"
                        >
                          <HStack spacing={2} marginBottom={2}>
                            <Text fontSize="lg" role="img" aria-label="Info">
                              ℹ️
                            </Text>
                            <Text fontSize="sm" fontWeight="bold" color="red.800">
                              Your Answer Review:
                            </Text>
                          </HStack>
                          <Text fontSize="sm" color="red.700" lineHeight="tall">
                            <Text as="span" fontWeight="bold">
                              Your answer ({selectedAnswer})
                            </Text>{' '}
                            was incorrect. Review the explanation above to understand why{' '}
                            <Text as="span" fontWeight="bold" color="green.700">
                              {question.correctAnswer}
                            </Text>{' '}
                            is the correct choice. Remember, learning from mistakes helps you improve! 💪
                          </Text>
                        </Box>
                      </motion.div>
                    )}

                    {/* Encouragement for correct answers */}
                    {isCorrect && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                      >
                        <Text fontSize="sm" color="green.700" fontWeight="medium" textAlign="center" fontStyle="italic">
                          ✨ You're doing amazing! Keep going! ✨
                        </Text>
                      </motion.div>
                    )}
                  </VStack>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </VStack>
      </CardBody>
    </Card>
  );
};

