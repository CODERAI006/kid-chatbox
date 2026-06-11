/**
 * Collapsible card for one exam prep schedule (ongoing or completed).
 */
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Collapse,
  Heading,
  HStack,
  Text,
  VStack,
  useColorModeValue,
} from '@/shared/design-system';
import { FiCheckCircle, FiClock, FiArchive } from 'react-icons/fi';
import type { StudyPlanRecord } from '@/services/studyPlan';
import type { StudyPlanDay } from '@/utils/studyPlanSchedule';
import { formatPlanDate, isPlanDayToday } from '@/utils/studyPlanDisplay';
import { getCachedLesson } from '@/utils/studyPlanLessonCache';
import { getPlanDisplayStatus, findPlanDayToday, type PlanDisplayStatus } from '@/utils/studyPlanStatus';
import { StudyScheduleDayRow } from './StudyScheduleDayRow';

const STATUS_META: Record<
  PlanDisplayStatus,
  { label: string; colorScheme: string; Icon: typeof FiClock }
> = {
  ongoing: { label: 'Ongoing', colorScheme: 'green', Icon: FiClock },
  completed: { label: 'Completed', colorScheme: 'gray', Icon: FiCheckCircle },
  cancelled: { label: 'Archived', colorScheme: 'orange', Icon: FiArchive },
};

type Props = {
  plan: StudyPlanRecord;
  expanded: boolean;
  onToggle: () => void;
  onStartDay: (plan: StudyPlanRecord, day: StudyPlanDay) => void;
};

export function StudyPlanCard({ plan, expanded, onToggle, onStartDay }: Props) {
  const displayStatus = getPlanDisplayStatus(plan);
  const meta = STATUS_META[displayStatus];
  const todayEntry = findPlanDayToday(plan.schedule);
  const isOngoing = displayStatus === 'ongoing';

  const cardBorder = useColorModeValue(
    isOngoing ? 'green.300' : 'gray.200',
    isOngoing ? 'green.600' : 'gray.600'
  );
  const cardBg = useColorModeValue(
    isOngoing ? 'green.50' : 'white',
    isOngoing ? 'green.900' : 'gray.800'
  );
  const todayBg = useColorModeValue('green.100', 'green.800');
  const todayBorder = useColorModeValue('green.400', 'green.500');
  const muted = useColorModeValue('gray.600', 'gray.400');

  return (
    <Card
      borderWidth="1px"
      borderColor={cardBorder}
      bg={cardBg}
      cursor="pointer"
      onClick={onToggle}
      _hover={{ shadow: 'md' }}
      transition="box-shadow 0.2s"
      w="100%"
    >
      <CardBody>
        <VStack align="stretch" spacing={2}>
          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <HStack spacing={2} flex={1} minW={0}>
              <Box
                color={isOngoing ? 'green.500' : displayStatus === 'completed' ? 'gray.500' : 'orange.400'}
                fontSize="lg"
                aria-hidden
              >
                <meta.Icon />
              </Box>
              <Heading size="sm" noOfLines={2}>{plan.examName}</Heading>
            </HStack>
            <HStack spacing={2} flexShrink={0}>
              <Badge colorScheme={meta.colorScheme} display="flex" alignItems="center" gap={1}>
                <Box as="span" display="inline-flex" aria-hidden>
                  <meta.Icon size={12} />
                </Box>
                {meta.label}
              </Badge>
              {plan.examBoard && (
                <Badge colorScheme="purple" variant="subtle">{plan.examBoard}</Badge>
              )}
              <Badge colorScheme="purple">{plan.schedule.length} days</Badge>
            </HStack>
          </HStack>

          <HStack spacing={4} flexWrap="wrap" fontSize="sm" color={muted}>
            <Text>Exam: {formatPlanDate(plan.examDate)}</Text>
            <Text>{plan.hoursPerDay}h / day</Text>
          </HStack>

          <Text fontSize="xs" color={muted}>
            {expanded ? 'Tap to hide schedule ▲' : 'Tap to open schedule ▼'}
          </Text>
        </VStack>

        <Collapse in={expanded} animateOpacity>
          <VStack align="stretch" spacing={3} mt={3} onClick={(e) => e.stopPropagation()}>
            {isOngoing && todayEntry && (
              <Box
                p={3}
                borderRadius="md"
                borderWidth="2px"
                borderColor={todayBorder}
                bg={todayBg}
                cursor="pointer"
                onClick={() => onStartDay(plan, todayEntry)}
                _hover={{ shadow: 'sm' }}
              >
                <VStack align="stretch" spacing={2}>
                  <HStack spacing={2} flexWrap="wrap">
                    <Box color="green.600" fontSize="md" aria-hidden><FiClock /></Box>
                    <Text fontSize="sm" fontWeight="bold">Today&apos;s lesson</Text>
                    <Badge colorScheme="green">Day {todayEntry.dayNumber}</Badge>
                    {getCachedLesson(plan.id, todayEntry) && (
                      <Badge colorScheme="purple" fontSize="2xs">Lesson saved</Badge>
                    )}
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">{todayEntry.focus}</Text>
                  <Text fontSize="sm">{todayEntry.topics.join(' · ')}</Text>
                  <Text fontSize="xs" color={muted}>{formatPlanDate(todayEntry.date)}</Text>
                  <Button
                    size="sm"
                    colorScheme="purple"
                    alignSelf="flex-start"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartDay(plan, todayEntry);
                    }}
                  >
                    {getCachedLesson(plan.id, todayEntry) ? 'Continue lesson' : 'Start today\'s lesson'}
                  </Button>
                </VStack>
              </Box>
            )}

            {plan.schedule.map((day) => (
              <StudyScheduleDayRow
                key={`${plan.id}-${day.dayNumber}-${day.date}`}
                day={day}
                examName={plan.examName}
                planId={plan.id}
                isToday={isPlanDayToday(day.date)}
                onStartDay={(d) => onStartDay(plan, d)}
              />
            ))}
          </VStack>
        </Collapse>
      </CardBody>
    </Card>
  );
}
