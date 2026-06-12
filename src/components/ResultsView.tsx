/**
 * ResultsView component displays quiz results with all answers and explanations
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  VStack,
  Text,
  Heading,
  Card,
  CardBody,
  Button,
  Progress,
  Alert,
  AlertIcon,
  AlertDescription,
  HStack,
  List,
  ListItem,
  ListIcon,
} from '@/shared/design-system';
import { AnswerResult, QuizConfig } from '@/types/quiz';
import { MESSAGES } from '@/constants/quiz';
import { MESSAGES as APP_MESSAGES } from '@/constants/app';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Certificate } from './Certificate';
import { generateCertificate } from '@/utils/certificate';
import { authApi } from '@/services/api';
import { FeedbackPromptCard } from '@/components/feedback/FeedbackPromptCard';

interface ResultsViewProps {
  score: number;
  totalQuestions: number;
  allAnswerResults: AnswerResult[];
  config: QuizConfig;
  improvementTips: string[];
  resultSaved: boolean;
  timeTaken: number; // Time taken in seconds
  onStartNewQuiz: () => void;
  onRetrySameTopic: () => void;
  onBackToDashboard: () => void;
}

/**
 * Displays quiz results with score, all answers with explanations, and improvement tips
 * @param score - Number of correct answers
 * @param totalQuestions - Total number of questions
 * @param allAnswerResults - Array of all answers with results
 * @param config - Quiz configuration
 * @param improvementTips - Tips for improvement
 * @param onStartNewQuiz - Callback to start a new quiz
 * @param onRetrySameTopic - Callback to retry the same topic
 */
