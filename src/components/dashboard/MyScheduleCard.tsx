/**
 * Dashboard card — quick link to the active study schedule.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Card,
  CardBody,
  Heading,
  HStack,
  Text,
  VStack,
  useColorModeValue,
} from '@/shared/design-system';
import { FiCalendar } from 'react-icons/fi';
import { studyPlanApi } from '@/services/studyPlan';
import type { StudyPlanDay } from '@/utils/studyPlanSchedule';
import { formatPlanDate } from '@/utils/studyPlanDisplay';

export function MyScheduleCard() {
  const navigate = useNavigate();
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [today, setToday] = useState<StudyPlanDay | null>(null);
  const [dayCount, setDayCount] = useState(0);

  const titleColor = useColorModeValue('purple.700', 'purple.300');
  const subtitleColor = useColorModeValue('gray.600', 'gray.400');
  const rowBorder = useColorModeValue('gray.200', 'gray.600');
  const rowHoverBg = useColorModeValue('purple.50', 'gray.700');

  useEffect(() => {
    const load = () => {
      studyPlanApi.getActive().then(({ plan, today: t }) => {
        if (!plan) {
          setExamName('');
          setToday(null);
          setDayCount(0);
          return;
        }
        setExamName(plan.examName);
        setExamDate(plan.examDate);
        setToday(t);
        setDayCount(plan.schedule.length);
      }).catch(() => {});
    };
    load();
    window.addEventListener('study-plan:updated', load);
    return () => window.removeEventListener('study-plan:updated', load);
  }, []);

  const goSchedules = () => navigate('/my-schedules');

  return (
    <Card
      borderWidth="1px"
      borderColor={rowBorder}
      boxShadow="md"
      w="100%"
      cursor="pointer"
      onClick={goSchedules}
      _hover={{ bg: rowHoverBg, shadow: 'lg' }}
      transition="all 0.15s"
    >
      <CardBody p={{ base: 4, md: 5 }}>
        <HStack spacing={3} align="start" mb={3}>
          <Box color="purple.500" fontSize="xl">
            <FiCalendar />
          </Box>
          <Box flex={1}>
            <Heading size={{ base: 'sm', md: 'md' }} color={titleColor}>
              My Schedules
            </Heading>
            <Text fontSize="sm" color={subtitleColor} mt={1}>
              {examName
                ? 'Tap to see your full day-by-day exam prep plan.'
                : 'Create an exam prep schedule in Guru AI — then track it here.'}
            </Text>
          </Box>
        </HStack>

        {examName ? (
          <VStack align="stretch" spacing={2}>
            <HStack justify="space-between" flexWrap="wrap" gap={2}>
              <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>{examName}</Text>
              <Badge colorScheme="purple">{dayCount} days</Badge>
            </HStack>
            <Text fontSize="xs" color={subtitleColor}>
              Exam {formatPlanDate(examDate)}
            </Text>
            {today && (
              <Box p={2} borderRadius="md" bg={rowHoverBg}>
                <Text fontSize="xs" fontWeight="bold" color="purple.600">
                  Today — Day {today.dayNumber}
                </Text>
                <Text fontSize="xs" color={subtitleColor} noOfLines={2}>
                  {today.topics.join(', ')}
                </Text>
              </Box>
            )}
          </VStack>
        ) : (
          <Text fontSize="sm" color={subtitleColor}>
            No schedule yet · Guru AI → Plan my studies
          </Text>
        )}
      </CardBody>
    </Card>
  );
}
