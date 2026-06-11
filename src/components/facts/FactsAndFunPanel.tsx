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
import FactCard from './FactCard';
import type { DailyFact, DailyFactsResponse, FactSubjectId } from '@/types/dailyFacts';

const toYMD = (d: Date) => [
  d.getFullYear(),
  String(d.getMonth() + 1).padStart(2, '0'),
  String(d.getDate()).padStart(2, '0'),
].join('-');

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
  const today = toYMD(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [data, setData] = useState<DailyFactsResponse | null>(null);
  const [archiveDates, setArchiveDates] = useState<string[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<FactSubjectId | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    loadFacts(selectedDate);
  }, [selectedDate, loadFacts]);

  useEffect(() => {
    publicApi.getDailyFactsDates(gradeLabel).then((res) => {
      if (res.success) setArchiveDates(res.dates);
    });
  }, [gradeLabel]);

  const subjects = data?.subjects || [];
  const filtered = useMemo(() => {
    const facts = data?.facts || [];
    if (subjectFilter === 'all') return facts;
    return facts.filter((f) => f.subject === subjectFilter);
  }, [data, subjectFilter]);

  const subjectMap = useMemo(() => {
    const m = new Map<string, (typeof subjects)[0]>();
    subjects.forEach((s) => m.set(s.id, s));
    return m;
  }, [subjects]);

  return (
    <VStack align="stretch" spacing={{ base: 4, md: 5 }} maxW="1200px" mx="auto" w="100%">
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
              10 facts for your class today
            </Text>
            <Text fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }} color="orange.50" mt={1}>
              Science, geography, history, India, sports &amp; more — saved once per day for your class.
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
          </HStack>
        </VStack>
      </Box>

      {archiveDates.length > 1 && (
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
        {formatDisplayDate(selectedDate)}
      </Text>

      <Box>
        <QuizSectionLabel>Filter by area</QuizSectionLabel>
        <HStack flexWrap="wrap" spacing={2}>
          <QuizPill
            label="All areas"
            active={subjectFilter === 'all'}
            onClick={() => setSubjectFilter('all')}
            cs="gray"
          />
          {subjects.map((s) => (
            <QuizPill
              key={s.id}
              label={`${s.emoji} ${s.label}`}
              active={subjectFilter === s.id}
              onClick={() => setSubjectFilter(s.id as FactSubjectId)}
              cs="orange"
            />
          ))}
        </HStack>
      </Box>

      {loading ? (
        <VStack spacing={4} align="stretch">
          <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.500" textAlign="center">
            {selectedDate === today
              ? 'Loading today\'s facts for your class…'
              : 'Loading saved facts…'}
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={{ base: 3, md: 4 }}>
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
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={{ base: 3, md: 4 }}>
          {filtered.map((fact: DailyFact, i: number) => (
            <FactCard
              key={fact.id}
              fact={fact}
              subjectMeta={subjectMap.get(fact.subject)}
              index={data?.facts?.indexOf(fact) ?? i}
            />
          ))}
        </SimpleGrid>
      )}

      {!loading && filtered.length === 0 && !error && (
        <Text textAlign="center" fontSize={{ base: 'sm', md: 'md' }} color="gray.500" py={8}>
          No facts in this area for the selected day.
        </Text>
      )}
    </VStack>
  );
}
