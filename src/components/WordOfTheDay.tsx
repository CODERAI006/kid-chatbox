/**
 * WordOfTheDay — today's words on the dashboard; archive via /daily-words.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardBody, Heading, Text, VStack, HStack,
  Spinner, Button, SimpleGrid,
} from '@/shared/design-system';
import { publicApi } from '@/services/api';
import type { WordOfDayResponse } from '@/types/wordOfDay';
import { WordOfDayCard } from './wordOfDay/WordOfDayCard';
import CommonPhrasesSection from './wordOfDay/CommonPhrasesSection';
import FactsAndFunPreview from './facts/FactsAndFunPreview';
import { prefetchWordOfDayDetails } from '@/utils/wordOfDayDetailCache';

interface WordOfTheDayProps {
  grade?: string;
  showAttachedSections?: boolean;
}

export const WordOfTheDay: React.FC<WordOfTheDayProps> = ({
  grade,
  showAttachedSections = true,
}) => {
  const navigate = useNavigate();
  const [data, setData] = useState<WordOfDayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const gradeLabel = grade || 'Class 5 / Grade 5';

  const loadWords = useCallback(async (bypassCache = false) => {
    setLoading(true);
    setError(false);
    try {
      const response = await publicApi.getWordsOfTheDay(undefined, gradeLabel, { bypassCache });
      if (response.success && response.words?.length > 0) {
        setData(response);
        void prefetchWordOfDayDetails(
          response.words.map((w) => w.word),
          response.date,
          response.grade,
        );
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [gradeLabel]);

  useEffect(() => { loadWords(); }, [loadWords]);

  const wordCard = (
    <Card bg="white" borderColor="purple.200" borderWidth={2} boxShadow="md">
      <CardBody p={{ base: 3, md: 4 }}>
        <VStack spacing={4} align="stretch">
          <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
            <Heading size="sm" color="purple.700">📚 Words of the Day</Heading>
            <Button
              size="xs"
              variant="outline"
              colorScheme="purple"
              onClick={() => navigate('/daily-words?view=archive')}
            >
              All words till today →
            </Button>
          </HStack>

          {loading && (
            <VStack spacing={3} py={6}>
              <Spinner size="lg" color="purple.500" />
              <Text fontSize="sm" color="gray.500">Loading today&apos;s words…</Text>
            </VStack>
          )}

          {error && !loading && (
            <VStack spacing={3} py={4}>
              <Text fontSize="2xl">📖</Text>
              <Text fontSize="sm" color="gray.500" textAlign="center">
                Couldn&apos;t load today&apos;s words. Check your connection and try again.
              </Text>
              <Button size="sm" colorScheme="purple" onClick={() => loadWords(true)}>Retry</Button>
            </VStack>
          )}

          {!loading && !error && data && data.words.length > 0 && (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              {data.words.map((entry, i) => (
                <WordOfDayCard
                  key={entry.word}
                  entry={entry}
                  index={i}
                  complexity={data.complexity}
                  grade={data.grade}
                  date={data.date}
                  compact
                />
              ))}
            </SimpleGrid>
          )}
        </VStack>
      </CardBody>
    </Card>
  );

  const expressionsSection =
    showAttachedSections && !loading && !error && data?.phrases?.length ? (
      <CommonPhrasesSection phrases={data.phrases} compact />
    ) : null;

  return (
    <VStack id="word-of-day" spacing={3} align="stretch" scrollMarginTop="5rem">
      {wordCard}
      {expressionsSection}
      {showAttachedSections && <FactsAndFunPreview grade={gradeLabel} />}
    </VStack>
  );
};
