/**
 * StudyHistory component - Displays user's past study sessions
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
  HStack,
  Divider,
  List,
  ListItem,
  ListIcon,
} from '@/shared/design-system';
import { studyApi, authApi } from '@/services/api';
import { StudyHistoryItem } from '@/types';
import { MESSAGES } from '@/constants/app';
import { useNavigate } from 'react-router-dom';
import { PullToRefresh } from './PullToRefresh';
import { StudySavedLessonView } from './study/StudySavedLessonView';
import { lessonFromStored, historySessionToConfig, hasFullLessonContent } from '@/utils/lessonPersist';

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
 * StudyHistory component displays all past study sessions with details
 */
export const StudyHistory = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<StudyHistoryItem[]>([]);
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

      const response = await studyApi.getStudyHistory((user as { id: string }).id);
      if (response.success && response.sessions) {
        setHistory(response.sessions);
      } else {
        setHistory([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load study history. Please try again.'
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
            <Text fontSize="lg">Loading your study history...</Text>
          </VStack>
        </Box>
      </PullToRefresh>
    );
  }

  if (error) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <Box padding={6} maxWidth="900px" margin="0 auto">
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button marginTop={4} colorScheme="blue" onClick={loadHistory}>
            Retry
          </Button>
        </Box>
      </PullToRefresh>
    );
  }

  if (history.length === 0) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <Box padding={6} maxWidth="900px" margin="0 auto">
          <VStack spacing={6}>
            <Heading size="lg" color="blue.600">
              Study History 📚
            </Heading>
            <Card width="100%">
              <CardBody>
                <VStack spacing={4}>
                  <Text fontSize="xl">📚</Text>
                  <Text fontSize="lg" color="gray.600">
                    No study history yet. Start studying to see your topics here!
                  </Text>
                  <Button colorScheme="blue" onClick={() => navigate('/study')}>
                    Start Studying
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </Box>
      </PullToRefresh>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <Box padding={6} maxWidth="1200px" margin="0 auto">
      <VStack spacing={6} align="stretch">
        <HStack justifyContent="space-between" alignItems="center">
          <Heading size="lg" color="blue.600">
            Study History 📚
          </Heading>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            {MESSAGES.BACK_TO_DASHBOARD}
          </Button>
        </HStack>

        <Text fontSize="md" color="gray.600">
          You have studied {history.length} topic{history.length !== 1 ? 's' : ''}. Click on any topic to view details.
        </Text>

        <Accordion allowToggle>
          {history.map((session) => (
            <AccordionItem key={session.id}>
              <AccordionButton padding={4}>
                <Box flex="1" textAlign="left">
                  <HStack spacing={4} alignItems="center">
                    <VStack align="start" spacing={1} flex="1">
                      <HStack spacing={2}>
                        <Text fontWeight="bold" fontSize="lg">
                          {session.lesson_title}
                        </Text>
                        <Badge colorScheme="blue">{session.subject}</Badge>
                        <Badge colorScheme="green">{session.topic}</Badge>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        {formatDate(session.timestamp)} • {session.difficulty} • {session.language}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel padding={4}>
                {hasFullLessonContent(session) ? (
                  <StudySavedLessonView
                    lesson={lessonFromStored(session)!}
                    config={historySessionToConfig(session)}
                    gradeLabel={`Class ${Math.floor(session.age / 2) + 1}`}
                  />
                ) : (
                <VStack spacing={4} align="stretch">
                  <Divider />
                  
                  {/* Introduction */}
                  <Card>
                    <CardBody>
                      <VStack spacing={3} align="stretch">
                        <Heading size="sm" color="blue.600">
                          Introduction
                        </Heading>
                        <Text fontSize="sm" lineHeight="tall" color="gray.700">
                          {session.lesson_introduction}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Explanation Points */}
                  <Card>
                    <CardBody>
                      <VStack spacing={3} align="stretch">
                        <Heading size="sm" color="blue.600">
                          Topic Explanation
                        </Heading>
                        <List spacing={2}>
                          {session.lesson_explanation.map((point, index) => (
                            <ListItem key={index}>
                              <HStack align="flex-start" spacing={3}>
                                <ListIcon
                                  as={() => (
                                    <Text fontSize="lg" color="blue.500" fontWeight="bold">
                                      •
                                    </Text>
                                  )}
                                />
                                <Text fontSize="sm" lineHeight="tall" color="gray.700" flex={1}>
                                  {point}
                                </Text>
                              </HStack>
                            </ListItem>
                          ))}
                        </List>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Key Points */}
                  <Card bg="yellow.50" borderColor="yellow.200">
                    <CardBody>
                      <VStack spacing={3} align="stretch">
                        <Heading size="sm" color="yellow.700">
                          Key Points to Remember
                        </Heading>
                        <Box
                          display="grid"
                          gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
                          gap={2}
                        >
                          {session.lesson_key_points.map((point, index) => (
                            <Box
                              key={index}
                              padding={2}
                              bg="white"
                              borderRadius="md"
                              borderLeftWidth={3}
                              borderLeftColor="yellow.400"
                            >
                              <Text fontSize="xs" color="gray.700">
                                {index + 1}. {point}
                              </Text>
                            </Box>
                          ))}
                        </Box>
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Examples */}
                  {session.lesson_examples.length > 0 && (
                    <Card bg="green.50" borderColor="green.200">
                      <CardBody>
                        <VStack spacing={3} align="stretch">
                          <Heading size="sm" color="green.700">
                            Examples
                          </Heading>
                          {session.lesson_examples.map((example, index) => (
                            <Box
                              key={index}
                              padding={3}
                              bg="white"
                              borderRadius="md"
                              borderLeftWidth={4}
                              borderLeftColor="green.400"
                            >
                              <Text fontSize="sm" lineHeight="tall" color="gray.700">
                                {example}
                              </Text>
                            </Box>
                          ))}
                        </VStack>
                      </CardBody>
                    </Card>
                  )}

                  {/* Summary */}
                  <Card bg="purple.50" borderColor="purple.200">
                    <CardBody>
                      <VStack spacing={3} align="stretch">
                        <Heading size="sm" color="purple.700">
                          Summary
                        </Heading>
                        <Text fontSize="sm" lineHeight="tall" color="gray.700" fontWeight="medium">
                          {session.lesson_summary}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                </VStack>
                )}
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </VStack>
    </Box>
    </PullToRefresh>
  );
};

