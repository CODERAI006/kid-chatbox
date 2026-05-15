/**
 * Scheduled Tests Component
 * Displays live, upcoming, and completed scheduled quizzes in an intuitive format
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  CardBody,
  SimpleGrid,
  Badge,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  Progress,
  Divider,
} from '@/shared/design-system';
import { scheduledTestsApi } from '@/services/api';
import { PullToRefresh } from './PullToRefresh';
import { usePlanLimits } from '@/hooks/usePlanLimits';

interface ScheduledTest {
  id: string;
  quizId: string;
  quizName: string;
  quizDescription?: string;
  quizAgeGroup: string;
  quizDifficulty: string;
  numberOfQuestions: number;
  passingPercentage: number;
  timeLimit?: number;
  scheduledFor: string;
  visibleFrom: string;
  visibleUntil?: string;
  durationMinutes?: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  instructions?: string;
  scheduledByName?: string;
  hasActiveAttempt?: boolean;
  activeAttemptId?: string | null;
  hasCompletedAttempt?: boolean;
  completedAttemptId?: string | null;
  completedAt?: string | null;
  score?: number | null;
  scorePercentage?: number | null;
  correctAnswers?: number | null;
  wrongAnswers?: number | null;
  timeTaken?: number | null;
}

interface ScheduledTestsProps {
  maxDisplay?: number;
  showViewAll?: boolean;
}

/**
 * Scheduled Tests Component
 * Organizes tests into: Upcoming, Live, and Completed sections
 */
