/**
 * My Schedules — all exam plans; today shown inside each open schedule card.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  Heading,
  HStack,
  Spinner,
  Text,
  VStack,
  useColorModeValue,
  useDisclosure,
} from '@/shared/design-system';
import { FiCheckCircle, FiClock } from 'react-icons/fi';
import { getErrorMessage } from '@/services/api';
import { studyPlanApi, type StudyPlanRecord } from '@/services/studyPlan';
import type { StudyPlanDay } from '@/utils/studyPlanSchedule';
import { getPlanDisplayStatus } from '@/utils/studyPlanStatus';
import { StudyPlanCard } from './StudyPlanCard';
import { StudyPlanLessonView } from './StudyPlanLessonView';
import { StudyPlanGeneratorModal } from './StudyPlanGeneratorModal';
import { PullToRefresh } from '@/components/PullToRefresh';

export function MySchedulesPage() {
  const [plans, setPlans] = useState<StudyPlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lessonCtx, setLessonCtx] = useState<{ plan: StudyPlanRecord; day: StudyPlanDay } | null>(null);
  const generator = useDisclosure();

  const muted = useColorModeValue('gray.600', 'gray.400');

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studyPlanApi.list();
      setPlans(data.plans);
    } catch (e) {
      setError(getErrorMessage(e));
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
    const onUpdate = () => void loadPlans();
    window.addEventListener('study-plan:updated', onUpdate);
    return () => window.removeEventListener('study-plan:updated', onUpdate);
  }, [loadPlans]);

  const startLesson = (plan: StudyPlanRecord, day: StudyPlanDay) => {
    setLessonCtx({ plan, day });
  };

  const ongoingCount = plans.filter((p) => getPlanDisplayStatus(p) === 'ongoing').length;
  const completedCount = plans.filter((p) => getPlanDisplayStatus(p) === 'completed').length;

  if (lessonCtx) {
    const { plan, day } = lessonCtx;
    return (
      <Box p={{ base: 3, md: 6 }} maxW="960px" mx="auto" w="100%">
        <StudyPlanLessonView
          planId={plan.id}
          examName={plan.examName}
          examBoard={plan.examBoard}
          day={day}
          onBack={() => setLessonCtx(null)}
        />
      </Box>
    );
  }

  return (
    <PullToRefresh onRefresh={loadPlans}>
      <Box p={{ base: 3, md: 6 }} maxW="960px" mx="auto" w="100%">
        <VStack align="stretch" spacing={4}>
          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <Box>
              <Heading size={{ base: 'md', md: 'lg' }} color="purple.600">
                My Schedules
              </Heading>
              <Text fontSize="sm" color={muted} mt={1}>
                Multiple plans can run together — open a schedule to see today&apos;s lesson.
              </Text>
            </Box>
            <Button colorScheme="purple" size="sm" onClick={generator.onOpen}>
              + Generate schedule
            </Button>
          </HStack>

          {plans.length > 0 && (
            <HStack spacing={3} flexWrap="wrap" fontSize="xs" color={muted}>
              <HStack spacing={1}>
                <Box color="green.500" fontSize="sm" aria-hidden><FiClock /></Box>
                <Text>{ongoingCount} ongoing</Text>
              </HStack>
              <HStack spacing={1}>
                <Box color="gray.500" fontSize="sm" aria-hidden><FiCheckCircle /></Box>
                <Text>{completedCount} completed</Text>
              </HStack>
            </HStack>
          )}

          {loading && (
            <HStack py={8} justify="center">
              <Spinner size="sm" />
              <Text fontSize="sm" color={muted}>Loading schedules…</Text>
            </HStack>
          )}

          {!loading && error && <Text fontSize="sm" color="red.500">{error}</Text>}

          {!loading && plans.length === 0 && !error && (
            <Card>
              <CardBody>
                <VStack spacing={3} py={4}>
                  <Text fontSize="4xl">📅</Text>
                  <Text fontWeight="semibold" textAlign="center">No study schedules yet</Text>
                  <Text fontSize="sm" color={muted} textAlign="center">
                    Tap Generate schedule to build a day-by-day exam prep plan.
                  </Text>
                  <Button colorScheme="purple" onClick={generator.onOpen}>
                    Generate schedule
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          )}

          {!loading && plans.length > 0 && (
            <VStack align="stretch" spacing={3}>
              {plans.map((plan) => (
                <StudyPlanCard
                  key={plan.id}
                  plan={plan}
                  expanded={expandedId === plan.id}
                  onToggle={() => setExpandedId((id) => (id === plan.id ? null : plan.id))}
                  onStartDay={startLesson}
                />
              ))}
            </VStack>
          )}
        </VStack>
      </Box>

      <StudyPlanGeneratorModal
        isOpen={generator.isOpen}
        onClose={generator.onClose}
        onCreated={() => void loadPlans()}
      />
    </PullToRefresh>
  );
}
