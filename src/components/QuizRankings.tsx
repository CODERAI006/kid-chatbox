/**
 * Quiz Rankings Component
 * Displays quiz rankings and leaderboard for students
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  Select,
  Button,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Input,
} from '@/shared/design-system';
import { apiClient, authApi, quizApi } from '@/services/api';
import { PullToRefresh } from './PullToRefresh';
import { generateCertificate } from '@/utils/certificate';
import { StudentPageLayout } from '@/components/layout/StudentPageHeader';

interface QuizRankingsProps {
  /** When true, renders inside Quiz Hub tab (no standalone page header). */
  embedded?: boolean;
}

interface RankingsFrameProps {
  embedded?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}

function RankingsFrame({ embedded, actions, children }: RankingsFrameProps) {
  if (embedded) {
    return (
      <Box px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
        {actions ? (
          <HStack justify="flex-end" mb={3}>
            {actions}
          </HStack>
        ) : null}
        {children}
      </Box>
    );
  }

  return (
    <StudentPageLayout
      icon="🏆"
      title="Quiz Rankings"
      subtitle="Compare your scores and track progress across quizzes"
      actions={actions}
    >
      {children}
    </StudentPageLayout>
  );
}

/**
 * Quiz Rankings component for students
 * Shows rankings and leaderboard based on quiz history
 */
