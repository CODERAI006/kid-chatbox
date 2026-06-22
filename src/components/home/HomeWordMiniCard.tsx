/** Compact word card for the home landing grid (dark glass style). */

import { useNavigate } from 'react-router-dom';
import {
  Box, Text, VStack, HStack, Badge, IconButton,
} from '@/shared/design-system';
import type { WordEntry } from '@/types/wordOfDay';

const CARD_STYLES = [
  { border: 'rgba(167,139,250,0.4)', bg: 'rgba(167,139,250,0.12)', accent: 'purple.300' },
  { border: 'rgba(96,165,250,0.4)', bg: 'rgba(96,165,250,0.12)', accent: 'blue.300' },
  { border: 'rgba(45,212,191,0.4)', bg: 'rgba(45,212,191,0.12)', accent: 'teal.300' },
  { border: 'rgba(251,146,60,0.4)', bg: 'rgba(251,146,60,0.12)', accent: 'orange.300' },
] as const;

interface Props {
  entry: WordEntry;
  index: number;
  date: string;
  grade: string;
}

export function HomeWordMiniCard({ entry, index, date, grade }: Props) {
  const navigate = useNavigate();
  const style = CARD_STYLES[index % CARD_STYLES.length];
  const meaning = entry.simpleMeaning || entry.meanings[0]?.definitions[0]?.definition || '';
  const pos = entry.meanings[0]?.partOfSpeech;

  const goToDetail = () => {
    const params = new URLSearchParams({ date, grade });
    navigate(`/word-of-day/${encodeURIComponent(entry.word)}?${params}`);
  };

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.audioUrl) new Audio(entry.audioUrl).play().catch(() => null);
  };

  return (
    <Box
      as="button"
      type="button"
      onClick={goToDetail}
      textAlign="left"
      w="100%"
      bg={style.bg}
      border="1px solid"
      borderColor={style.border}
      borderRadius="xl"
      p={{ base: 2.5, md: 3 }}
      transition="all 0.2s"
      _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
      cursor="pointer"
    >
      <VStack align="stretch" spacing={1.5}>
        <HStack spacing={2} align="center">
          <Box
            bg={style.border}
            color="white"
            borderRadius="full"
            w={6}
            h={6}
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="xs"
            fontWeight="bold"
            flexShrink={0}
          >
            {index + 1}
          </Box>
          <Text
            fontSize={{ base: 'lg', md: 'xl' }}
            fontWeight="extrabold"
            color="white"
            textTransform="capitalize"
            noOfLines={1}
            flex={1}
          >
            {entry.word}
          </Text>
          {entry.audioUrl && (
            <IconButton
              aria-label="Play pronunciation"
              icon={<Text fontSize="xs">🔊</Text>}
              size="xs"
              variant="ghost"
              colorScheme="purple"
              onClick={playAudio}
            />
          )}
        </HStack>

        {pos && (
          <Badge colorScheme="purple" fontSize="2xs" alignSelf="flex-start" textTransform="capitalize">
            {pos}
          </Badge>
        )}

        <Text fontSize="xs" color="whiteAlpha.900" lineHeight="tall" noOfLines={2}>
          {meaning}
        </Text>
      </VStack>
    </Box>
  );
}
