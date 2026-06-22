/**
 * Landing-page Word of the Day — 4 words in a 2×2 grid, daily theme, dark glass style.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Spinner,
  SimpleGrid,
  Box,
} from '@/shared/design-system';
import { publicApi } from '@/services/api';
import type { WordOfDayResponse } from '@/types/wordOfDay';
import { DEFAULT_PUBLIC_GRADE } from '@/constants/puzzles';
import { MESSAGES } from '@/constants/app';
import { WORDS_PER_DAY } from '@/constants/wordOfDay';
import { HomeWordMiniCard } from './HomeWordMiniCard';

const HOME_WORD_COUNT = WORDS_PER_DAY;

interface Props {
  grade?: string;
  onGetStarted?: () => void;
}

export function HomeWordOfDayPanel({ grade, onGetStarted }: Props) {
  const gradeLabel = grade || DEFAULT_PUBLIC_GRADE;
  const [data, setData] = useState<WordOfDayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await publicApi.getWordsOfTheDay(undefined, gradeLabel);
      if (res.success && res.words?.length) {
        setData(res);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [gradeLabel]);

  useEffect(() => { load(); }, [load]);

  const words = (data?.words ?? []).slice(0, HOME_WORD_COUNT);
  const phrase = data?.phrases?.[0];

  return (
    <Card
      bg="rgba(255,255,255,0.08)"
      borderColor="rgba(167,139,250,0.35)"
      borderWidth={2}
      boxShadow="md"
      backdropFilter="blur(10px)"
      h="100%"
    >
      <CardBody p={{ base: 3, md: 4 }}>
        <VStack align="stretch" spacing={{ base: 3, md: 4 }}>
          <HStack justify="space-between" align="center" flexWrap="nowrap" gap={3}>
            <Heading size="sm" color="purple.200" noOfLines={1} flex={1} minW={0}>
              {MESSAGES.WORD_OF_THE_DAY_TITLE}
            </Heading>
          </HStack>

          {loading && (
            <HStack justify="center" py={5}>
              <Spinner size="md" color="purple.300" />
            </HStack>
          )}

          {error && !loading && (
            <VStack spacing={2} py={3}>
              <Text fontSize="sm" color="whiteAlpha.700" textAlign="center">
                Couldn&apos;t load today&apos;s words.
              </Text>
              <Button size="xs" colorScheme="purple" variant="outline" onClick={load}>
                Retry
              </Button>
            </VStack>
          )}

          {!loading && !error && words.length > 0 && (
            <>
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                {words.map((w, i) => (
                  <HomeWordMiniCard
                    key={w.word}
                    entry={w}
                    index={i}
                    date={data!.date}
                    grade={data!.grade}
                  />
                ))}
              </SimpleGrid>

              {phrase && (
                <Box
                  bg="rgba(251,146,60,0.1)"
                  border="1px solid"
                  borderColor="rgba(251,146,60,0.25)"
                  borderRadius="lg"
                  px={3}
                  py={2}
                >
                  <Text fontSize="xs" color="orange.200" fontWeight="bold" mb={0.5}>
                    💬 Expression of the day
                  </Text>
                  <Text fontSize="sm" color="whiteAlpha.900" noOfLines={2}>
                    <Text as="span" fontWeight="semibold" color="orange.100">
                      {phrase.phrase}
                    </Text>
                    {' — '}
                    {phrase.meaning}
                  </Text>
                </Box>
              )}

              {onGetStarted && (
                <Button
                  size="sm"
                  colorScheme="purple"
                  variant="outline"
                  w="100%"
                  onClick={onGetStarted}
                >
                  Sign up for your grade&apos;s words →
                </Button>
              )}
            </>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}
