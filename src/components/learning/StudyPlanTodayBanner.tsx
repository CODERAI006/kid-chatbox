/**
 * Shows today's scheduled study topics inside the chat panel.
 */
import { useEffect, useState } from 'react';
import { Box, Button, HStack, Text, VStack, useColorModeValue } from '@/shared/design-system';
import { studyPlanApi } from '@/services/studyPlan';
import { buildStudyPlanPrompt, type StudyPlanDay } from '@/utils/studyPlanSchedule';

type Props = {
  onStartToday: (text: string) => void;
  disabled?: boolean;
};

export function StudyPlanTodayBanner({ onStartToday, disabled }: Props) {
  const [examName, setExamName] = useState('');
  const [today, setToday] = useState<StudyPlanDay | null>(null);
  const bg = useColorModeValue('purple.50', 'purple.900');
  const border = useColorModeValue('purple.200', 'purple.700');

  const loadToday = () => {
    studyPlanApi.getActive().then(({ plan, today: t }) => {
      if (plan && t) {
        setExamName(plan.examName);
        setToday(t);
      } else {
        setToday(null);
        setExamName('');
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadToday();
    const onUpdate = () => loadToday();
    window.addEventListener('study-plan:updated', onUpdate);
    window.addEventListener('study-plan:reminder', onUpdate);
    return () => {
      window.removeEventListener('study-plan:updated', onUpdate);
      window.removeEventListener('study-plan:reminder', onUpdate);
    };
  }, []);

  if (!today) return null;

  return (
    <Box p={3} borderRadius="md" bg={bg} borderWidth="1px" borderColor={border}>
      <VStack align="stretch" spacing={2}>
        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="bold">📅 Today — Day {today.dayNumber}</Text>
          <Text fontSize="xs" color="gray.500">{examName}</Text>
        </HStack>
        <Text fontSize="xs">{today.focus}</Text>
        <Text fontSize="xs" fontWeight="semibold">Topics: {today.topics.join(', ')}</Text>
        <Button
          size="sm"
          colorScheme="purple"
          isDisabled={disabled}
          onClick={() => onStartToday(buildStudyPlanPrompt(examName, today))}
        >
          Start today&apos;s lesson
        </Button>
      </VStack>
    </Box>
  );
}
