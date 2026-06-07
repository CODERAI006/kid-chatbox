/**
 * WordOfTheDay — 3 class-based words + 5 idiomatic phrases per day
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Card, CardBody, Heading, Text, VStack, HStack,
  Spinner, Divider, Button, IconButton,
} from '@/shared/design-system';
import { publicApi } from '@/services/api';
import type { WordOfDayResponse } from '@/types/wordOfDay';
import { WordOfDayCard } from './wordOfDay/WordOfDayCard';
import { WordOfDayDashboardList } from './wordOfDay/WordOfDayDashboardList';
import { CommonPhrasesSection } from './wordOfDay/CommonPhrasesSection';

const toYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (d: Date, n: number): Date => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

const formatDisplayDate = (d: Date): string =>
  d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const isToday = (d: Date): boolean => toYMD(d) === toYMD(new Date());

interface WordOfTheDayProps {
  grade?: string;
  /** Shorter cards on dashboard — no scroll, tap for full detail page. */
  variant?: 'full' | 'dashboard';
}

export const WordOfTheDay: React.FC<WordOfTheDayProps> = ({ grade, variant = 'full' }) => {
  const isDashboard = variant === 'dashboard';
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [data, setData] = useState<WordOfDayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const gradeLabel = grade || 'Class 5 / Grade 5';

  const loadWords = useCallback(async (date: Date) => {
    setLoading(true);
    setError(false);
    try {
      const dateStr = toYMD(date);
      const cacheKey = `wotd_v4:${gradeLabel}:${dateStr}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as WordOfDayResponse;
        if (parsed?.words?.length) { setData(parsed); setLoading(false); return; }
      }
      const response = await publicApi.getWordsOfTheDay(dateStr, gradeLabel);
      if (response.success && response.words?.length > 0) {
        setData(response);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(response)); } catch { /* ignore */ }
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [gradeLabel]);

  useEffect(() => { loadWords(selectedDate); }, [selectedDate, loadWords]);

  const navigate = (n: number) => setSelectedDate((d) => addDays(d, n));

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parts = e.target.value.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      setSelectedDate(new Date(parts[0], parts[1] - 1, parts[2]));
    }
  };

  return (
    <Card bg="white" borderColor="purple.200" borderWidth={2} boxShadow="md">
      <CardBody p={{ base: 3, md: 4 }}>
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
            <VStack spacing={0} align="start">
              <Heading size="sm" color="purple.700">📚 Words of the Day</Heading>
              <Text fontSize="xs" color="gray.500">
                {isDashboard
                  ? `Today's 3 words for ${gradeLabel}`
                  : `3 words for ${gradeLabel} — tap any word for full details`}
              </Text>
            </VStack>
            {!isToday(selectedDate) && (
              <Button size="xs" colorScheme="purple" variant="outline" onClick={() => setSelectedDate(new Date())}>
                Today
              </Button>
            )}
          </HStack>

          <HStack justify="space-between" align="center" bg="purple.50" p={2} borderRadius="lg">
            <IconButton
              aria-label="Previous day" icon={<Text>◀</Text>}
              size="sm" variant="ghost" colorScheme="purple" onClick={() => navigate(-1)}
            />
            <VStack spacing={0} flex={1} align="center">
              <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="semibold" color="purple.800" textAlign="center">
                {formatDisplayDate(selectedDate)}
              </Text>
              <input
                type="date" value={toYMD(selectedDate)} onChange={handleDateInput}
                max={toYMD(new Date())}
                style={{ fontSize: '11px', color: '#6B46C1', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'center' }}
              />
            </VStack>
            <IconButton
              aria-label="Next day" icon={<Text>▶</Text>}
              size="sm" variant="ghost" colorScheme="purple" onClick={() => navigate(1)}
              isDisabled={isToday(selectedDate)}
            />
          </HStack>

          <Divider borderColor="purple.100" />

          {loading && (
            <VStack spacing={3} py={6}>
              <Spinner size="lg" color="purple.500" />
              <Text fontSize="sm" color="gray.500">Loading today's words…</Text>
            </VStack>
          )}

          {error && !loading && (
            <VStack spacing={3} py={4}>
              <Text fontSize="2xl">📖</Text>
              <Text fontSize="sm" color="gray.500" textAlign="center">
                Couldn't load today's words. Check your connection and try again.
              </Text>
              <Button size="sm" colorScheme="purple" onClick={() => loadWords(selectedDate)}>Retry</Button>
            </VStack>
          )}

          {!loading && !error && data && (data.words?.length ?? 0) > 0 && (
            isDashboard ? (
              <VStack spacing={3} align="stretch">
                <WordOfDayDashboardList
                  words={data.words}
                  complexity={data.complexity}
                  grade={data.grade}
                  date={data.date}
                />
                <CommonPhrasesSection phrases={data.phrases ?? []} compact />
              </VStack>
            ) : (
              <VStack spacing={4} align="stretch">
                {data.words.map((entry, i) => (
                  <WordOfDayCard
                    key={entry.word}
                    entry={entry}
                    index={i}
                    complexity={data.complexity}
                    grade={data.grade}
                    date={data.date}
                  />
                ))}
                <CommonPhrasesSection phrases={data.phrases} />
              </VStack>
            )
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};
