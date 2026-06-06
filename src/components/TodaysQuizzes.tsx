/**
 * Today's Quizzes — nightly scheduler batch (IST), hybrid tracked start.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Text, Heading, Badge, Button, Spinner,
  SimpleGrid, useColorModeValue, useToast,
} from '@/shared/design-system';
import { motion } from 'framer-motion';
import { quizApi } from '@/services/api';
import { apiClient } from '@/services/api';

interface TodaySet {
  id: string;
  title: string;
  subject: string;
  subtopics: string[];
  difficulty: string;
  question_count: number;
  tags?: string[];
}

interface TodayPayload {
  batchTag: string | null;
  batchStatus?: string;
  dateKey: string;
  timezone: string;
  sets: TodaySet[];
}

const DIFF_COLOR: Record<string, string> = {
  Easy: 'green', Medium: 'yellow', Hard: 'red', Mixed: 'purple',
};

export const TodaysQuizzes: React.FC = () => {
  const [data, setData] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('teal.100', 'teal.700');

  const load = useCallback(async () => {
    try {
      const r = await apiClient.get<{ success: boolean; data: TodayPayload }>('/quiz-scheduler/today');
      if (r.data.success) setData(r.data.data);
    } catch {
      toast({ title: 'Could not load today\'s quizzes', status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStart = async (set: TodaySet) => {
    setStarting(set.id);
    try {
      const tracked = await apiClient.post<{ success: boolean; quizId: string }>(
        `/quiz-library/${set.id}/start-tracked`
      );
      const quizId = tracked.data.quizId;
      const attempt = await quizApi.startQuizAttempt(quizId);
      navigate(`/quiz/attempt/${attempt.attempt.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not start quiz';
      toast({ title: 'Failed to start quiz', description: msg, status: 'error', duration: 4000 });
    } finally {
      setStarting(null);
    }
  };

  if (loading) return <Spinner size="md" />;
  if (!data?.sets?.length) return null;

  return (
    <Box mb={6}>
      <HStack justify="space-between" mb={3}>
        <Heading size="sm" color="teal.600">
          🌙 Today&apos;s Quizzes (IST)
        </Heading>
        {data.batchTag && (
          <Badge colorScheme="teal" fontSize="xs">{data.batchTag}</Badge>
        )}
      </HStack>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
        {data.sets.map((q) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Box bg={cardBg} border="1px" borderColor={borderColor} rounded="xl" p={4} shadow="md">
              <VStack align="start" spacing={2}>
                <Badge colorScheme="teal" fontSize="xs">NIGHTLY</Badge>
                <Text fontWeight="bold" fontSize="sm" noOfLines={2}>{q.title}</Text>
                <HStack flexWrap="wrap" spacing={1}>
                  <Badge colorScheme={DIFF_COLOR[q.difficulty] || 'gray'}>{q.difficulty}</Badge>
                  <Badge variant="outline">{q.question_count} Qs</Badge>
                </HStack>
                <Text fontSize="xs" color="gray.500" noOfLines={1}>
                  {(q.subtopics || []).join(' · ') || q.subject}
                </Text>
                <Button
                  size="sm"
                  colorScheme="teal"
                  w="full"
                  isLoading={starting === q.id}
                  onClick={() => void handleStart(q)}
                >
                  Start Quiz
                </Button>
              </VStack>
            </Box>
          </motion.div>
        ))}
      </SimpleGrid>
    </Box>
  );
};
