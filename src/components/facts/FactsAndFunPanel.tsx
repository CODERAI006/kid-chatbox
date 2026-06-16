import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { useCalendarDay } from '@/hooks/useCalendarDay';
import { publicApi } from '@/services/api';
import { QuizPill, QuizSectionLabel } from '@/components/quiz/quizFormUi';
import FactCard from './FactCard';
import FactDetailModal from './FactDetailModal';
import FactsArchivePanel from './FactsArchivePanel';
import type { DailyFact, DailyFactsResponse, FactCategory } from '@/types/dailyFacts';
import { resolveFactCategorySlug } from '@/utils/factCategoryUi';

type ViewMode = 'today' | 'archive';

function getUserGrade(): string {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u?.grade) return u.grade;
    }
  } catch {
    /* ignore */
  }
  return 'Class 5 / Grade 5';
}

function formatDisplayDate(dateStr: string) {
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function FactsAndFunPanel() {
  const gradeLabel = getUserGrade();
  const today = useCalendarDay();
  const prevTodayRef = useRef(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [data, setData] = useState<DailyFactsResponse | null>(null);
  const [archiveDates, setArchiveDates] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailFact, setDetailFact] = useState<DailyFact | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('today');

  const loadFacts = useCallback(async (dateStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await publicApi.getDailyFacts(dateStr, gradeLabel);
      if (res.success && res.facts?.length) {
        setData(res);
      } else {
        setError(res.message || 'No facts available for this day.');
        setData(null);
      }
    } catch {
      setError('Could not load facts. Check your connection.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [gradeLabel]);

  useEffect(() => {
    if (prevTodayRef.current !== today) {
      if (selectedDate === prevTodayRef.current) {
        setSelectedDate(today);
      }
      prevTodayRef.current = today;
    }
  }, [today, selectedDate]);

  useEffect(() => {
    if (viewMode === 'today') loadFacts(selectedDate);
  }, [selectedDate, loadFacts, viewMode]);

  useEffect(() => {
    publicApi.getDailyFactsDates(gradeLabel).then((res) => {
      if (res.success) setArchiveDates(res.dates);
    });
  }, [gradeLabel]);

  const categories = data?.categories || [];
  const filtered = useMemo(() => {
    const facts = data?.facts || [];
    if (categoryFilter === 'all') return facts;
    return facts.filter((f) => resolveFactCategorySlug(f) === categoryFilter);
  }, [data, categoryFilter]);

  const categoryMap = useMemo(() => {
    const m = new Map<string, FactCategory>();
    categories.forEach((c) => m.set(c.slug, c));
    return m;
  }, [categories]);

  return (
    <VStack align="stretch" spacing={{ base: 4, md: 5 }} w="100%" minW={0}>
      <Box
        p={{ base: 3, md: 5 }}
        borderRadius={{ base: 'xl', md: '2xl' }}
        bgGradient="linear(to-br, orange.400, orange.500, pink.500)"
        color="white"
        boxShadow="md"
      >
        <VStack align="stretch" spacing={3}>
          <Box>
            <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="extrabold">
              10 fresh facts today
            </Text>
            <Text fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }} color="orange.50" mt={1}>
              New edition every day · science, geography, history, India, sports &amp; more — saved in your library.
            </Text>
          </Box>
          <HStack
            flexWrap="wrap"
            gap={2}
            justify="space-between"
            align={{ base: 'stretch', sm: 'center' }}
          >
            <HStack
              spacing={2}
              bg="whiteAlpha.200"
              borderRadius="lg"
              px={3}
              py={1.5}
              fontSize={{ base: '2xs', sm: 'xs' }}
              fontWeight="semibold"
            >
              <Text aria-hidden>🎓</Text>
              <Text>{gradeLabel}</Text>
              {data?.cached && <Text opacity={0.85}>· saved edition</Text>}
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
        <HStack
          spacing={2}
          flexWrap="wrap"
          overflowX="auto"
          pb={1}
          css={{ WebkitOverflowScrolling: 'touch' }}
        >
          <QuizPill
            label="Today's edition"
            active={viewMode === 'today'}
            onClick={() => setViewMode('today')}
            cs="orange"
          />
          <QuizPill
            label="All facts till today"
            active={viewMode === 'archive'}
            onClick={() => setViewMode('archive')}
            cs="gray"
          />
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
                    : new Date(`${d}T12:00:00`).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })
                }
                active={d === selectedDate}
                onClick={() => setSelectedDate(d)}
                cs="orange"
              />
            ))}
          </HStack>
        </Box>
      )}

      <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.500">
        {viewMode === 'archive'
          ? `Every saved fact for your class until ${formatDisplayDate(today)}`
          : formatDisplayDate(selectedDate)}
      </Text>

      <Box minW={0}>
        <QuizSectionLabel>Filter by category</QuizSectionLabel>
        <Box
          overflowX="auto"
          pb={1}
          mx={{ base: -1, md: 0 }}
          px={{ base: 1, md: 0 }}
          css={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
          }}
        >
          <HStack spacing={2} flexWrap={{ base: 'nowrap', lg: 'wrap' }} w="max-content" maxW="100%">
            <QuizPill
              label="All categories"
              active={categoryFilter === 'all'}
              onClick={() => setCategoryFilter('all')}
              cs="gray"
            />
            {categories.slice(0, 24).map((c) => (
              <QuizPill
                key={c.slug}
                label={`${c.emoji} ${c.label}`}
                active={categoryFilter === c.slug}
                onClick={() => setCategoryFilter(c.slug)}
                cs="orange"
              />
            ))}
          </HStack>
        </Box>
      </Box>

      {viewMode === 'archive' ? (
        <FactsArchivePanel
          gradeLabel={gradeLabel}
          untilDate={today}
          categoryFilter={categoryFilter}
          categories={categories}
          onOpenDetail={setDetailFact}
        />
      ) : loading ? (
        <VStack spacing={4} align="stretch">
          <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.500" textAlign="center">
            {selectedDate === today
              ? 'Loading today\'s facts for your class…'
              : 'Loading saved facts…'}
          </Text>
          <SimpleGrid
            minChildWidth={{ base: '100%', md: '260px', lg: '300px' }}
            spacing={{ base: 3, md: 4 }}
            w="100%"
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} height="176px" borderRadius="xl" />
            ))}
          </SimpleGrid>
        </VStack>
      ) : error ? (
        <Box textAlign="center" py={10} bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200">
          <Text fontSize={{ base: 'xl', md: '2xl' }} mb={2} aria-hidden>
            ⚠️
          </Text>
          <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.600" mb={1}>
            {error}
          </Text>
          <Text fontSize={{ base: '2xs', sm: 'xs' }} color="gray.400" mb={4} maxW="md" mx="auto" px={4}>
            Facts are created via Ollama. Ensure it is running and configured in admin.
          </Text>
          <Button
            size="sm"
            colorScheme="orange"
            leftIcon={<Text aria-hidden>🔄</Text>}
            onClick={() => loadFacts(selectedDate)}
          >
            Try again
          </Button>
        </Box>
      ) : (
        <SimpleGrid
          minChildWidth={{ base: '100%', md: '260px', lg: '300px' }}
          spacing={{ base: 3, md: 4 }}
          w="100%"
        >
          {filtered.map((fact: DailyFact, i: number) => (
            <FactCard
              key={fact.id}
              fact={fact}
              categoryMeta={categoryMap.get(resolveFactCategorySlug(fact))}
              index={data?.facts?.indexOf(fact) ?? i}
              onOpenDetail={setDetailFact}
            />
          ))}
        </SimpleGrid>
      )}

      {viewMode === 'today' && !loading && filtered.length === 0 && !error && (
        <Text textAlign="center" fontSize={{ base: 'sm', md: 'md' }} color="gray.500" py={8}>
          No facts in this category for the selected day.
        </Text>
      )}

      <FactDetailModal
        fact={detailFact}
        categoryMeta={detailFact ? categoryMap.get(resolveFactCategorySlug(detailFact)) : undefined}
        isOpen={Boolean(detailFact)}
        onClose={() => setDetailFact(null)}
      />
    </VStack>
  );
}