export const ResultsView: React.FC<ResultsViewProps> = ({
  score,
  totalQuestions,
  allAnswerResults,
  config,
  improvementTips,
  resultSaved,
  timeTaken,
  onStartNewQuiz,
  onRetrySameTopic,
  onBackToDashboard,
}) => {
  const { canTakeQuiz, planInfo } = usePlanLimits();
  const percentage = Math.round((score / totalQuestions) * 100);
  const PASSING_THRESHOLD = 60;
  const hasPassed = percentage >= PASSING_THRESHOLD;
  
  // Get student name from current user
  const { user } = authApi.getCurrentUser();
  const studentName = (user as { name?: string })?.name || 'Student';

  // Format time taken
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Extract key improvement areas from wrong answers
  const getKeyImprovementAreas = (): string[] => {
    const wrongAnswers = allAnswerResults.filter((r) => !r.isCorrect);
    if (wrongAnswers.length === 0) return [];

    const areas: string[] = [];
    
    // Analyze wrong answers to identify patterns
    const topics = new Set<string>();
    wrongAnswers.forEach((answer) => {
      // Extract topic/subject from question (simple keyword extraction)
      const question = answer.question.toLowerCase();
      if (question.includes('grammar') || question.includes('tense') || question.includes('verb')) {
        topics.add('Grammar and Language Rules');
      }
      if (question.includes('calculation') || question.includes('solve') || question.includes('math')) {
        topics.add('Problem Solving and Calculations');
      }
      if (question.includes('remember') || question.includes('recall') || question.includes('define')) {
        topics.add('Memory and Recall');
      }
      if (question.includes('understand') || question.includes('explain') || question.includes('why')) {
        topics.add('Concept Understanding');
      }
      if (question.includes('apply') || question.includes('use') || question.includes('practice')) {
        topics.add('Application of Concepts');
      }
    });

    // Add specific improvement areas based on wrong answers
    if (topics.size > 0) {
      areas.push(...Array.from(topics));
    } else {
      // Generic improvement areas if no specific patterns found
      areas.push('Review the topics you got wrong');
      areas.push('Practice more questions on similar concepts');
      areas.push('Focus on understanding explanations');
    }

    // Add count-based insights
    if (wrongAnswers.length > totalQuestions * 0.5) {
      areas.unshift('Need more practice on fundamental concepts');
    }
    if (wrongAnswers.some((a) => !a.childAnswer)) {
      areas.push('Work on time management to answer all questions');
    }

    return areas.slice(0, 5); // Limit to 5 key areas
  };

  const keyImprovementAreas = hasPassed ? [] : getKeyImprovementAreas();

  return (
    <VStack spacing={6} width="100%" maxWidth="900px" margin="0 auto">
      {/* Celebration Animation for Passing */}
      {hasPassed && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: 'spring', stiffness: 100 }}
          style={{ width: '100%' }}
        >
          <Card
            width="100%"
            boxShadow="2xl"
            borderRadius="xl"
            bgGradient="linear(to-r, green.400, green.500, green.600)"
            borderWidth={4}
            borderColor="green.300"
          >
            <CardBody>
              <VStack spacing={4}>
                {/* Animated Celebration Icons */}
                <HStack spacing={4} justifyContent="center" flexWrap="wrap">
                  {['🎉', '🏆', '⭐', '🎊', '👏'].map((emoji, index) => (
                    <motion.div
                      key={emoji}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ 
                        scale: [0, 1.2, 1],
                        rotate: [0, 360],
                      }}
                      transition={{
                        delay: index * 0.1,
                        duration: 0.6,
                        type: 'spring',
                        stiffness: 200,
                      }}
                      whileHover={{ scale: 1.3, rotate: 360 }}
                    >
                      <Text fontSize="4xl">{emoji}</Text>
                    </motion.div>
                  ))}
                </HStack>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Heading
                    size="2xl"
                    color="white"
                    textAlign="center"
                    textShadow="2px 2px 4px rgba(0,0,0,0.2)"
                  >
                    🎊 Congratulations! 🎊
                  </Heading>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7, type: 'spring', stiffness: 150 }}
                >
                  <Text fontSize="xl" fontWeight="bold" color="white" textAlign="center">
                    You've Passed with {percentage}%!
                  </Text>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <Text fontSize="lg" color="green.50" textAlign="center" fontWeight="semibold">
                    Excellent work! Keep up the great effort! 🌟
                  </Text>
                </motion.div>
              </VStack>
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* Certificate Component - Shows after congratulations */}
      {hasPassed && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2, type: 'spring', stiffness: 100 }}
          style={{ width: '100%' }}
        >
          <Certificate
            studentName={studentName}
            quizName={config?.subtopics?.length > 0 ? `${config.subject} - ${config.subtopics.join(', ')}` : config?.subject || 'Quiz'}
            score={score}
            totalQuestions={totalQuestions}
            percentage={percentage}
            date={new Date().toISOString()}
            onDownload={async () => {
              try {
                await generateCertificate({
                  studentName,
                  quizName: config?.subtopics?.length > 0 ? `${config.subject} - ${config.subtopics.join(', ')}` : config?.subject || 'Quiz',
                  rank: 1, // Default rank, can be updated if ranking system exists
                  score: percentage,
                  compositeScore: percentage,
                  date: new Date().toISOString(),
                  totalParticipants: 1, // Default, can be updated if needed
                });
              } catch (error) {
                console.error('Failed to generate certificate:', error);
              }
            }}
          />
        </motion.div>
      )}

      {/* Results Card */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: hasPassed ? 1 : 0 }}
        style={{ width: '100%' }}
      >
        <Card width="100%" boxShadow="xl" borderRadius="xl">
          <CardBody>
            <VStack spacing={4}>
              {!hasPassed && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <Heading size="lg" color="blue.600" textAlign="center">
                    {MESSAGES.QUIZ_COMPLETED}
                  </Heading>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: hasPassed ? 1.2 : 0.3 }}
              >
                <Text fontSize="xl" fontWeight="bold" textAlign="center" color={hasPassed ? 'green.600' : 'gray.700'}>
                  {MESSAGES.SCORE_MESSAGE} {score} out of {totalQuestions} questions correctly.
                </Text>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Text fontSize="md" color="gray.600" textAlign="center">
                  ⏱️ Time Taken: {formatTime(timeTaken)}
                </Text>
              </motion.div>

              <Box width="100%">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: hasPassed ? 1.3 : 0.5, duration: 1, ease: 'easeOut' }}
                  style={{ transformOrigin: 'left' }}
                >
                  <Progress
                    value={percentage}
                    colorScheme={hasPassed ? 'green' : percentage >= 50 ? 'yellow' : 'orange'}
                    size="lg"
                    width="100%"
                    borderRadius="full"
                  />
                </motion.div>
              </Box>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: hasPassed ? 1.5 : 0.7 }}
              >
                <Text fontSize="md" color={hasPassed ? 'green.600' : 'gray.600'} textAlign="center" fontWeight={hasPassed ? 'semibold' : 'normal'}>
                  {hasPassed ? '🎉 Outstanding performance! You\'ve mastered this topic!' : MESSAGES.MOTIVATIONAL}
                </Text>
              </motion.div>
            </VStack>
          </CardBody>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        style={{ width: '100%' }}
      >
        <Card width="100%" boxShadow="lg" borderRadius="xl">
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md" color="blue.600">
                Review All Answers:
              </Heading>

              <AnimatePresence>
                {allAnswerResults.map((result, index) => {
              const bgColor = result.isCorrect ? 'green.50' : 'orange.50';
              const borderColor = result.isCorrect ? 'green.200' : 'orange.200';
              const statusIcon = result.isCorrect ? '✅' : '❌';

                  return (
                    <motion.div
                      key={result.questionNumber}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      transition={{ delay: index * 0.1, duration: 0.4 }}
                    >
                      <Box
                        padding={4}
                        borderRadius="xl"
                        bg={bgColor}
                        borderWidth={2}
                        borderColor={borderColor}
                        boxShadow="md"
                        _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)' }}
                        transition="all 0.2s"
                      >
                  <VStack align="stretch" spacing={2}>
                    <Text fontWeight="bold" fontSize="md">
                      {statusIcon} Q{result.questionNumber}: {result.question}
                    </Text>
                    <Text fontSize="sm" color="gray.700">
                      Your answer:{' '}
                      {result.childAnswer ? (
                        <Text as="span" fontWeight="semibold">
                          {result.childAnswer}
                          {result.options && `: ${result.options[result.childAnswer]}`}
                        </Text>
                      ) : (
                        <Text as="span" fontStyle="italic" color="red.600">
                          Not answered
                        </Text>
                      )}
                    </Text>
                    <Text fontSize="sm" color="green.700" fontWeight="semibold">
                      Correct answer: {result.correctAnswer}
                      {result.options && `: ${result.options[result.correctAnswer]}`}
                    </Text>
                    {result.options && (
                      <Box marginTop={2} padding={4} bg="gray.50" borderRadius="md">
                        <Text fontSize="sm" fontWeight="semibold" marginBottom={2} color="gray.700">
                          All Options:
                        </Text>
                        <VStack align="stretch" spacing={2}>
                          {Object.entries(result.options).map(([key, value]) => {
                            const isCorrect = key === result.correctAnswer;
                            const isSelected = key === result.childAnswer;
                            return (
                              <Box
                                key={key}
                                padding={2}
                                borderRadius="sm"
                                bg={isCorrect ? 'green.100' : isSelected && !result.isCorrect ? 'red.100' : 'white'}
                                borderWidth={isCorrect ? 2 : 0}
                                borderColor={isCorrect ? 'green.400' : 'transparent'}
                              >
                                <Text fontSize="sm" color="gray.700">
                                  <Text as="span" fontWeight="bold" color={isCorrect ? 'green.700' : 'gray.700'}>
                                    {key}:
                                  </Text>{' '}
                                  {value}
                                  {isCorrect && <Text as="span" color="green.600" ml={2}>✓ Correct</Text>}
                                  {isSelected && !result.isCorrect && (
                                    <Text as="span" color="red.600" ml={2}>✗ Your Answer</Text>
                                  )}
                                </Text>
                              </Box>
                            );
                          })}
                        </VStack>
                      </Box>
                    )}
                    <Box
                      marginTop={3}
                      padding={4}
                      bg="blue.50"
                      borderRadius="md"
                      borderLeftWidth={4}
                      borderLeftColor="blue.500"
                    >
                      <Text fontSize="sm" fontWeight="bold" color="blue.800" marginBottom={2}>
                        📚 Detailed Explanation:
                      </Text>
                      <Text fontSize="sm" color="gray.700" lineHeight="tall">
                        {result.explanation}
                      </Text>
                      </Box>
                    </VStack>
                  </Box>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </VStack>
          </CardBody>
        </Card>
      </motion.div>

      {/* Key Improvement Areas - Show prominently when failed */}
      {!hasPassed && keyImprovementAreas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.5, type: 'spring' }}
          style={{ width: '100%' }}
        >
          <Card
            width="100%"
            boxShadow="xl"
            borderRadius="xl"
            bgGradient="linear(to-r, orange.50, red.50)"
            borderWidth={3}
            borderColor="orange.300"
          >
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack spacing={2} justifyContent="center">
                  <Text fontSize="3xl">🎯</Text>
                  <Heading size="lg" color="orange.700" textAlign="center">
                    Key Improvement Areas
                  </Heading>
                  <Text fontSize="3xl">🎯</Text>
                </HStack>
                <Text fontSize="md" color="orange.800" textAlign="center" fontWeight="semibold">
                  Focus on these areas to improve your score:
                </Text>
                <List spacing={3}>
                  {keyImprovementAreas.map((area, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1 + index * 0.1 }}
                    >
                      <ListItem>
                        <HStack spacing={3}>
                          <ListIcon as="span" fontSize="xl" color="orange.500">
                            📌
                          </ListIcon>
                          <Text fontSize="md" color="gray.700" fontWeight="medium">
                            {area}
                          </Text>
                        </HStack>
                      </ListItem>
                    </motion.div>
                  ))}
                </List>
              </VStack>
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* General Improvement Tips */}
      <AnimatePresence>
        {improvementTips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: hasPassed ? 1.6 : 1.2, duration: 0.5 }}
            style={{ width: '100%' }}
          >
            <Card width="100%" boxShadow="lg" borderRadius="xl">
              <CardBody>
                <VStack spacing={3} align="stretch">
                  <Heading size="md" color="blue.600">
                    {hasPassed ? '💡 Tips to Excel Further:' : '💡 Tips to Improve:'}
                  </Heading>
                  {improvementTips.map((tip, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (hasPassed ? 1.8 : 1.4) + index * 0.1 }}
                    >
                      <Alert status={hasPassed ? 'success' : 'info'} borderRadius="xl" boxShadow="sm">
                        <AlertIcon />
                        <AlertDescription>{tip}</AlertDescription>
                      </Alert>
                    </motion.div>
                  ))}
                </VStack>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resultSaved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: 1.5, type: 'spring', stiffness: 200 }}
            style={{ width: '100%' }}
          >
            <Alert status="success" borderRadius="xl" boxShadow="md">
              <AlertIcon />
              <Text fontSize="md" fontWeight="semibold">{APP_MESSAGES.QUIZ_SAVED}</Text>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <FeedbackPromptCard
        quizSubject={config.subject}
        quizScore={score}
        quizTotal={totalQuestions}
        delay={hasPassed ? 1.5 : 1.3}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.5 }}
        style={{ width: '100%' }}
      >
        <VStack spacing={3} width="100%">
          <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="semibold" textAlign="center">
            {MESSAGES.ANOTHER_QUIZ}
          </Text>
          <Box display="flex" gap={4} flexWrap="wrap" justifyContent="center" w="100%">
            {[
              { label: 'Try Same Topic Again', onClick: onRetrySameTopic, colorScheme: 'blue' as const, delay: 1.7, disabled: !canTakeQuiz },
              { label: 'Try Different Topic', onClick: onStartNewQuiz, colorScheme: 'green' as const, delay: 1.8, disabled: !canTakeQuiz },
              { label: 'Back to Dashboard', onClick: onBackToDashboard, colorScheme: 'gray' as const, delay: 1.9, disabled: false },
            ].map((button) => (
              <motion.div
                key={button.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: button.delay }}
                whileHover={!button.disabled ? { scale: 1.05 } : {}}
                whileTap={!button.disabled ? { scale: 0.95 } : {}}
              >
                <Button
                  colorScheme={button.colorScheme}
                  size={{ base: 'md', md: 'lg' }}
                  onClick={button.onClick}
                  w={{ base: '100%', sm: 'auto' }}
                  boxShadow="md"
                  _hover={!button.disabled ? { boxShadow: 'lg' } : {}}
                  isDisabled={button.disabled}
                  title={button.disabled ? `Daily quiz limit reached. You have used ${planInfo?.usage.quizCount || 0} of ${planInfo?.limits.dailyQuizLimit || 0} quizzes today.` : ''}
                >
                  {button.disabled && (button.label.includes('Topic')) ? '🚫 Limit Reached' : button.label}
                </Button>
              </motion.div>
            ))}
          </Box>
          {resultSaved && (
            <Text fontSize="sm" color="gray.600" textAlign="center" marginTop={2}>
              💡 Tip: You can view all your quiz history anytime from the menu or dashboard!
            </Text>
          )}
        </VStack>
      </motion.div>
    </VStack>
  );
};
