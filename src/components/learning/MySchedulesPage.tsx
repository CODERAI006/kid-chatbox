/**

 * My Schedules — today's lesson, collapsed plan card, in-page rich lessons.

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

  useDisclosure,

} from '@/shared/design-system';

import { getErrorMessage } from '@/services/api';

import { studyPlanApi, type StudyPlanRecord } from '@/services/studyPlan';

import type { StudyPlanDay } from '@/utils/studyPlanSchedule';

import { formatPlanDate, isPlanDayToday } from '@/utils/studyPlanDisplay';
import { getCachedLesson } from '@/utils/studyPlanLessonCache';

import { StudyScheduleDayRow } from './StudyScheduleDayRow';

import { StudyPlanLessonView } from './StudyPlanLessonView';

import { StudyPlanGeneratorModal } from './StudyPlanGeneratorModal';

import { PullToRefresh } from '@/components/PullToRefresh';



export function MySchedulesPage() {

  const [plan, setPlan] = useState<StudyPlanRecord | null>(null);

  const [today, setToday] = useState<StudyPlanDay | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState(false);

  const [activeLesson, setActiveLesson] = useState<StudyPlanDay | null>(null);

  const generator = useDisclosure();



  const cardBorder = useColorModeValue('purple.200', 'purple.700');

  const cardBg = useColorModeValue('purple.50', 'gray.800');

  const todayBg = useColorModeValue('green.50', 'green.900');

  const todayBorder = useColorModeValue('green.300', 'green.600');

  const muted = useColorModeValue('gray.600', 'gray.400');



  const loadPlan = useCallback(async () => {

    setLoading(true);

    setError(null);

    try {

      const data = await studyPlanApi.getActive();

      setPlan(data.plan);

      setToday(data.today);

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



  const startLesson = (day: StudyPlanDay) => {

    setActiveLesson(day);

    setExpanded(false);

  };



  if (activeLesson && plan) {

    return (

      <Box p={{ base: 3, md: 6 }} maxW="960px" mx="auto" w="100%">

        <StudyPlanLessonView

          planId={plan.id}

          examName={plan.examName}

          day={activeLesson}

          onBack={() => setActiveLesson(null)}

        />

      </Box>

    );

  }



  return (

    <PullToRefresh onRefresh={loadPlan}>

      <Box p={{ base: 3, md: 6 }} maxW="960px" mx="auto" w="100%">

        <VStack align="stretch" spacing={4}>

          <HStack justify="space-between" flexWrap="wrap" gap={2}>

            <Box>

              <Heading size={{ base: 'md', md: 'lg' }} color="purple.600">

                My Schedules

              </Heading>

              <Text fontSize="sm" color={muted} mt={1}>

                Track your exam plan and study with fun in-page lessons.

              </Text>

            </Box>

            <Button colorScheme="purple" size="sm" onClick={generator.onOpen}>

              + Generate schedule

            </Button>

          </HStack>



          {loading && (

            <HStack py={8} justify="center">

              <Spinner size="sm" />

              <Text fontSize="sm" color={muted}>Loading schedule…</Text>

            </HStack>

          )}



          {!loading && error && <Text fontSize="sm" color="red.500">{error}</Text>}



          {!loading && !plan && !error && (

            <Card>

              <CardBody>

                <VStack spacing={3} py={4}>

                  <Text fontSize="4xl">📅</Text>

                  <Text fontWeight="semibold" textAlign="center">No study schedule yet</Text>

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



          {!loading && plan && (

            <>

              {today && (

                <Card
                  borderWidth="2px"
                  borderColor={todayBorder}
                  bg={todayBg}
                  cursor="pointer"
                  onClick={() => startLesson(today)}
                  _hover={{ shadow: 'md' }}
                  transition="box-shadow 0.2s"
                >
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between" flexWrap="wrap" gap={2}>
                        <HStack spacing={2}>
                          <Text fontSize="lg">📌</Text>
                          <Heading size="sm">Today&apos;s schedule</Heading>
                          <Badge colorScheme="green">Day {today.dayNumber}</Badge>
                          {getCachedLesson(plan.id, today) && (
                            <Badge colorScheme="purple" fontSize="2xs">Lesson saved</Badge>
                          )}
                        </HStack>
                        <Text fontSize="xs" color={muted}>{formatPlanDate(today.date)}</Text>
                      </HStack>
                      <Text fontSize="sm" fontWeight="medium">{today.focus}</Text>
                      <Text fontSize="sm">{today.topics.join(' · ')}</Text>
                      <Text fontSize="xs" color={muted}>
                        Tap card to open your lesson{getCachedLesson(plan.id, today) ? ' (last generated)' : ''}
                      </Text>
                      <Button
                        colorScheme="purple"
                        size="md"
                        onClick={(e) => {
                          e.stopPropagation();
                          startLesson(today);
                        }}
                      >
                        {getCachedLesson(plan.id, today) ? 'Continue lesson' : 'Start today\'s lesson'}
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>

              )}



              <Card

                borderWidth="1px"

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

                    <Text fontSize="xs" color={muted}>

                      {expanded ? 'Tap to hide full schedule ▲' : 'Tap to view full schedule ▼'}

                    </Text>

                  </VStack>

                </CardBody>

              </Card>



              <Collapse in={expanded} animateOpacity>

                <VStack align="stretch" spacing={3}>

                  {plan.schedule.map((day) => (

                    <StudyScheduleDayRow

                      key={`${day.dayNumber}-${day.date}`}

                      day={day}

                      examName={plan.examName}

                      isToday={isPlanDayToday(day.date)}

                      onStartDay={(d) => startLesson(d)}

                    />

                  ))}

                </VStack>

              </Collapse>

            </>

          )}

        </VStack>

      </Box>



      <StudyPlanGeneratorModal

        isOpen={generator.isOpen}

        onClose={generator.onClose}

        onCreated={() => void loadPlan()}

      />

    </PullToRefresh>

  );

}

