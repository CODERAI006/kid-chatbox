/**
 * Summary card for one of today's words, with link to detail page.
 */

import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardBody, Text, VStack, HStack, Badge, Button, IconButton,
} from '@/shared/design-system';
import type { WordEntry, WordComplexity } from '@/types/wordOfDay';

const CARD_COLORS = [
  { bg: 'purple.50', border: 'purple.300', badge: 'purple', num: 'purple.700' },
  { bg: 'blue.50', border: 'blue.300', badge: 'blue', num: 'blue.700' },
  { bg: 'teal.50', border: 'teal.300', badge: 'teal', num: 'teal.700' },
  { bg: 'orange.50', border: 'orange.300', badge: 'orange', num: 'orange.700' },
];

interface WordOfDayCardProps {
  entry: WordEntry;
  index: number;
  complexity: WordComplexity;
  grade: string;
  date: string;
  /** Tighter layout for dashboard home. */
  compact?: boolean;
}

export const WordOfDayCard: React.FC<WordOfDayCardProps> = ({
  entry, index, complexity, grade, date, compact = false,
}) => {
  const navigate = useNavigate();
  const color = CARD_COLORS[index % CARD_COLORS.length];
  const firstMeaning = entry.meanings[0];
  const synonyms = entry.meanings.flatMap((m) => m.synonyms).slice(0, 4);
  const antonyms = entry.meanings.flatMap((m) => m.antonyms).slice(0, 3);

  const goToDetail = () => {
    const params = new URLSearchParams({ date, grade });
    navigate(`/word-of-day/${encodeURIComponent(entry.word)}?${params}`);
  };

  const playAudio = () => {
    if (entry.audioUrl) new Audio(entry.audioUrl).play().catch(() => null);
  };

  return (
    <Card
      bg={color.bg} borderColor={color.border} borderWidth={1.5}
      cursor="pointer" onClick={goToDetail}
      _hover={{ boxShadow: 'md' }} transition="all 0.2s"
    >
      <CardBody p={compact ? { base: 2, md: 3 } : { base: 3, md: 4 }}>
        <VStack spacing={compact ? 1.5 : 2} align="stretch">
          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <HStack spacing={2} flexWrap="wrap">
              <Box
                bg={color.border} color="white" borderRadius="full"
                w={compact ? 6 : 7} h={compact ? 6 : 7} display="flex" alignItems="center" justifyContent="center"
                fontSize={compact ? 'xs' : 'sm'} fontWeight="bold" flexShrink={0}
              >
                {index + 1}
              </Box>
              <Text
                fontSize={compact ? { base: 'lg', md: 'xl' } : { base: 'xl', md: '2xl' }}
                fontWeight="extrabold" color={color.num} textTransform="capitalize"
              >
                {entry.word}
              </Text>
              {entry.phonetic && (
                <Text fontSize="sm" color="gray.500" fontStyle="italic">{entry.phonetic}</Text>
              )}
              {entry.audioUrl && (
                <IconButton
                  aria-label="Play pronunciation"
                  icon={<Text fontSize="md">🔊</Text>}
                  size="xs" variant="ghost" colorScheme={color.badge}
                  onClick={(e) => { e.stopPropagation(); playAudio(); }}
                />
              )}
            </HStack>
            {index === 0 && (
              <Badge colorScheme={color.badge} fontSize="xs">{complexity}</Badge>
            )}
          </HStack>

          {firstMeaning && (
            <Badge colorScheme={color.badge} fontSize="2xs" alignSelf="flex-start" textTransform="capitalize">
              {firstMeaning.partOfSpeech}
            </Badge>
          )}

          {firstMeaning?.definitions[0] && (
            <Text
              fontSize={compact ? 'sm' : { base: 'sm', md: 'md' }}
              color="gray.700" lineHeight="tall" pl={compact ? 8 : 9}
            >
              {entry.simpleMeaning || firstMeaning.definitions[0].definition}
            </Text>
          )}

          {entry.simpleMeaning && firstMeaning?.definitions[0] && !compact && (
            <Text fontSize="xs" color="gray.500" pl={9} fontStyle="italic">
              {firstMeaning.definitions[0].definition}
            </Text>
          )}

          {(synonyms.length > 0 || antonyms.length > 0) && (
            <Box pl={compact ? 8 : 9}>
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
            size="xs" variant="ghost" colorScheme={color.badge} alignSelf="flex-start" ml={compact ? 8 : 9}
            onClick={(e) => { e.stopPropagation(); goToDetail(); }}
          >
            {compact ? 'Details →' : 'Full explanation →'}
          </Button>
        </VStack>
      </CardBody>
    </Card>
  );
};
