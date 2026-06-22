import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  HStack,
  Input,
  Text,
  VStack,
} from '@/shared/design-system';
import { publicApi } from '@/services/api';
import { QuizPill, QuizSectionLabel } from '@/components/quiz/quizFormUi';
import { formatEditionDate, getUserGradeLabel } from './expressionUtils';
import { WordsArchivePanel } from './WordsArchivePanel';

const toYMD = (d: Date) => [
  d.getFullYear(),
  String(d.getMonth() + 1).padStart(2, '0'),
  String(d.getDate()).padStart(2, '0'),
].join('-');

export function WordsOfDayPanel() {
  const [searchParams] = useSearchParams();
  const gradeLabel = getUserGradeLabel();
  const today = toYMD(new Date());
  const [untilDate, setUntilDate] = useState(today);
  const [editionDate, setEditionDate] = useState<string | null>(null);
  const [archiveDates, setArchiveDates] = useState<string[]>([]);

  useEffect(() => {
    if (searchParams.get('view') === 'archive') {
      setEditionDate(null);
    }
  }, [searchParams]);

  useEffect(() => {
    publicApi.getExpressionDates(gradeLabel, 60).then((res) => {
      if (res.success) setArchiveDates(res.dates);
    });
  }, [gradeLabel]);

  return (
    <VStack align="stretch" spacing={{ base: 4, md: 5 }} w="100%" minW={0}>
      <Box
        p={{ base: 3, md: 5 }}
        borderRadius={{ base: 'xl', md: '2xl' }}
        bgGradient="linear(to-br, purple.400, purple.500, pink.400)"
        color="white"
        boxShadow="md"
      >
        <VStack align="stretch" spacing={3}>
          <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="extrabold">
            All words saved for your class
          </Text>
          <Text fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }} color="purple.50">
            Browse every word generated until today. Filter by date to find a specific edition.
          </Text>
          <HStack spacing={2} bg="whiteAlpha.200" borderRadius="lg" px={3} py={1.5} fontSize="xs" fontWeight="semibold" alignSelf="flex-start">
            <Text aria-hidden>🎓</Text>
            <Text>{gradeLabel}</Text>
          </HStack>
        </VStack>
      </Box>

      <Box minW={0}>
        <QuizSectionLabel>Show words until</QuizSectionLabel>
        <Input
          type="date"
          value={untilDate}
          max={today}
          size="sm"
          bg="white"
          maxW="220px"
          onChange={(e) => e.target.value && setUntilDate(e.target.value)}
        />
      </Box>

      {archiveDates.length > 0 && (
        <Box>
          <QuizSectionLabel>Filter by edition date</QuizSectionLabel>
          <HStack flexWrap="wrap" spacing={2}>
            <QuizPill
              label="All dates"
              active={!editionDate}
              onClick={() => setEditionDate(null)}
              cs="gray"
            />
            {archiveDates.slice(0, 14).map((d) => (
              <QuizPill
                key={d}
                label={
                  d === today
                    ? 'Today'
                    : new Date(`${d}T12:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                }
                active={editionDate === d}
                onClick={() => setEditionDate(d)}
                cs="purple"
              />
            ))}
          </HStack>
        </Box>
      )}

      <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.500">
        {editionDate
          ? `Words from ${formatEditionDate(editionDate)}`
          : `All words until ${formatEditionDate(untilDate)}`}
      </Text>

      <WordsArchivePanel
        gradeLabel={gradeLabel}
        untilDate={untilDate}
        editionDate={editionDate}
      />

      {editionDate && (
        <Button size="sm" variant="ghost" colorScheme="purple" alignSelf="flex-start" onClick={() => setEditionDate(null)}>
          Clear date filter
        </Button>
      )}
    </VStack>
  );
}