export const ScheduledTests: React.FC<ScheduledTestsProps> = ({ maxDisplay, showViewAll = false }) => {
  const navigate = useNavigate();
  const [scheduledTests, setScheduledTests] = useState<ScheduledTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { canTakeQuiz, planInfo } = usePlanLimits();

  useEffect(() => {
    loadScheduledTests();
  }, []);

  const handleRefresh = async () => {
    await loadScheduledTests();
  };

  const loadScheduledTests = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await scheduledTestsApi.getMyScheduledTests();
      
      // Map snake_case to camelCase
      const mappedTests = data.scheduledTests.map((test: unknown) => {
        const t = test as Record<string, unknown>;
        return {
          id: t.id as string,
          quizId: (t.quiz_id || t.quizId) as string,
          quizName: (t.quiz_name || t.quizName) as string,
          quizDescription: (t.quiz_description || t.quizDescription) as string | undefined,
          quizAgeGroup: (t.quiz_age_group || t.quizAgeGroup) as string,
          quizDifficulty: (t.quiz_difficulty || t.quizDifficulty) as string,
          numberOfQuestions: (t.number_of_questions || t.numberOfQuestions) as number,
          passingPercentage: (t.passing_percentage || t.passingPercentage) as number,
          timeLimit: (t.time_limit || t.timeLimit) as number | undefined,
          scheduledFor: (t.scheduled_for || t.scheduledFor) as string,
          visibleFrom: (t.visible_from || t.visibleFrom) as string,
          visibleUntil: (t.visible_until || t.visibleUntil) as string | undefined,
          durationMinutes: (t.duration_minutes || t.durationMinutes) as number | undefined,
          status: t.status as 'scheduled' | 'active' | 'completed' | 'cancelled',
          instructions: t.instructions as string | undefined,
          scheduledByName: (t.scheduled_by_name || t.scheduledByName) as string | undefined,
          hasActiveAttempt: (t.hasActiveAttempt || false) as boolean,
          activeAttemptId: (t.activeAttemptId ?? undefined) as string | null | undefined,
          attemptStartedAt: (t.attemptStartedAt ?? undefined) as string | null | undefined,
          hasCompletedAttempt: (t.hasCompletedAttempt || false) as boolean,
          completedAttemptId: (t.completedAttemptId ?? undefined) as string | null | undefined,
          completedAt: (t.completedAt ?? undefined) as string | null | undefined,
          score: (t.score ?? undefined) as number | null | undefined,
          scorePercentage: (t.scorePercentage ?? undefined) as number | null | undefined,
          correctAnswers: (t.correctAnswers ?? undefined) as number | null | undefined,
          wrongAnswers: (t.wrongAnswers ?? undefined) as number | null | undefined,
          timeTaken: (t.timeTaken ?? undefined) as number | null | undefined,
        };
      });
      
      setScheduledTests(mappedTests);
    } catch (err) {
      console.error('Failed to load scheduled tests:', err);
      setError('Failed to load scheduled tests');
    } finally {
      setLoading(false);
    }
  };

  // Categorize tests into upcoming, live, and completed
  const { upcomingTests, liveTests, completedTests } = useMemo(() => {
    const now = new Date();
    const upcoming: ScheduledTest[] = [];
    const live: ScheduledTest[] = [];
    const completed: ScheduledTest[] = [];

    scheduledTests.forEach((test) => {
      const scheduledFor = new Date(test.scheduledFor);
      const visibleFrom = new Date(test.visibleFrom);
      const visibleUntil = test.visibleUntil ? new Date(test.visibleUntil) : null;

      // Completed tests (user has already taken them)
      if (test.hasCompletedAttempt) {
        completed.push(test);
      }
      // Live tests (currently visible and not expired)
      else if (visibleFrom <= now && (!visibleUntil || visibleUntil >= now) && test.status === 'active') {
        live.push(test);
      }
      // Upcoming tests (scheduled for the future)
      else if (scheduledFor > now || (visibleFrom > now && test.status === 'scheduled')) {
        upcoming.push(test);
      }
      // Other active tests
      else if (test.status === 'active') {
        live.push(test);
      }
      // Default to upcoming
      else {
        upcoming.push(test);
      }
    });

    // Sort upcoming by scheduled date (earliest first)
    upcoming.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
    
    // Sort live by visible from date (earliest first)
    live.sort((a, b) => new Date(a.visibleFrom).getTime() - new Date(b.visibleFrom).getTime());
    
    // Sort completed by completion date (most recent first)
    completed.sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    });

    return { upcomingTests: upcoming, liveTests: live, completedTests: completed };
  }, [scheduledTests]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleStartQuiz = (test: ScheduledTest): void => {
    if (test.hasActiveAttempt && test.activeAttemptId) {
      navigate(`/quiz?scheduledTestId=${test.id}&attemptId=${test.activeAttemptId}&resume=true`);
    } else {
      navigate(`/quiz?scheduledTestId=${test.id}`);
    }
  };

  const handleViewResults = (_test: ScheduledTest): void => {
    navigate('/quiz#history');
  };

  if (loading) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <Box textAlign="center" py={10}>
          <Spinner size="xl" />
        </Box>
      </PullToRefresh>
    );
  }

  if (error) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </PullToRefresh>
    );
  }

  // Limit display if maxDisplay is set
  const displayUpcoming = maxDisplay ? upcomingTests.slice(0, maxDisplay) : upcomingTests;
  const displayLive = maxDisplay ? liveTests.slice(0, maxDisplay) : liveTests;
  const displayCompleted = maxDisplay ? completedTests.slice(0, maxDisplay) : completedTests;
  const hasMore = maxDisplay && (upcomingTests.length > maxDisplay || liveTests.length > maxDisplay || completedTests.length > maxDisplay);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <Box>
      <VStack spacing={8} align="stretch">
        {/* Upcoming Tests Section */}
        {displayUpcoming.length > 0 && (
          <Box>
            <HStack justify="space-between" mb={4}>
              <Heading size="lg" color="blue.600">
                📅 Upcoming Tests
              </Heading>
              {hasMore && showViewAll && (
                <Button
                  size="sm"
                  variant="ghost"
                  colorScheme="blue"
                  onClick={() => navigate('/quiz#scheduled')}
                >
                  View All →
                </Button>
              )}
            </HStack>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {displayUpcoming.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  type="upcoming"
                  formatDate={formatDate}
                  onStartQuiz={handleStartQuiz}
                  canTakeQuiz={canTakeQuiz}
                  planInfo={planInfo}
                />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Live Tests Section */}
        {displayLive.length > 0 && (
          <Box>
            <HStack justify="space-between" mb={4}>
              <Heading size="lg" color="green.600">
                🟢 Live Tests
              </Heading>
              {hasMore && showViewAll && (
                <Button
                  size="sm"
                  variant="ghost"
                  colorScheme="green"
                  onClick={() => navigate('/quiz#scheduled')}
                >
                  View All →
                </Button>
              )}
            </HStack>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {displayLive.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  type="live"
                  formatDate={formatDate}
                  onStartQuiz={handleStartQuiz}
                  canTakeQuiz={canTakeQuiz}
                  planInfo={planInfo}
                />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Completed Tests Section */}
        {displayCompleted.length > 0 && (
          <Box>
            <HStack justify="space-between" mb={4}>
              <Heading size="lg" color="gray.600">
                ✅ Completed Tests
              </Heading>
              {hasMore && showViewAll && (
                <Button
                  size="sm"
                  variant="ghost"
                  colorScheme="gray"
                  onClick={() => navigate('/quiz#scheduled')}
                >
                  View All →
                </Button>
              )}
            </HStack>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {displayCompleted.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  type="completed"
                  formatDate={formatDate}
                  onViewResults={handleViewResults}
                />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {scheduledTests.length === 0 && (
          <Box textAlign="center" py={10}>
            <Text fontSize="lg" color="gray.500">
              No scheduled tests available at the moment.
            </Text>
            <Text fontSize="sm" color="gray.400" mt={2}>
              Check back later for new tests!
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
    </PullToRefresh>
  );
};

interface TestCardProps {
  test: ScheduledTest;
  type: 'upcoming' | 'live' | 'completed';
  formatDate: (dateString: string) => string;
  onStartQuiz?: (test: ScheduledTest) => void;
  onViewResults?: (test: ScheduledTest) => void;
  canTakeQuiz?: boolean;
  planInfo?: {
    usage: { quizCount: number };
    limits: { dailyQuizLimit: number };
  } | null;
}

/**
 * Test Card Component
 * Renders a single test card with appropriate styling based on type
 */
const TestCard: React.FC<TestCardProps> = ({ test, type, formatDate, onStartQuiz, onViewResults, canTakeQuiz = true, planInfo }) => {
  const now = new Date();
  const scheduledFor = new Date(test.scheduledFor);
  const visibleFrom = new Date(test.visibleFrom);
  const isUpcoming = scheduledFor > now || visibleFrom > now;

  const borderColor = type === 'live' ? 'green.300' : type === 'completed' ? 'gray.300' : 'blue.200';
  const titleColor = type === 'live' ? 'green.700' : type === 'completed' ? 'gray.700' : 'blue.700';

  return (
    <Card
      borderWidth="2px"
      borderColor={borderColor}
      _hover={{ shadow: type === 'completed' ? 'md' : 'lg' }}
      opacity={type === 'completed' ? 0.9 : 1}
    >
      <CardBody>
        <VStack align="start" spacing={3}>
          <HStack justify="space-between" w="100%">
            <Heading size="sm" color={titleColor}>
              {test.quizName}
            </Heading>
            {type === 'upcoming' && isUpcoming && (
              <Badge colorScheme="blue" fontSize="xs">Upcoming</Badge>
            )}
            {type === 'live' && (
              <Badge colorScheme="green" fontSize="xs">Live Now</Badge>
            )}
            {type === 'completed' && test.scorePercentage !== null && test.scorePercentage !== undefined && (
              <Badge
                colorScheme={(test.scorePercentage || 0) >= test.passingPercentage ? 'green' : 'red'}
                fontSize="xs"
              >
                {(test.scorePercentage || 0) >= test.passingPercentage ? 'Passed' : 'Failed'}
              </Badge>
            )}
          </HStack>

          {test.quizDescription && (
            <Text fontSize="sm" color="gray.600" noOfLines={2}>
              {test.quizDescription}
            </Text>
          )}

          <HStack spacing={4} flexWrap="wrap">
            <Badge colorScheme="purple">{test.quizAgeGroup}</Badge>
            <Badge colorScheme="blue">{test.quizDifficulty}</Badge>
            <Text fontSize="sm" color="gray.600">
              {test.numberOfQuestions} Questions
            </Text>
          </HStack>

          {/* Test Details */}
          <Box w="100%" fontSize="sm" color="gray.600">
            {type === 'completed' ? (
              <>
                <Text>
                  <Text as="span" fontWeight="bold">Completed:</Text> {test.completedAt ? formatDate(test.completedAt) : 'N/A'}
                </Text>
                <Text>
                  <Text as="span" fontWeight="bold">Scheduled For:</Text> {formatDate(test.scheduledFor)}
                </Text>
              </>
            ) : (
              <>
                <Text>
                  <Text as="span" fontWeight="bold">Scheduled For:</Text> {formatDate(test.scheduledFor)}
                </Text>
                <Text>
                  <Text as="span" fontWeight="bold">Visible From:</Text> {formatDate(test.visibleFrom)}
                </Text>
                {test.visibleUntil && (
                  <Text>
                    <Text as="span" fontWeight="bold">Visible Until:</Text> {formatDate(test.visibleUntil)}
                  </Text>
                )}
              </>
            )}
            <Text>
              <Text as="span" fontWeight="bold">Passing:</Text> {test.passingPercentage}%
            </Text>
            {test.timeLimit && (
              <Text>
                <Text as="span" fontWeight="bold">Time Limit:</Text> {test.timeLimit} min
              </Text>
            )}
          </Box>

          {test.instructions && type !== 'completed' && (
            <Box
              w="100%"
              p={2}
              bg={type === 'live' ? 'blue.50' : 'yellow.50'}
              borderRadius="md"
              borderLeft="3px solid"
              borderColor={type === 'live' ? 'blue.400' : 'yellow.400'}
            >
              <Text fontSize="xs" fontWeight="bold" color={type === 'live' ? 'blue.700' : 'yellow.700'} mb={1}>
                Instructions:
              </Text>
              <Text fontSize="xs" color={type === 'live' ? 'blue.800' : 'yellow.800'}>
                {test.instructions}
              </Text>
            </Box>
          )}

          {/* Show Results for Completed Tests */}
          {type === 'completed' && test.hasCompletedAttempt && test.scorePercentage !== null && test.scorePercentage !== undefined && (
            <>
              <Divider />
              <Box
                w="100%"
                p={4}
                bg={(test.scorePercentage || 0) >= test.passingPercentage ? 'green.50' : 'red.50'}
                borderRadius="md"
                borderWidth="2px"
                borderColor={(test.scorePercentage || 0) >= test.passingPercentage ? 'green.300' : 'red.300'}
              >
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <Text fontSize="lg" fontWeight="bold" color={(test.scorePercentage || 0) >= test.passingPercentage ? 'green.700' : 'red.700'}>
                      Your Score
                    </Text>
                    <Text fontSize="xl" fontWeight="extrabold" color={(test.scorePercentage || 0) >= test.passingPercentage ? 'green.700' : 'red.700'}>
                      {test.scorePercentage.toFixed(1)}%
                    </Text>
                  </HStack>
                  
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm" color="gray.600">
                        {test.correctAnswers || 0} out of {test.numberOfQuestions} correct
                      </Text>
                    </HStack>
                    <Progress
                      value={test.scorePercentage}
                      colorScheme={(test.scorePercentage || 0) >= test.passingPercentage ? 'green' : 'red'}
                      size="lg"
                      borderRadius="md"
                    />
                  </Box>

                  <HStack spacing={4} fontSize="sm" color="gray.600" justify="center">
                    <Text>
                      <Text as="span" fontWeight="bold">✓ Correct:</Text> {test.correctAnswers || 0}
                    </Text>
                    <Text>
                      <Text as="span" fontWeight="bold">✗ Wrong:</Text> {test.wrongAnswers || 0}
                    </Text>
                    {test.timeTaken && (
                      <Text>
                        <Text as="span" fontWeight="bold">⏱ Time:</Text>{' '}
                        {Math.floor(test.timeTaken / 60)}m {test.timeTaken % 60}s
                      </Text>
                    )}
                  </HStack>
                </VStack>
              </Box>
            </>
          )}

          {/* Action Button */}
          {type === 'completed' ? (
            <Button
              colorScheme="gray"
              variant="outline"
              size="md"
              w="100%"
              onClick={() => onViewResults && onViewResults(test)}
            >
              View Detailed Results →
            </Button>
          ) : (
            <Button
              colorScheme={type === 'live' ? 'green' : 'blue'}
              variant={test.hasActiveAttempt ? 'outline' : 'solid'}
              size="md"
              w="100%"
              isDisabled={(isUpcoming && visibleFrom > now) || (!test.hasActiveAttempt && !canTakeQuiz)}
              onClick={() => onStartQuiz && onStartQuiz(test)}
              title={(!canTakeQuiz && !test.hasActiveAttempt) ? `Daily quiz limit reached. You have used ${planInfo?.usage.quizCount || 0} of ${planInfo?.limits.dailyQuizLimit || 0} quizzes today.` : ''}
            >
              {test.hasActiveAttempt
                ? '🔄 Resume Quiz'
                : isUpcoming && visibleFrom > now
                  ? '⏳ Not Available Yet'
                  : !canTakeQuiz
                    ? '🚫 Limit Reached'
                    : type === 'live'
                      ? '🚀 Start Quiz'
                      : '📝 Start Quiz'}
            </Button>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};
