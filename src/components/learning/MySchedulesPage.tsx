/**
 * My Schedules — view full exam prep plan with topics, dates, and daily tasks.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Collapse,
  Heading,
  HStack,
  Spinner,
  Text,
  VStack,
  useColorModeValue,
} from '@/shared/design-system';
import { getErrorMessage } from '@/services/api';
import { studyPlanApi, type StudyPlanRecord } from '@/services/studyPlan';
import type { StudyPlanDay } from '@/utils/studyPlanSchedule';
import {
  formatPlanDate,
  isPlanDayToday,
  openStudyPlanCreator,
  openStudyPlanDay,
} from '@/utils/studyPlanDisplay';
import { StudyScheduleDayRow } from './StudyScheduleDayRow';
import { PullToRefresh } from '@/components/PullToRefresh';

export function MySchedulesPage() {
  const [plan, setPlan] = useState<StudyPlanRecord | null>(null);
  const [today, setToday] = useState<StudyPlanDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const cardBorder = useColorModeValue('purple.200', 'purple.700');
  const cardBg = useColorModeValue('purple.50', 'gray.800');
  const muted = useColorModeValue('gray.600', 'gray.400');

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studyPlanApi.getActive();
      setPlan(data.plan);
      setToday(data.today);
      if (data.plan) setExpanded(true);
    } catch (e) {
      setError(getErrorMessage(e));
      setPlan(null);
      setToday(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlan();
    const onUpdate = () => void loadPlan();
    window.addEventListener('study-plan:updated', onUpdate);
    return () => window.removeEventListener('study-plan:updated', onUpdate);
  }, [loadPlan]);

  const startDay = (day: StudyPlanDay) => {
    if (!plan) return;
    openStudyPlanDay(plan.examName, day);
  };

  return (
    <PullToRefresh onRefresh={loadPlan}>
      <Box p={{ base: 3, md: 6 }} maxW="960px" mx="auto" w="100%">
        <VStack align="stretch" spacing={4}>
          <Heading size={{ base: 'md', md: 'lg' }} color="purple.600">
            My Schedules
          </Heading>
          <Text fontSize="sm" color={muted}>
            Your exam prep plan — topics, dates, and daily tasks in one place.
          </Text>

          {loading && (
            <HStack py={8} justify="center">
              <Spinner size="sm" />
              <Text fontSize="sm" color={muted}>Loading schedule…</Text>
            </HStack>
          )}

          {!loading && error && (
            <Text fontSize="sm" color="red.500">{error}</Text>
          )}

          {!loading && !plan && !error && (
            <Card>
              <CardBody>
                <VStack spacing={3} py={4}>
                  <Text fontSize="4xl">📅</Text>
                  <Text fontWeight="semibold" textAlign="center">No study schedule yet</Text>
                  <Text fontSize="sm" color={muted} textAlign="center">
                    Open Guru AI, pick Plan my studies, and we&apos;ll build a day-by-day plan for your exam.
                  </Text>
                  <Button colorScheme="purple" onClick={openStudyPlanCreator}>
                    Create a study schedule
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          )}

          {!loading && plan && (
            <>
              <Card
                borderWidth="2px"
                borderColor={cardBorder}
                bg={cardBg}
                cursor="pointer"
                onClick={() => setExpanded((v) => !v)}
                _hover={{ shadow: 'md' }}
                transition="box-shadow 0.2s"
              >
                <CardBody>
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between" flexWrap="wrap" gap={2}>
                      <Heading size="sm">{plan.examName}</Heading>
                      <Badge colorScheme="purple">{plan.schedule.length} days</Badge>
                    </HStack>
                    <HStack spacing={4} flexWrap="wrap" fontSize="sm" color={muted}>
                      <Text>Exam: {formatPlanDate(plan.examDate)}</Text>
                      <Text>{plan.hoursPerDay}h / day</Text>
                    </HStack>
                    {today && (
                      <Box pt={2} borderTopWidth="1px" borderColor={cardBorder}>
                        <Text fontSize="xs" fontWeight="bold" color="purple.600" mb={1}>
                          Today — Day {today.dayNumber}
                        </Text>
                        <Text fontSize="sm">{today.topics.join(', ')}</Text>
                      </Box>
                    )}
                    <Text fontSize="xs" color={muted}>
                      {expanded ? 'Tap to hide full schedule ▲' : 'Tap to view full schedule ▼'}
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <Collapse in={expanded} animateOpacity>
                <VStack align="stretch" spacing={3}>
                  {today && (
                    <Button
                      colorScheme="purple"
                      size="sm"
                      alignSelf="flex-start"
                      onClick={() => startDay(today)}
                    >
                      Start today&apos;s lesson in Guru AI
                    </Button>
                  )}
                  {plan.schedule.map((day) => (
                    <StudyScheduleDayRow
                      key={`${day.dayNumber}-${day.date}`}
                      day={day}
                      examName={plan.examName}
                      isToday={isPlanDayToday(day.date)}
                      onStartDay={isPlanDayToday(day.date) ? startDay : undefined}
                    />
                  ))}
                </VStack>
              </Collapse>
            </>
          )}
        </VStack>
      </Box>
    </PullToRefresh>
  );
}
