import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  HStack,
  Input,
  SimpleGrid,
  Skeleton,
  Text,
  VStack,
} from '@/shared/design-system';
import { publicApi } from '@/services/api';
import { QuizPill, QuizSectionLabel } from '@/components/quiz/quizFormUi';
import { MESSAGES } from '@/constants/app';
import type { DailyPhrase } from '@/types/wordOfDay';
import { ExpressionCard } from './ExpressionCard';
import { ExpressionDetailModal } from './ExpressionDetailModal';
import { ExpressionsArchivePanel } from './ExpressionsArchivePanel';
import type { ExpressionDetail } from './expressionUtils';
import { formatEditionDate, getUserGradeLabel } from './expressionUtils';

type ViewMode = 'today' | 'archive';
type ContextFilter = 'all' | 'school' | 'daily';

const toYMD = (d: Date) => [
  d.getFullYear(),
  String(d.getMonth() + 1).padStart(2, '0'),
  String(d.getDate()).padStart(2, '0'),
].join('-');

export function ExpressionsPanel() {
  const gradeLabel = getUserGradeLabel();
  const today = toYMD(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [phrases, setPhrases] = useState<DailyPhrase[]>([]);
  const [archiveDates, setArchiveDates] = useState<string[]>([]);
  const [contextFilter, setContextFilter] = useState<ContextFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailExpression, setDetailExpression] = useState<ExpressionDetail | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('today');

  const loadExpressions = useCallback(async (dateStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await publicApi.getWordsOfTheDay(dateStr, gradeLabel);
      if (res.success && res.phrases?.length) {
        setPhrases(res.phrases);
      } else {
        setError('No expressions available for this day.');
        setPhrases([]);
      }
    } catch {
      setError('Could not load expressions. Check your connection.');
      setPhrases([]);
    } finally {
      setLoading(false);
    }
  }, [gradeLabel]);

  useEffect(() => {
    if (viewMode === 'today') loadExpressions(selectedDate);
  }, [selectedDate, loadExpressions, viewMode]);

  useEffect(() => {
    publicApi.getExpressionDates(gradeLabel).then((res) => {
      if (res.success) setArchiveDates(res.dates);
    });
  }, [gradeLabel]);

  const filtered = useMemo(() => {
    if (contextFilter === 'all') return phrases;
    return phrases.filter((p) => p.context === contextFilter);
  }, [phrases, contextFilter]);

  const openDetail = (expression: ExpressionDetail) => setDetailExpression(expression);

  return (
    <VStack align="stretch" spacing={{ base: 4, md: 5 }} w="100%" minW={0}>
      <Box
        p={{ base: 3, md: 5 }}
        borderRadius={{ base: 'xl', md: '2xl' }}
        bgGradient="linear(to-br, teal.400, teal.500, cyan.500)"
        color="white"
        boxShadow="md"
      >
        <VStack align="stretch" spacing={3}>
          <Box>
            <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="extrabold">
              5 expressions for better communication
            </Text>
            <Text fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }} color="teal.50" mt={1}>
              Idioms and phrases for school and daily life — saved once per day for your class.
            </Text>
          </Box>
          <HStack flexWrap="wrap" gap={2} justify="space-between" align={{ base: 'stretch', sm: 'center' }}>
            <HStack spacing={2} bg="whiteAlpha.200" borderRadius="lg" px={3} py={1.5} fontSize={{ base: '2xs', sm: 'xs' }} fontWeight="semibold">
              <Text aria-hidden>🎓</Text>
              <Text>{gradeLabel}</Text>
            </HStack>
            {viewMode === 'today' && (
              <Box minW={{ base: '100%', sm: '180px' }}>
                <QuizSectionLabel>Pick a day</QuizSectionLabel>
                <Input
                  type="date"
                  value={selectedDate}
                  max={today}
                  size="sm"
                  bg="white"
                  color="gray.900"
                  borderRadius="lg"
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                />
              </Box>
            )}
          </HStack>
        </VStack>
      </Box>

      <Box minW={0}>
        <QuizSectionLabel>View</QuizSectionLabel>
        <HStack spacing={2} flexWrap="wrap">
          <QuizPill label="Today's edition" active={viewMode === 'today'} onClick={() => setViewMode('today')} cs="teal" />
          <QuizPill label="All expressions till today" active={viewMode === 'archive'} onClick={() => setViewMode('archive')} cs="gray" />
        </HStack>
      </Box>

      {viewMode === 'today' && archiveDates.length > 1 && (
        <Box>
          <QuizSectionLabel>Earlier editions</QuizSectionLabel>
          <HStack flexWrap="wrap" spacing={2}>
            {archiveDates.slice(0, 14).map((d) => (
              <QuizPill
                key={d}
                label={
                  d === today
                    ? 'Today'
                    : new Date(`${d}T12:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                }
                active={d === selectedDate}
                onClick={() => setSelectedDate(d)}
                cs="teal"
              />
            ))}
          </HStack>
        </Box>
      )}

      <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.500">
        {viewMode === 'archive'
          ? `Every saved expression for your class until ${formatEditionDate(today)}`
          : formatEditionDate(selectedDate)}
      </Text>

      <Box minW={0}>
        <QuizSectionLabel>Filter by context</QuizSectionLabel>
        <HStack spacing={2} flexWrap="wrap">
          <QuizPill label="All" active={contextFilter === 'all'} onClick={() => setContextFilter('all')} cs="gray" />
          <QuizPill label="🏫 School" active={contextFilter === 'school'} onClick={() => setContextFilter('school')} cs="blue" />
          <QuizPill label="🏠 Daily life" active={contextFilter === 'daily'} onClick={() => setContextFilter('daily')} cs="green" />
        </HStack>
      </Box>

      {viewMode === 'archive' ? (
        <ExpressionsArchivePanel
          gradeLabel={gradeLabel}
          untilDate={today}
          contextFilter={contextFilter}
          onOpenDetail={openDetail}
        />
      ) : loading ? (
        <VStack spacing={4} align="stretch">
          <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.500" textAlign="center">
            {selectedDate === today ? "Loading today's expressions…" : 'Loading saved expressions…'}
          </Text>
          <SimpleGrid minChildWidth={{ base: '100%', md: '260px', lg: '300px' }} spacing={{ base: 3, md: 4 }} w="100%">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height="176px" borderRadius="xl" />
            ))}
          </SimpleGrid>
        </VStack>
      ) : error ? (
        <Box textAlign="center" py={10} bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200">
          <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.600" mb={4}>
            {error}
          </Text>
          <Button size="sm" colorScheme="teal" onClick={() => loadExpressions(selectedDate)}>
            Try again
          </Button>
        </Box>
      ) : (
        <SimpleGrid minChildWidth={{ base: '100%', md: '260px', lg: '300px' }} spacing={{ base: 3, md: 4 }} w="100%">
          {filtered.map((phrase, i) => (
            <ExpressionCard
              key={phrase.id || `${phrase.phrase}-${i}`}
              expression={{ ...phrase, editionDate: selectedDate }}
              index={i}
              onOpenDetail={openDetail}
            />
          ))}
        </SimpleGrid>
      )}

      {viewMode === 'today' && !loading && filtered.length === 0 && !error && (
        <Text textAlign="center" fontSize={{ base: 'sm', md: 'md' }} color="gray.500" py={8}>
          No expressions in this context for the selected day.
        </Text>
      )}

      {!loading && viewMode === 'today' && filtered.length > 0 && (
        <Text fontSize="xs" color="gray.400" textAlign="center">
          {MESSAGES.IDIOMS_AI_LABEL}
        </Text>
      )}

      <ExpressionDetailModal
        expression={detailExpression}
        isOpen={Boolean(detailExpression)}
        onClose={() => setDetailExpression(null)}
      />
    </VStack>
  );
}
