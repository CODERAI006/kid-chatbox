/**
 * QuizHistory component - Displays user's past quiz results
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  Text,
  Heading,
  Card,
  CardBody,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  AlertDescription,
  Badge,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Progress,
  HStack,
  Divider,
} from '@/shared/design-system';
import { quizApi, authApi } from '@/services/api';
import { QuizHistoryItem, AnswerResult } from '@/types';
import { MESSAGES } from '@/constants/app';
import { useNavigate } from 'react-router-dom';
import { PullToRefresh } from './PullToRefresh';

/**
 * Formats timestamp to readable date string
 */
const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formats time taken in seconds to readable format
 */
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

/**
 * QuizHistory component displays all past quiz results with details
 */
export const QuizHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { user } = authApi.getCurrentUser();
      if (!user || !(user as { id: string }).id) {
        setError('User not found. Please login again.');
        setLoading(false);
        return;
      }

      const response = await quizApi.getQuizHistory((user as { id: string }).id);
      if (response.success && response.results) {
        // Parse options if they're strings and sort answers by question number
        const parsedResults = response.results.map((item) => ({
          ...item,
          answers: item.answers
            .map((answer) => ({
              ...answer,
              options:
                typeof answer.options === 'string'
                  ? JSON.parse(answer.options)
                  : answer.options,
            }))
            .sort((a, b) => a.questionNumber - b.questionNumber),
        }));
        setHistory(parsedResults);
      } else {
        setHistory([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : MESSAGES.QUIZ_HISTORY_ERROR
      );
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRefresh = async () => {
    await loadHistory();
  };

  if (loading) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <Box padding={6} display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" />
            <Text fontSize="lg">{MESSAGES.QUIZ_HISTORY_LOADING}</Text>
          </VStack>
        </Box>
      </PullToRefresh>
    );
  }

  if (error) {
    return (
      <Box padding={6} maxWidth="900px" margin="0 auto">
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          marginTop={4}
          colorScheme="blue"
          onClick={loadHistory}
        >
          Retry
        </Button>
      </Box>
    );
  }

  if (history.length === 0) {
    return (
      <Box padding={6} maxWidth="900px" margin="0 auto">
        <VStack spacing={6}>
          <Heading size="lg" color="blue.600">
            {MESSAGES.QUIZ_HISTORY_TITLE}
          </Heading>
          <Card width="100%">
            <CardBody>
              <VStack spacing={4}>
                <Text fontSize="xl">📋</Text>
                <Text fontSize="lg" color="gray.600">
                  {MESSAGES.QUIZ_HISTORY_EMPTY}
                </Text>
                <Button colorScheme="blue" onClick={() => navigate('/quiz')}>
                  Start Your First Quiz
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Box>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <Box padding={6} maxWidth="1200px" margin="0 auto">
        <VStack spacing={6} align="stretch">
          <HStack justifyContent="space-between" alignItems="center">
            <Heading size="lg" color="blue.600">
              {MESSAGES.QUIZ_HISTORY_TITLE}
            </Heading>
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
            >
              {MESSAGES.BACK_TO_DASHBOARD}
            </Button>
          </HStack>

          <Text fontSize="md" color="gray.600">
            You have completed {history.length} quiz{history.length !== 1 ? 'zes' : ''}. Click on any quiz to view details.
          </Text>

          <Accordion allowToggle>
            {history.map((quiz) => {
              const percentage = Math.round(quiz.score_percentage);
              const totalQuestions = quiz.correct_count + quiz.wrong_count;
              const isScheduled = quiz.subtopic.startsWith('Scheduled ·');

              return (
                <AccordionItem key={quiz.id}>
                  <AccordionButton padding={4}>
                    <Box flex="1" textAlign="left">
                      <HStack spacing={4} alignItems="center">
                        <VStack align="start" spacing={1} flex="1">
                          <HStack spacing={2} flexWrap="wrap">
                            <Text fontWeight="bold" fontSize="lg">
                              {quiz.subject}
                            </Text>
                            {isScheduled && (
                              <Badge colorScheme="purple">Scheduled</Badge>
                            )}
                            <Badge colorScheme="blue">{quiz.subtopic}</Badge>
                          </HStack>
                          <Text fontSize="sm" color="gray.600">
                            {formatDate(quiz.timestamp)} • {formatTime(quiz.time_taken)}
                          </Text>
                        </VStack>
                        <VStack align="end" spacing={1}>
                          <Text fontWeight="bold" fontSize="xl" color="blue.600">
                            {percentage}%
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {quiz.correct_count}/{totalQuestions} correct
                          </Text>
                        </VStack>
                      </HStack>
                      <Box width="100%" marginTop={2}>
                        <Progress
                          value={percentage}
                          colorScheme={
                            percentage >= 70 ? 'green' : percentage >= 50 ? 'yellow' : 'orange'
                          }
                          size="sm"
                          borderRadius="md"
                        />
                      </Box>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel padding={4}>
                    <VStack spacing={4} align="stretch">
                      <Divider />
                      <VStack spacing={3} align="stretch">
                        <Heading size="sm" color="blue.600">
                          All Questions & Answers:
                        </Heading>
                        {quiz.answers
                          .sort((a, b) => a.questionNumber - b.questionNumber)
                          .map((answer: AnswerResult) => {
                          const bgColor = answer.isCorrect ? 'green.50' : 'orange.50';
                          const borderColor = answer.isCorrect ? 'green.200' : 'orange.200';
                          const statusIcon = answer.isCorrect ? '✅' : '❌';

                          return (
                            <Box
                              key={answer.questionNumber}
                              padding={4}
                              borderRadius="md"
                              bg={bgColor}
                              borderWidth={1}
                              borderColor={borderColor}
                            >
                              <VStack align="stretch" spacing={2}>
                                <Text fontWeight="bold" fontSize="md">
                                  {statusIcon} Q{answer.questionNumber}: {answer.question}
                                </Text>
                                <Text fontSize="sm" color="gray.700">
                                  Your answer:{' '}
                                  {answer.childAnswer ? (
                                    <Text as="span" fontWeight="semibold">
                                      {answer.childAnswer}
                                      {answer.options &&
                                        `: ${answer.options[answer.childAnswer]}`}
                                    </Text>
                                  ) : (
                                    <Text as="span" fontStyle="italic" color="red.600">
                                      Not answered
                                    </Text>
                                  )}
                                </Text>
                                <Text fontSize="sm" color="green.700" fontWeight="semibold">
                                  Correct answer: {answer.correctAnswer}
                                  {answer.options &&
                                    `: ${answer.options[answer.correctAnswer]}`}
                                </Text>
                                {answer.options && (
                                  <Box marginTop={2} padding={3} bg="gray.50" borderRadius="md">
                                    <Text
                                      fontSize="xs"
                                      fontWeight="semibold"
                                      marginBottom={1}
                                      color="gray.600"
                                    >
                                      All Options:
                                    </Text>
                                    <VStack align="stretch" spacing={1}>
                                      {Object.entries(answer.options).map(([key, value]) => (
                                        <Text key={key} fontSize="xs" color="gray.700">
                                          <Text as="span" fontWeight="bold">
                                            {key}:
                                          </Text>{' '}
                                          {value}
                                        </Text>
                                      ))}
                                    </VStack>
                                  </Box>
                                )}
                                <Text fontSize="sm" color="gray.700" marginTop={2}>
                                  <Text as="span" fontWeight="semibold">
                                    Explanation:
                                  </Text>{' '}
                                  {answer.explanation}
                                </Text>
                              </VStack>
                            </Box>
                          );
                        })}
                      </VStack>
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
              );
            })}
          </Accordion>
        </VStack>
      </Box>
    </PullToRefresh>
  );
};

