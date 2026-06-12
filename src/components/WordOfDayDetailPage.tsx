/**
 * Full detail page for a Word of the Day entry.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box, VStack, HStack, Heading, Text, Badge, Button, Spinner,
  Card, CardBody, Divider, IconButton,
} from '@/shared/design-system';
import { publicApi } from '@/services/api';
import type { WordOfDayResponse } from '@/types/wordOfDay';
import { CommonPhrasesSection } from './wordOfDay/CommonPhrasesSection';
import { MESSAGES } from '@/constants/app';

export const WordOfDayDetailPage: React.FC = () => {
  const { word } = useParams<{ word: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const date = searchParams.get('date') || '';
  const grade = searchParams.get('grade') || 'Class 5 / Grade 5';

  const [data, setData] = useState<WordOfDayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!word) return;
    setLoading(true);
    setError(false);
    try {
      const response = await publicApi.getWordOfDayDetail(word, date, grade);
      if (response.success && response.word) {
        setData(response);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [word, date, grade]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <VStack py={12} spacing={4}>
        <Spinner size="lg" color="purple.500" />
        <Text color="gray.500">Loading word details…</Text>
      </VStack>
    );
  }

  if (error || !data?.word) {
    return (
      <VStack py={12} spacing={4}>
        <Text fontSize="2xl">📖</Text>
        <Text color="gray.500">Could not load this word.</Text>
        <Button colorScheme="purple" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
      </VStack>
    );
  }

  const entry = data.word;
  const allSynonyms = [...new Set(entry.meanings.flatMap((m) => m.synonyms))];
  const allAntonyms = [...new Set(entry.meanings.flatMap((m) => m.antonyms))];

  const playAudio = () => {
    if (entry.audioUrl) new Audio(entry.audioUrl).play().catch(() => null);
  };

  return (
    <Box maxW="800px" mx="auto" py={{ base: 4, md: 6 }}>
      <Button size="sm" variant="ghost" colorScheme="purple" mb={4} onClick={() => navigate('/dashboard')}>
        ← Back to Dashboard
      </Button>

      <Card borderColor="purple.200" borderWidth={2}>
        <CardBody p={{ base: 4, md: 6 }}>
          <VStack spacing={5} align="stretch">
            <HStack justify="space-between" flexWrap="wrap" gap={2}>
              <HStack spacing={3} flexWrap="wrap">
                <Heading size="lg" color="purple.700" textTransform="capitalize">{entry.word}</Heading>
                {entry.phonetic && <Text fontStyle="italic" color="gray.500">{entry.phonetic}</Text>}
                {entry.audioUrl && (
                  <IconButton aria-label="Play pronunciation" icon={<Text>🔊</Text>}
                    size="sm" variant="ghost" colorScheme="purple" onClick={playAudio} />
                )}
              </HStack>
              <Badge colorScheme="purple">{data.complexity}</Badge>
            </HStack>

            <Text fontSize="sm" color="gray.500">{data.grade} · {data.date}</Text>

            {entry.detailedExplanation && (
              <Box bg="purple.50" p={4} borderRadius="lg">
                <Text fontWeight="bold" color="purple.800" mb={2}>What does it mean?</Text>
                <Text color="gray.700" lineHeight="tall">{entry.detailedExplanation}</Text>
              </Box>
            )}

            {entry.communicationTip && (
              <Box bg="orange.50" p={4} borderRadius="lg" borderLeft="4px solid" borderLeftColor="orange.400">
                <Text fontWeight="bold" color="orange.800" mb={2}>
                  {MESSAGES.WORD_OF_THE_DAY_COMMUNICATION_TIP}
                </Text>
                <Text color="gray.700" lineHeight="tall">{entry.communicationTip}</Text>
              </Box>
            )}

            {entry.meanings.map((meaning, mi) => (
              <Box key={mi}>
                <Badge colorScheme="purple" mb={2} textTransform="capitalize">{meaning.partOfSpeech}</Badge>
                <VStack spacing={2} align="stretch" pl={2}>
                  {meaning.definitions.map((def, di) => (
                    <Box key={di}>
                      <Text color="gray.700">{def.definition}</Text>
                      {def.example && (
                        <Text fontSize="sm" color="gray.500" fontStyle="italic" mt={1}>
                          "{def.example}"
                        </Text>
                      )}
                    </Box>
                  ))}
                </VStack>
              </Box>
            ))}

            <Divider />

            {allSynonyms.length > 0 && (
              <Box>
                <Text fontWeight="bold" color="green.700" mb={2}>✅ Synonyms (similar meaning)</Text>
                <HStack spacing={2} flexWrap="wrap">
                  {allSynonyms.map((s) => (
                    <Badge key={s} colorScheme="green" variant="subtle">{s}</Badge>
                  ))}
                </HStack>
              </Box>
            )}

            {allAntonyms.length > 0 && (
              <Box>
                <Text fontWeight="bold" color="red.700" mb={2}>❌ Antonyms (opposite meaning)</Text>
                <HStack spacing={2} flexWrap="wrap">
                  {allAntonyms.map((a) => (
                    <Badge key={a} colorScheme="red" variant="subtle">{a}</Badge>
                  ))}
                </HStack>
              </Box>
            )}

            {(entry.realWorldExamples?.length || entry.schoolExample || entry.dailyLifeExample) && (
              <Box>
                <Text fontWeight="bold" color="blue.700" mb={2}>🌍 Real-World Examples</Text>
                <VStack spacing={2} align="stretch">
                  {entry.schoolExample && (
                    <Box bg="blue.50" p={3} borderRadius="md">
                      <Badge colorScheme="blue" mb={1}>School</Badge>
                      <Text fontSize="sm" color="gray.700">{entry.schoolExample}</Text>
                    </Box>
                  )}
                  {entry.dailyLifeExample && (
                    <Box bg="green.50" p={3} borderRadius="md">
                      <Badge colorScheme="green" mb={1}>Daily life</Badge>
                      <Text fontSize="sm" color="gray.700">{entry.dailyLifeExample}</Text>
                    </Box>
                  )}
                  {entry.realWorldExamples?.map((ex, i) => (
                    <Box key={i} bg="gray.50" p={3} borderRadius="md">
                      <Text fontSize="sm" color="gray.700" fontStyle="italic">"{ex}"</Text>
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}
          </VStack>
        </CardBody>
      </Card>

      <Box mt={6}>
        <CommonPhrasesSection phrases={data.phrases} />
      </Box>
    </Box>
  );
};