export const QuizRankings: React.FC<QuizRankingsProps> = ({ embedded = false }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [sortBy, setSortBy] = useState<'score' | 'time' | 'questions' | 'composite'>('composite');
  const [selectedQuizId, setSelectedQuizId] = useState<string | undefined>(undefined);
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>(undefined);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [selectedQuizDetails, setSelectedQuizDetails] = useState<any>(null);
  const [quizSearchQuery, setQuizSearchQuery] = useState<string>('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isQuizMenuOpen, onOpen: onQuizMenuOpen, onClose: onQuizMenuClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    const { user } = authApi.getCurrentUser();
    setCurrentUser(user);
    loadAvailableQuizzes();
  }, []);

  useEffect(() => {
    loadRankings();
  }, [sortBy, selectedQuizId, selectedSubject]);

  useEffect(() => {
    if (analytics && currentUser) {
      // Filter to show only current user's records
      const userRecords = analytics.leaderboard.filter(
        (p: any) => p.userId === (currentUser as { id: string }).id
      );
      if (userRecords.length > 0) {
        // Find the rank in the full leaderboard
        const rank = analytics.leaderboard.findIndex(
          (p: any) => p.userId === (currentUser as { id: string }).id
        );
        setUserRank(rank >= 0 ? rank + 1 : null);
      } else {
        setUserRank(null);
      }
    }
  }, [analytics, currentUser]);

  const loadAvailableQuizzes = useCallback(async () => {
    try {
      setLoadingQuizzes(true);
      const response = await apiClient.get('/analytics/quiz-rankings/quizzes');
      if (response.data.success && response.data.quizzes) {
        setAvailableQuizzes(response.data.quizzes);
        // Auto-select first quiz if available
        if (response.data.quizzes.length > 0 && !selectedQuizId) {
          setSelectedQuizId(response.data.quizzes[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load available quizzes:', err);
    } finally {
      setLoadingQuizzes(false);
    }
  }, [selectedQuizId]);

  const loadRankings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/analytics/quiz-rankings', {
        params: {
          quizId: selectedQuizId,
          subject: selectedSubject,
          subtopic: undefined,
          sortBy,
          limit: 100,
        },
      });
      const data = response.data;
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz rankings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sortBy, selectedQuizId, selectedSubject]);

  const getRankBadgeColor = (rank: number): string => {
    if (rank === 1) return 'yellow';
    if (rank === 2) return 'gray';
    if (rank === 3) return 'orange';
    return 'blue';
  };

  const getRankIcon = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const handleRefresh = async () => {
    await loadRankings();
  };

  const handleViewDetails = async (attemptId: string) => {
    try {
      const response = await quizApi.getQuizResultDetails(attemptId);
      if (response.success && response.result) {
        // Normalize numeric fields and parse options if they're strings
        const normalizedResult = {
          ...response.result,
          score_percentage:
            typeof response.result.score_percentage === 'number'
              ? response.result.score_percentage
              : Number(response.result.score_percentage || 0),
          time_taken:
            typeof response.result.time_taken === 'number'
              ? response.result.time_taken
              : Number(response.result.time_taken || 0),
          correct_count:
            typeof response.result.correct_count === 'number'
              ? response.result.correct_count
              : Number(response.result.correct_count || 0),
          wrong_count:
            typeof response.result.wrong_count === 'number'
              ? response.result.wrong_count
              : Number(response.result.wrong_count || 0),
          answers: (response.result.answers || []).map((answer: any) => ({
            ...answer,
            options:
              typeof answer.options === 'string'
                ? JSON.parse(answer.options)
                : answer.options,
          })),
        };
        setSelectedQuizDetails(normalizedResult);
        onOpen();
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to load quiz details',
        status: 'error',
        duration: 3000,
      });
    }
  };

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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  if (loading) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <RankingsFrame embedded={embedded}>
          <Box textAlign="center" py={10}>
            <Spinner size="xl" />
            <Text mt={4} fontSize={{ base: 'sm', md: 'md' }}>Loading quiz rankings...</Text>
          </Box>
        </RankingsFrame>
      </PullToRefresh>
    );
  }

  if (error) {
    return (
      <RankingsFrame
        embedded={embedded}
        actions={
          <Button size="sm" onClick={loadRankings}>
            Retry
          </Button>
        }
      >
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </RankingsFrame>
    );
  }

  if (!analytics || analytics.leaderboard.length === 0) {
    return (
      <RankingsFrame embedded={embedded}>
        <Alert status="info">
          <AlertIcon />
          No quiz attempts found. Complete quizzes to see rankings!
        </Alert>
      </RankingsFrame>
    );
  }

  // Show all participants, but identify current user's records
  const allParticipants = analytics.leaderboard || [];
  const userRecords = allParticipants.filter(
    (p: any) => p.userId === (currentUser as { id: string })?.id
  );
  const userRanking = allParticipants.find(
    (p: any) => p.userId === (currentUser as { id: string })?.id
  );

  // Calculate user-specific summary
  const userSummary = {
    totalAttempts: userRecords.length,
    totalParticipants: analytics.summary.totalParticipants,
    averageScore: userRecords.length > 0
      ? Math.round(userRecords.reduce((sum: number, p: any) => sum + p.scorePercentage, 0) / userRecords.length)
      : 0,
    averageTime: userRecords.length > 0
      ? Math.round(userRecords.reduce((sum: number, p: any) => sum + p.timeTaken, 0) / userRecords.length)
      : 0,
  };

  if (!analytics || allParticipants.length === 0) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <RankingsFrame
          embedded={embedded}
          actions={
            <Button onClick={loadRankings} size="sm">
              Refresh
            </Button>
          }
        >
          <Alert status="info">
            <AlertIcon />
            No quiz attempts found. Complete quizzes to see your rankings!
          </Alert>
        </RankingsFrame>
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <RankingsFrame
        embedded={embedded}
        actions={
          <Button onClick={loadRankings} size="sm">
            Refresh
          </Button>
        }
      >
        <VStack spacing={6} align="stretch">
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
            <Stat>
              <StatLabel>My Total Attempts</StatLabel>
              <StatNumber>{userSummary.totalAttempts}</StatNumber>
              <StatHelpText>Quizzes completed</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel>My Average Score</StatLabel>
              <StatNumber>{userSummary.averageScore}%</StatNumber>
              <StatHelpText>Across all my quizzes</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel>Average Time</StatLabel>
              <StatNumber>{Math.floor(userSummary.averageTime / 60)}m</StatNumber>
              <StatHelpText>{userSummary.averageTime % 60}s per quiz</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel>Best Rank</StatLabel>
              <StatNumber>
                {userRank ? `#${userRank}` : 'N/A'}
              </StatNumber>
              <StatHelpText>
                {userRanking
                  ? `${userRanking.scorePercentage}% • ${userRanking.compositeScore.toFixed(1)} pts`
                  : 'Complete quizzes to rank'}
              </StatHelpText>
            </Stat>
          </SimpleGrid>

          {/* Your Ranking Card */}
          {userRanking && (
            <Card bgGradient="linear(to-r, blue.50, purple.50)" borderWidth={2} borderColor="blue.200">
              <CardBody>
                <VStack spacing={3}>
                  <HStack spacing={4} width="100%" justify="space-between">
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" color="gray.600" fontWeight="semibold">
                        Your Ranking
                      </Text>
                      <HStack spacing={2} flexWrap="wrap">
                        <Badge colorScheme={getRankBadgeColor(userRanking.rank)} fontSize={{ base: 'sm', md: 'lg' }} p={2}>
                          {getRankIcon(userRanking.rank)}
                        </Badge>
                        <Text fontSize={{ base: 'lg', md: '2xl' }} fontWeight="bold">
                          #{userRanking.rank} out of {analytics.summary.totalParticipants} participants
                        </Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        Quiz: <strong>{userRanking.subject} - {userRanking.subtopic}</strong>
                      </Text>
                    </VStack>
                    <VStack align="end" spacing={1}>
                      <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600">
                        Composite Score
                      </Text>
                      <Text fontSize={{ base: 'xl', md: '3xl' }} fontWeight="bold" color="blue.600">
                        {userRanking.compositeScore.toFixed(1)}
                      </Text>
                    </VStack>
                  </HStack>
                  <Divider />
                  <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} width="100%">
                    <VStack spacing={1}>
                      <Text fontSize="xs" color="gray.600">
                        Score
                      </Text>
                      <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="bold" color="blue.600">
                        {userRanking.scorePercentage}%
                      </Text>
                    </VStack>
                    <VStack spacing={1}>
                      <Text fontSize="xs" color="gray.600">
                        Correct
                      </Text>
                      <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="bold">
                        {userRanking.correctAnswers}/{userRanking.totalQuestions}
                      </Text>
                    </VStack>
                    <VStack spacing={1}>
                      <Text fontSize="xs" color="gray.600">
                        Time
                      </Text>
                      <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="bold">
                        {userRanking.timeTakenFormatted}
                      </Text>
                    </VStack>
                    <VStack spacing={1}>
                      <Text fontSize="xs" color="gray.600">
                        Subject
                      </Text>
                      <Badge colorScheme="purple">{userRanking.subject || 'N/A'}</Badge>
                    </VStack>
                  </SimpleGrid>
                </VStack>
              </CardBody>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="sm">Filters & Sorting</Heading>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <Box>
                    <Text mb={2} fontSize="sm" fontWeight="semibold">
                      Select Quiz:
                    </Text>
                    {loadingQuizzes ? (
                      <Spinner size="sm" />
                    ) : (
                      <Menu isOpen={isQuizMenuOpen} onOpen={onQuizMenuOpen} onClose={onQuizMenuClose}>
                        <MenuButton
                          as={Button}
                          rightIcon={<Text>▼</Text>}
                          w="100%"
                          textAlign="left"
                          variant="outline"
                        >
                          {selectedQuizId
                            ? availableQuizzes.find((q) => q.id === selectedQuizId)?.displayName || 'Select a quiz...'
                            : 'Select a quiz...'}
                        </MenuButton>
                        <MenuList maxH="300px" overflowY="auto">
                          <Box px={3} py={2}>
                            <Input
                              placeholder="Search quizzes..."
                              value={quizSearchQuery}
                              onChange={(e) => setQuizSearchQuery(e.target.value)}
                              size="sm"
                              mb={2}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </Box>
                          {availableQuizzes
                            .filter((quiz) =>
                              !quizSearchQuery ||
                              quiz.displayName.toLowerCase().includes(quizSearchQuery.toLowerCase()) ||
                              quiz.subject?.toLowerCase().includes(quizSearchQuery.toLowerCase()) ||
                              quiz.subtopic?.toLowerCase().includes(quizSearchQuery.toLowerCase())
                            )
                            .map((quiz) => (
                              <MenuItem
                                key={quiz.id}
                                onClick={() => {
                                  setSelectedQuizId(quiz.id);
                                  setSelectedSubject(undefined);
                                  setQuizSearchQuery('');
                                  onQuizMenuClose();
                                }}
                              >
                                <VStack align="start" spacing={0} w="100%">
                                  <HStack spacing={2} flexWrap="wrap">
                                    <Text fontWeight="medium">{quiz.displayName}</Text>
                                    {quiz.source === 'admin' && (
                                      <Badge colorScheme="purple" fontSize="2xs">Admin</Badge>
                                    )}
                                    {quiz.source === 'ai-tutor' && (
                                      <Badge colorScheme="blue" fontSize="2xs">AI Tutor</Badge>
                                    )}
                                  </HStack>
                                  <Text fontSize="xs" color="gray.500">
                                    {quiz.participantCount} participants • {quiz.attemptCount} attempts
                                  </Text>
                                </VStack>
                              </MenuItem>
                            ))}
                          {availableQuizzes.filter(
                            (quiz) =>
                              !quizSearchQuery ||
                              quiz.displayName.toLowerCase().includes(quizSearchQuery.toLowerCase()) ||
                              quiz.subject?.toLowerCase().includes(quizSearchQuery.toLowerCase()) ||
                              quiz.subtopic?.toLowerCase().includes(quizSearchQuery.toLowerCase())
                          ).length === 0 && (
                            <Box px={3} py={4} textAlign="center">
                              <Text color="gray.500" fontSize="sm">
                                No quizzes found
                              </Text>
                            </Box>
                          )}
                        </MenuList>
                      </Menu>
                    )}
                  </Box>
                  <Box>
                    <Text mb={2} fontSize="sm" fontWeight="semibold">
                      Sort By:
                    </Text>
                    <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                      <option value="composite">Composite Score</option>
                      <option value="score">Score %</option>
                      <option value="questions">Questions Correct</option>
                      <option value="time">Time Taken</option>
                    </Select>
                  </Box>
                  <Box>
                    <Text mb={2} fontSize="sm" fontWeight="semibold">
                      Subject (if no quiz selected):
                    </Text>
                    <Select
                      value={selectedSubject || ''}
                      onChange={(e) => {
                        setSelectedSubject(e.target.value || undefined);
                        setSelectedQuizId(undefined); // Reset quiz filter when subject changes
                      }}
                      disabled={!!selectedQuizId}
                    >
                      <option value="">All Subjects</option>
                      {analytics && Object.keys(analytics.summary.subjects).map((subject) => (
                        <option key={subject} value={subject}>
                          {subject} ({analytics.summary.subjects[subject].attempts} attempts)
                        </option>
                      ))}
                    </Select>
                  </Box>
                </SimpleGrid>
                {selectedQuizId && (
                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">
                      Showing your attempts for:{' '}
                      <strong>
                        {availableQuizzes.find((q) => q.id === selectedQuizId)?.displayName}
                      </strong>
                    </Text>
                  </Alert>
                )}
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Text fontSize="sm">
                    <strong>Note:</strong> You are viewing only your own quiz attempts. Your rank is shown relative to all participants.
                  </Text>
                </Alert>
              </VStack>
            </CardBody>
          </Card>

          {/* Leaderboard */}
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between" align="center">
                  <Heading size="md">
                    {selectedQuizId
                      ? `📊 Quiz Leaderboard: ${availableQuizzes.find((q) => q.id === selectedQuizId)?.displayName || 'Selected Quiz'}`
                      : '📊 Quiz Leaderboard'}
                  </Heading>
                  <Badge colorScheme="blue" fontSize="sm" p={2}>
                    {analytics.summary.totalParticipants} Participant{analytics.summary.totalParticipants !== 1 ? 's' : ''}
                  </Badge>
                </HStack>
                {userRanking && (
                  <Alert 
                    status={userRanking.rank <= 3 ? 'success' : 'info'} 
                    borderRadius="md"
                  >
                    <AlertIcon />
                    <HStack justify="space-between" align="center" width="100%" flexWrap="wrap">
                      <Text fontSize="sm">
                        <strong>Your Rank:</strong> #{userRanking.rank} out of {analytics.summary.totalParticipants} participants
                        {' • '}
                        <strong>Your Score:</strong> {userRanking.scorePercentage}% ({userRanking.compositeScore.toFixed(1)} composite)
                      </Text>
                      {userRanking.rank <= 3 && (
                        <Button
                          size="sm"
                          colorScheme="yellow"
                          leftIcon={<Text>🏆</Text>}
                          onClick={async () => {
                            try {
                              const selectedQuiz = availableQuizzes.find((q) => q.id === selectedQuizId);
                              await generateCertificate({
                                studentName: currentUser?.name || userRanking.userName || 'Student',
                                quizName: selectedQuiz?.displayName || `${userRanking.subject} - ${userRanking.subtopic}`,
                                rank: userRanking.rank,
                                score: userRanking.scorePercentage,
                                compositeScore: userRanking.compositeScore,
                                date: userRanking.timestamp || new Date().toISOString(),
                                totalParticipants: analytics.summary.totalParticipants,
                              });
                            } catch (error) {
                              console.error('Failed to generate certificate:', error);
                            }
                          }}
                        >
                          Download Certificate
                        </Button>
                      )}
                    </HStack>
                  </Alert>
                )}
                <Text fontSize="sm" color="gray.600">
                  Rankings calculated using: Score (60%) + Questions Correct (20%) + Time
                  Efficiency (20%)
                </Text>
                <Box overflowX="auto">
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>Rank</Th>
                        <Th>Student</Th>
                        <Th>Quiz Name</Th>
                        <Th isNumeric>Score</Th>
                        <Th isNumeric>Correct</Th>
                        <Th isNumeric>Time</Th>
                        <Th isNumeric>Composite</Th>
                        <Th>Date</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {allParticipants.map((participant: any) => {
                        const isCurrentUser = participant.userId === (currentUser as { id: string })?.id;
                        return (
                          <Tr
                            key={participant.attemptId}
                            bg={isCurrentUser ? 'blue.50' : 'transparent'}
                            fontWeight={isCurrentUser ? 'bold' : 'normal'}
                          >
                            <Td>
                              <Badge
                                colorScheme={getRankBadgeColor(participant.rank)}
                                fontSize="md"
                                p={2}
                              >
                                {getRankIcon(participant.rank)}
                              </Badge>
                            </Td>
                            <Td>
                              <VStack align="start" spacing={0}>
                                <Text fontWeight={isCurrentUser ? 'bold' : 'semibold'}>
                                  {isCurrentUser ? '👤 ' : ''}
                                  {participant.userName || 'Unknown'}
                                </Text>
                                {isCurrentUser && (
                                  <Text fontSize="xs" color="blue.600" fontWeight="bold">
                                    (You)
                                  </Text>
                                )}
                              </VStack>
                            </Td>
                            <Td>
                              <Text fontSize="sm" fontWeight={isCurrentUser ? 'bold' : 'normal'}>
                                {participant.subject || 'N/A'} - {participant.subtopic || 'N/A'}
                              </Text>
                            </Td>
                            <Td isNumeric>
                              <Text fontWeight="bold" color="blue.600">
                                {participant.scorePercentage}%
                              </Text>
                            </Td>
                            <Td isNumeric>
                              {participant.correctAnswers}/{participant.totalQuestions}
                            </Td>
                            <Td isNumeric>{participant.timeTakenFormatted}</Td>
                            <Td isNumeric>
                              <Text fontWeight="bold" color="green.600">
                                {participant.compositeScore?.toFixed(1) || 'N/A'}
                              </Text>
                            </Td>
                            <Td>
                              <Text fontSize="xs" color="gray.600">
                                {participant.timestamp
                                  ? new Date(participant.timestamp).toLocaleDateString()
                                  : 'N/A'}
                              </Text>
                            </Td>
                            <Td>
                              {isCurrentUser ? (
                                <Button
                                  size="sm"
                                  colorScheme="blue"
                                  onClick={() => handleViewDetails(participant.attemptId)}
                                >
                                  View
                                </Button>
                              ) : (
                                <Text fontSize="xs" color="gray.400">
                                  -
                                </Text>
                              )}
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        </VStack>

        {/* View Details Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: 'xl' }} scrollBehavior="inside">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Quiz Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {selectedQuizDetails && (
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontWeight="bold" mb={2}>
                      Quiz Information
                    </Text>
                    <Text>
                      <strong>Subject:</strong> {selectedQuizDetails.subject}
                    </Text>
                    <Text>
                      <strong>Subtopic:</strong> {selectedQuizDetails.subtopic}
                    </Text>
                    <Text>
                      <strong>Date:</strong> {formatDate(selectedQuizDetails.timestamp)}
                    </Text>
                    <Text>
                      <strong>Age:</strong> {selectedQuizDetails.age}
                    </Text>
                    <Text>
                      <strong>Language:</strong> {selectedQuizDetails.language}
                    </Text>
                  </Box>

                  <Divider />

                  <Box>
                    <Text fontWeight="bold" mb={2}>
                      Results
                    </Text>
                    <HStack spacing={4}>
                      <Text>
                        <strong>Score:</strong>{' '}
                        <Badge
                          colorScheme={
                            selectedQuizDetails.score_percentage >= 80
                              ? 'green'
                              : selectedQuizDetails.score_percentage >= 60
                              ? 'yellow'
                              : 'red'
                          }
                        >
                          {selectedQuizDetails.score_percentage.toFixed(1)}%
                        </Badge>
                      </Text>
                      <Text>
                        <strong>Correct:</strong> {selectedQuizDetails.correct_count}
                      </Text>
                      <Text>
                        <strong>Wrong:</strong> {selectedQuizDetails.wrong_count}
                      </Text>
                      <Text>
                        <strong>Time:</strong> {formatTime(selectedQuizDetails.time_taken)}
                      </Text>
                    </HStack>
                  </Box>

                  {selectedQuizDetails.explanation_of_mistakes && (
                    <>
                      <Divider />
                      <Box>
                        <Text fontWeight="bold" mb={2}>
                          Explanation of Mistakes
                        </Text>
                        <Text whiteSpace="pre-wrap">{selectedQuizDetails.explanation_of_mistakes}</Text>
                      </Box>
                    </>
                  )}

                  {selectedQuizDetails.answers && selectedQuizDetails.answers.length > 0 && (
                    <>
                      <Divider />
                      <Box>
                        <Text fontWeight="bold" mb={2}>
                          Answers ({selectedQuizDetails.answers.length} questions)
                        </Text>
                        <VStack spacing={3} align="stretch">
                          {selectedQuizDetails.answers
                            .sort((a: any, b: any) => a.questionNumber - b.questionNumber)
                            .map((answer: any, idx: number) => (
                              <Box
                                key={idx}
                                p={3}
                                border="1px"
                                borderColor={answer.isCorrect ? 'green.200' : 'red.200'}
                                borderRadius="md"
                                bg={answer.isCorrect ? 'green.50' : 'red.50'}
                              >
                                <HStack justify="space-between" mb={2}>
                                  <Text fontWeight="bold">Question {answer.questionNumber}</Text>
                                  <Badge colorScheme={answer.isCorrect ? 'green' : 'red'}>
                                    {answer.isCorrect ? 'Correct' : 'Wrong'}
                                  </Badge>
                                </HStack>
                                <Text mb={1}>
                                  <strong>Q:</strong> {answer.question}
                                </Text>
                                <Text mb={1}>
                                  <strong>Your Answer:</strong> {answer.childAnswer || 'N/A'}
                                </Text>
                                <Text mb={1}>
                                  <strong>Correct Answer:</strong> {answer.correctAnswer}
                                </Text>
                                {answer.explanation && (
                                  <Text fontSize="sm" color="gray.600" mt={1}>
                                    <strong>Explanation:</strong> {answer.explanation}
                                  </Text>
                                )}
                              </Box>
                            ))}
                        </VStack>
                      </Box>
                    </>
                  )}
                </VStack>
              )}
            </ModalBody>
            <ModalFooter>
              <Button onClick={onClose}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </RankingsFrame>
    </PullToRefresh>
  );
};

