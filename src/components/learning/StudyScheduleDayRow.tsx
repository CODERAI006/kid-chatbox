/**
 * One day row in the study schedule detail list.
 */
import {
  Badge,
  Box,
  Button,
  HStack,
  Text,
  VStack,
  useColorModeValue,
} from '@/shared/design-system';
import type { StudyPlanDay } from '@/utils/studyPlanSchedule';
import { formatPlanDate } from '@/utils/studyPlanDisplay';

type Props = {
  day: StudyPlanDay;
  examName: string;
  isToday: boolean;
  onStartDay?: (day: StudyPlanDay) => void;
};

export function StudyScheduleDayRow({ day, examName, isToday, onStartDay }: Props) {
  const border = useColorModeValue(isToday ? 'purple.300' : 'gray.200', isToday ? 'purple.500' : 'gray.600');
  const bg = useColorModeValue(isToday ? 'purple.50' : 'white', isToday ? 'purple.900' : 'gray.800');

  return (
    <Box
      p={4}
      borderRadius="md"
      borderWidth="1px"
      borderColor={border}
      bg={bg}
      w="100%"
    >
      <VStack align="stretch" spacing={2}>
        <HStack justify="space-between" flexWrap="wrap" gap={2}>
          <HStack spacing={2}>
            <Badge colorScheme={isToday ? 'purple' : 'gray'}>Day {day.dayNumber}</Badge>
            {isToday && <Badge colorScheme="green">Today</Badge>}
          </HStack>
          <Text fontSize="sm" fontWeight="semibold">{formatPlanDate(day.date)}</Text>
        </HStack>

        <Text fontSize="sm" color="gray.600">{examName}</Text>
        <Text fontSize="sm" fontWeight="medium">{day.focus}</Text>

        <Box>
          <Text fontSize="xs" fontWeight="bold" mb={1}>Topics</Text>
          <Text fontSize="sm">{day.topics.join(' · ')}</Text>
        </Box>

        <Box>
          <Text fontSize="xs" fontWeight="bold" mb={1}>Tasks</Text>
          <VStack align="stretch" spacing={0.5} pl={2}>
            {day.tasks.map((task) => (
              <Text key={task} fontSize="xs" color="gray.600">• {task}</Text>
            ))}
          </VStack>
        </Box>

        <HStack justify="space-between" flexWrap="wrap" gap={2}>
          <Text fontSize="xs" color="gray.500">
            ~{Math.round(day.durationMinutes / 60 * 10) / 10}h study time
          </Text>
          {isToday && onStartDay && (
            <Button size="xs" colorScheme="purple" onClick={() => onStartDay(day)}>
              Start lesson
            </Button>
          )}
        </HStack>
      </VStack>
    </Box>
  );
}
