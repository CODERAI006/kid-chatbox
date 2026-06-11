/**
 * In-page scheduled lesson — rich cards generated at runtime (no Guru chat).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  HStack,
  Spinner,
  Text,
  VStack,
  useColorModeValue,
} from '@/shared/design-system';
import { getErrorMessage } from '@/services/api';
import { studyPlanApi } from '@/services/studyPlan';
import type { StudyPlanDay } from '@/utils/studyPlanSchedule';
import { formatPlanDate } from '@/utils/studyPlanDisplay';
import {
  clearCachedLesson,
  getCachedLesson,
  setCachedLesson,
} from '@/utils/studyPlanLessonCache';
import { LearningWorkspaceMessage } from './LearningWorkspaceMessage';

type Props = {
  planId: string;
  examName: string;
  examBoard?: string | null;
  day: StudyPlanDay;
  onBack: () => void;
};

export function StudyPlanLessonView({ planId, examName, examBoard, day, onBack }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const panelBg = useColorModeValue('gray.50', 'gray.900');
  const muted = useColorModeValue('gray.600', 'gray.400');

  const fetchLesson = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await studyPlanApi.generateLesson({
        examName,
        day,
        examBoard: examBoard || undefined,
        planId,
      });
      setContent(res.content);
      setCachedLesson(planId, day, res.content);
      setFromCache(false);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [examName, examBoard, day, planId]);

  const loadLesson = useCallback(
    async (forceRegenerate = false) => {
      if (!forceRegenerate) {
        const cached = getCachedLesson(planId, day);
        if (cached) {
          setContent(cached);
          setFromCache(true);
          setError(null);
          setLoading(false);
          return;
        }
      } else {
        clearCachedLesson(planId, day);
      }
      await fetchLesson();
    },
    [planId, day, fetchLesson]
  );

  useEffect(() => {
    void loadLesson(false);
  }, [loadLesson]);

  return (
    <VStack align="stretch" spacing={4} w="100%">
      <HStack justify="space-between" flexWrap="wrap" gap={2}>
        <Button size="sm" variant="ghost" onClick={onBack}>
          ← Back to schedule
        </Button>
        <Button
          size="sm"
          variant="outline"
          colorScheme="purple"
          onClick={() => void loadLesson(true)}
          isDisabled={loading}
        >
          Regenerate
        </Button>
      </HStack>

      <Box p={4} borderRadius="lg" bg={panelBg}>
        <Heading size="sm" color="purple.600">
          Day {day.dayNumber} · {formatPlanDate(day.date)}
        </Heading>
        <Text fontSize="sm" color={muted} mt={1}>
          {examName}{examBoard ? ` · ${examBoard}` : ''} — {day.focus}
        </Text>
        <Text fontSize="xs" color={muted} mt={1}>
          Topics: {day.topics.join(', ')}
        </Text>
        {fromCache && content && (
          <Text fontSize="xs" color="purple.600" mt={2}>
            Showing your last generated lesson. Tap Regenerate for a fresh one.
          </Text>
        )}
      </Box>

      {loading && (
        <HStack py={10} justify="center" spacing={3}>
          <Spinner color="purple.500" />
          <Text fontSize="sm" color={muted}>
            Building your fun lesson with facts, tips, and 15 Q&A questions…
          </Text>
        </HStack>
      )}

      {!loading && error && (
        <VStack spacing={2} py={4}>
          <Text fontSize="sm" color="red.500">{error}</Text>
          <Button size="sm" colorScheme="purple" onClick={() => void loadLesson(true)}>
            Try again
          </Button>
        </VStack>
      )}

      {!loading && content && (
        <LearningWorkspaceMessage content={content} studyFormat="studyplan-lesson" />
      )}
    </VStack>
  );
}
