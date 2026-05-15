/**
 * WordOfTheDay Component
 * Displays 5 advanced vocabulary words per day with date navigation,
 * synonyms, antonyms, definitions, and examples.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardBody, Heading, Text, VStack, HStack,
  Badge, Spinner, Divider, Button, IconButton, Collapse,
} from '@/shared/design-system';
import { publicApi } from '@/services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WordMeaning {
  partOfSpeech: string;
  definitions: Array<{ definition: string; example: string | null }>;
  synonyms: string[];
  antonyms: string[];
}

interface WordEntry {
  word: string;
  phonetic: string;
  audioUrl: string | null;
  meanings: WordMeaning[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── WordCard ─────────────────────────────────────────────────────────────────

interface WordCardProps {
  entry: WordEntry;
  index: number;
}

const WordCard: React.FC<WordCardProps> = ({ entry, index }) => {
  const [expanded, setExpanded] = useState(false);

  const playAudio = () => {
    if (entry.audioUrl) new Audio(entry.audioUrl).play().catch(() => null);
  };

  const firstMeaning = entry.meanings[0];
  const allSynonyms = entry.meanings.flatMap((m) => m.synonyms).slice(0, 6);
  const allAntonyms = entry.meanings.flatMap((m) => m.antonyms).slice(0, 6);

  const cardColors = [
    { bg: 'purple.50', border: 'purple.300', badge: 'purple', num: 'purple.700' },
    { bg: 'blue.50', border: 'blue.300', badge: 'blue', num: 'blue.700' },
    { bg: 'teal.50', border: 'teal.300', badge: 'teal', num: 'teal.700' },
    { bg: 'orange.50', border: 'orange.300', badge: 'orange', num: 'orange.700' },
    { bg: 'pink.50', border: 'pink.300', badge: 'pink', num: 'pink.700' },
  ];
  const color = cardColors[index % cardColors.length];

  return (
    <Card bg={color.bg} borderColor={color.border} borderWidth={1.5} boxShadow="sm">
      <CardBody p={{ base: 3, md: 4 }}>
        <VStack spacing={2} align="stretch">
          {/* Word header */}
          <HStack justify="space-between" align="start" flexWrap="wrap" gap={2}>
            <HStack spacing={2} align="center" flexWrap="wrap">
              <Box
                bg={color.border}
                color="white"
                borderRadius="full"
                w={7} h={7}
                display="flex" alignItems="center" justifyContent="center"
                fontSize="sm" fontWeight="bold" flexShrink={0}
              >
                {index + 1}
              </Box>
              <Text
                fontSize={{ base: 'xl', md: '2xl' }}
                fontWeight="extrabold"
                color={color.num}
                textTransform="capitalize"
              >
                {entry.word}
              </Text>
              {entry.phonetic && (
                <Text fontSize="sm" color="gray.500" fontStyle="italic">
                  {entry.phonetic}
                </Text>
              )}
              {entry.audioUrl && (
                <IconButton
                  aria-label="Play pronunciation"
                  icon={<Text fontSize="md">🔊</Text>}
                  size="xs" variant="ghost"
                  colorScheme={color.badge}
                  onClick={playAudio}
                />
              )}
            </HStack>
            {firstMeaning && (
              <Badge colorScheme={color.badge} fontSize="xs" textTransform="capitalize" alignSelf="center">
                {firstMeaning.partOfSpeech}
              </Badge>
            )}
          </HStack>

          {/* Primary definition */}
          {firstMeaning?.definitions[0] && (
            <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.700" lineHeight="tall" pl={9}>
              {firstMeaning.definitions[0].definition}
            </Text>
          )}

          {/* Primary example */}
          {firstMeaning?.definitions[0]?.example && (
            <Box
              bg="white" p={2} borderRadius="md"
              borderLeft="3px solid" borderLeftColor={color.border}
              ml={9}
            >
              <Text fontSize="xs" color="gray.600" fontStyle="italic">
                "{firstMeaning.definitions[0].example}"
              </Text>
            </Box>
          )}

          {/* Expand toggle */}
          <Button
            size="xs"
            variant="ghost"
            colorScheme={color.badge}
            alignSelf="flex-start"
            ml={9}
            onClick={() => setExpanded(!expanded)}
            rightIcon={<Text fontSize="xs">{expanded ? '▲' : '▼'}</Text>}
          >
            {expanded ? 'Less' : 'Synonyms, Antonyms & More'}
          </Button>

          <Collapse in={expanded} animateOpacity>
            <VStack spacing={3} align="stretch" pt={1} pl={9}>
              {/* Synonyms */}
              {allSynonyms.length > 0 && (
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="green.700" mb={1}>
                    ✅ Synonyms (similar meaning)
                  </Text>
                  <HStack spacing={1.5} flexWrap="wrap">
                    {allSynonyms.map((s, i) => (
                      <Badge key={i} colorScheme="green" variant="subtle" fontSize="xs" px={2} py={0.5}>
                        {s}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              )}

              {/* Antonyms */}
              {allAntonyms.length > 0 && (
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="red.700" mb={1}>
                    ❌ Antonyms (opposite meaning)
                  </Text>
                  <HStack spacing={1.5} flexWrap="wrap">
                    {allAntonyms.map((a, i) => (
                      <Badge key={i} colorScheme="red" variant="subtle" fontSize="xs" px={2} py={0.5}>
                        {a}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              )}

              {/* Extra meanings */}
              {entry.meanings.slice(1).map((meaning, mi) => (
                <Box key={mi}>
                  <Badge colorScheme={color.badge} fontSize="2xs" mb={1}>
                    {meaning.partOfSpeech}
                  </Badge>
                  {meaning.definitions.slice(0, 1).map((def, di) => (
                    <VStack key={di} spacing={1} align="stretch">
                      <Text fontSize="xs" color="gray.700">{def.definition}</Text>
                      {def.example && (
                        <Text fontSize="xs" color="gray.500" fontStyle="italic">
                          "{def.example}"
                        </Text>
                      )}
                    </VStack>
                  ))}
                </Box>
              ))}
            </VStack>
          </Collapse>
        </VStack>
      </CardBody>
    </Card>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const WordOfTheDay: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [words, setWords] = useState<WordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadWords = useCallback(async (date: Date) => {
    setLoading(true);
    setError(false);
    try {
      const dateStr = toYMD(date);
      const cached = sessionStorage.getItem(`wotd_v2:${dateStr}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.words?.length) { setWords(parsed.words); setLoading(false); return; }
      }
      const response = await publicApi.getWordsOfTheDay(dateStr);
      if (response.success && response.words.length > 0) {
        setWords(response.words);
        try { sessionStorage.setItem(`wotd_v2:${dateStr}`, JSON.stringify(response)); } catch { /* ignore */ }
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

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
          {/* Header */}
          <HStack justify="space-between" align="center">
            <VStack spacing={0} align="start">
              <Heading size="sm" color="purple.700">📚 Words of the Day</Heading>
              <Text fontSize="xs" color="gray.500">5 advanced vocabulary words — tap each to explore</Text>
            </VStack>
            {!isToday(selectedDate) && (
              <Button size="xs" colorScheme="purple" variant="outline" onClick={() => setSelectedDate(new Date())}>
                Today
              </Button>
            )}
          </HStack>

          {/* Date Navigation */}
          <HStack justify="space-between" align="center" bg="purple.50" p={2} borderRadius="lg">
            <IconButton
              aria-label="Previous day"
              icon={<Text>◀</Text>}
              size="sm" variant="ghost" colorScheme="purple"
              onClick={() => navigate(-1)}
            />
            <VStack spacing={0} flex={1} align="center">
              <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="semibold" color="purple.800" textAlign="center">
                {formatDisplayDate(selectedDate)}
              </Text>
              <input
                type="date"
                value={toYMD(selectedDate)}
                onChange={handleDateInput}
                max={toYMD(new Date())}
                style={{
                  fontSize: '11px', color: '#6B46C1', background: 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'center',
                }}
              />
            </VStack>
            <IconButton
              aria-label="Next day"
              icon={<Text>▶</Text>}
              size="sm" variant="ghost" colorScheme="purple"
              onClick={() => navigate(1)}
              isDisabled={isToday(selectedDate)}
            />
          </HStack>

          <Divider borderColor="purple.100" />

          {/* Content */}
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
                Couldn't load words. Check your connection and try again.
              </Text>
              <Button size="sm" colorScheme="purple" onClick={() => loadWords(selectedDate)}>
                Retry
              </Button>
            </VStack>
          )}

          {!loading && !error && words.length > 0 && (
            <VStack spacing={3} align="stretch">
              {words.map((entry, i) => (
                <WordCard key={entry.word} entry={entry} index={i} />
              ))}
            </VStack>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};
