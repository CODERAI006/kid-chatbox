/**
 * Summary card for today's Word of the Day with link to detail page.
 */

import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardBody, Text, VStack, HStack, Badge, Button, IconButton,
} from '@/shared/design-system';
import type { WordEntry, WordComplexity } from '@/types/wordOfDay';

const COMPLEXITY_LABELS: Record<WordComplexity, string> = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

interface WordOfDayCardProps {
  word: WordEntry;
  complexity: WordComplexity;
  grade: string;
  date: string;
}

export const WordOfDayCard: React.FC<WordOfDayCardProps> = ({
  word, complexity, grade, date,
}) => {
  const navigate = useNavigate();
  const firstMeaning = word.meanings[0];
  const synonyms = word.meanings.flatMap((m) => m.synonyms).slice(0, 4);
  const antonyms = word.meanings.flatMap((m) => m.antonyms).slice(0, 3);

  const goToDetail = () => {
    const params = new URLSearchParams({ date, grade });
    navigate(`/word-of-day/${encodeURIComponent(word.word)}?${params}`);
  };

  const playAudio = () => {
    if (word.audioUrl) new Audio(word.audioUrl).play().catch(() => null);
  };

  return (
    <Card
      bg="purple.50" borderColor="purple.300" borderWidth={2}
      cursor="pointer" onClick={goToDetail}
      _hover={{ boxShadow: 'md', borderColor: 'purple.400' }}
      transition="all 0.2s"
    >
      <CardBody p={{ base: 3, md: 4 }}>
        <VStack spacing={3} align="stretch">
          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <HStack spacing={2} flexWrap="wrap">
              <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="extrabold" color="purple.700" textTransform="capitalize">
                {word.word}
              </Text>
              {word.phonetic && (
                <Text fontSize="sm" color="gray.500" fontStyle="italic">{word.phonetic}</Text>
              )}
              {word.audioUrl && (
                <IconButton
                  aria-label="Play pronunciation"
                  icon={<Text fontSize="md">🔊</Text>}
                  size="xs" variant="ghost" colorScheme="purple"
                  onClick={(e) => { e.stopPropagation(); playAudio(); }}
                />
              )}
            </HStack>
            <Badge colorScheme="purple">{COMPLEXITY_LABELS[complexity]}</Badge>
          </HStack>

          {firstMeaning && (
            <HStack spacing={2} flexWrap="wrap">
              <Badge colorScheme="purple" variant="outline" textTransform="capitalize">
                {firstMeaning.partOfSpeech}
              </Badge>
            </HStack>
          )}

          {firstMeaning?.definitions[0] && (
            <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.700" lineHeight="tall">
              {firstMeaning.definitions[0].definition}
            </Text>
          )}

          {(synonyms.length > 0 || antonyms.length > 0) && (
            <Box>
              {synonyms.length > 0 && (
                <HStack spacing={1} flexWrap="wrap" mb={1}>
                  <Text fontSize="xs" fontWeight="bold" color="green.700">Synonyms:</Text>
                  {synonyms.map((s) => (
                    <Badge key={s} colorScheme="green" variant="subtle" fontSize="2xs">{s}</Badge>
                  ))}
                </HStack>
              )}
              {antonyms.length > 0 && (
                <HStack spacing={1} flexWrap="wrap">
                  <Text fontSize="xs" fontWeight="bold" color="red.700">Antonyms:</Text>
                  {antonyms.map((a) => (
                    <Badge key={a} colorScheme="red" variant="subtle" fontSize="2xs">{a}</Badge>
                  ))}
                </HStack>
              )}
            </Box>
          )}

          <Button
            size="sm" colorScheme="purple" alignSelf="flex-start"
            onClick={(e) => { e.stopPropagation(); goToDetail(); }}
          >
            Read full explanation →
          </Button>
        </VStack>
      </CardBody>
    </Card>
  );
};
