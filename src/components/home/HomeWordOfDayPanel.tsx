/**
 * Landing-page Word of the Day — compact, mobile-first, dark glass style.
 * One featured word at a time with pill tabs; expression teaser below.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Spinner,
  Badge,
  IconButton,
} from '@/shared/design-system';
import { publicApi } from '@/services/api';
import type { WordEntry, WordOfDayResponse } from '@/types/wordOfDay';
import { DEFAULT_PUBLIC_GRADE } from '@/constants/puzzles';
import { MESSAGES } from '@/constants/app';

const CHIP_COLORS = ['purple', 'blue', 'teal'] as const;

const shortDate = (iso: string): string => {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface Props {
  grade?: string;
  onGetStarted?: () => void;
}

export function HomeWordOfDayPanel({ grade, onGetStarted }: Props) {
  const gradeLabel = grade || DEFAULT_PUBLIC_GRADE;
  const [data, setData] = useState<WordOfDayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await publicApi.getWordsOfTheDay(undefined, gradeLabel);
      if (res.success && res.words?.length) {
        setData(res);
        setActiveIdx(0);
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

  const words = data?.words ?? [];
  const active: WordEntry | undefined = words[activeIdx];
  const chipColor = CHIP_COLORS[activeIdx % CHIP_COLORS.length];

  const meaning = useMemo(() => {
    if (!active) return '';
    const def = active.meanings[0]?.definitions[0]?.definition;
    return active.simpleMeaning || def || '';
  }, [active]);

  const pos = active?.meanings[0]?.partOfSpeech;
  const synonyms = active?.meanings.flatMap((m) => m.synonyms).slice(0, 3) ?? [];
  const phrase = data?.phrases?.[0];

  const playAudio = () => {
    if (active?.audioUrl) new Audio(active.audioUrl).play().catch(() => null);
  };

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
          <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={2}>
            <VStack align="start" spacing={0} flex={1} minW={0}>
              <Heading size="sm" color="purple.200">
                {MESSAGES.WORD_OF_THE_DAY_TITLE}
              </Heading>
              <Text fontSize="xs" color="whiteAlpha.800" noOfLines={{ base: 2, md: 1 }}>
                3 fresh words daily · tap to explore
              </Text>
            </VStack>
            {data?.date && (
              <Badge
                colorScheme="purple"
                variant="subtle"
                fontSize="2xs"
                flexShrink={0}
                px={2}
              >
                Today · {shortDate(data.date)}
              </Badge>
            )}
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

          {!loading && !error && active && (
            <>
              {data?.theme?.label && (
                <Badge colorScheme="purple" fontSize="2xs" alignSelf="flex-start">
                  Theme: {data.theme.label}
                </Badge>
              )}

              <Box
                overflowX="auto"
                mx={{ base: -1, md: 0 }}
                px={{ base: 1, md: 0 }}
                css={{ '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}
              >
                <HStack spacing={2} minW="min-content" pb={0.5}>
                  {words.map((w, i) => (
                    <Button
                      key={w.word}
                      size="sm"
                      flexShrink={0}
                      variant={i === activeIdx ? 'solid' : 'outline'}
                      colorScheme={CHIP_COLORS[i % CHIP_COLORS.length]}
                      onClick={() => setActiveIdx(i)}
                      px={{ base: 3, md: 4 }}
                      fontSize={{ base: 'xs', md: 'sm' }}
                      textTransform="capitalize"
                    >
                      {i + 1}. {w.word}
                    </Button>
                  ))}
                </HStack>
              </Box>

              <Box
                bg="rgba(167,139,250,0.12)"
                border="1px solid"
                borderColor="rgba(167,139,250,0.25)"
                borderRadius="xl"
                p={{ base: 3, md: 4 }}
              >
                <HStack spacing={2} align="center" flexWrap="wrap" mb={2}>
                  <Text
                    fontSize={{ base: '2xl', md: '3xl' }}
                    fontWeight="extrabold"
                    color="white"
                    textTransform="capitalize"
                    lineHeight="shorter"
                  >
                    {active.word}
                  </Text>
                  {active.phonetic && (
                    <Text fontSize="sm" color="whiteAlpha.600" fontStyle="italic">
                      {active.phonetic}
                    </Text>
                  )}
                  {active.audioUrl && (
                    <IconButton
                      aria-label="Play pronunciation"
                      icon={<Text fontSize="sm">🔊</Text>}
                      size="xs"
                      variant="ghost"
                      colorScheme="purple"
                      onClick={playAudio}
                    />
                  )}
                  {pos && (
                    <Badge colorScheme={chipColor} fontSize="2xs" textTransform="capitalize">
                      {pos}
                    </Badge>
                  )}
                </HStack>

                <Text
                  fontSize={{ base: 'sm', md: 'md' }}
                  color="whiteAlpha.900"
                  lineHeight="tall"
                  noOfLines={3}
                >
                  {meaning}
                </Text>

                {synonyms.length > 0 && (
                  <HStack spacing={1} flexWrap="wrap" mt={2}>
                    <Text fontSize="2xs" color="green.300" fontWeight="semibold">
                      Like:
                    </Text>
                    {synonyms.map((s) => (
                      <Badge key={s} colorScheme="green" variant="subtle" fontSize="2xs">
                        {s}
                      </Badge>
                    ))}
                  </HStack>
                )}
              </Box>

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
