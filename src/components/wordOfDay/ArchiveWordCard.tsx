/**
 * Archive grid card — matches WordOfDayCard styling with edition date.
 */

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardBody,
  Text,
  VStack,
  HStack,
  Badge,
  IconButton,
} from '@/shared/design-system';
import type { ArchivedWordItem } from '@/types/wordOfDay';
import { formatShortDate } from './expressionUtils';

const CARD_COLORS = [
  { bg: 'purple.50', border: 'purple.300', badge: 'purple', num: 'purple.700' },
  { bg: 'blue.50', border: 'blue.300', badge: 'blue', num: 'blue.700' },
  { bg: 'teal.50', border: 'teal.300', badge: 'teal', num: 'teal.700' },
  { bg: 'orange.50', border: 'orange.300', badge: 'orange', num: 'orange.700' },
] as const;

interface ArchiveWordCardProps {
  item: ArchivedWordItem;
  grade: string;
  index: number;
}

export function ArchiveWordCard({ item, grade, index }: ArchiveWordCardProps) {
  const navigate = useNavigate();
  const color = CARD_COLORS[index % CARD_COLORS.length];
  const { word, editionDate, wordOrd } = item;
  const firstMeaning = word.meanings[0];
  const meaning = word.simpleMeaning || firstMeaning?.definitions[0]?.definition || '';
  const synonyms = word.meanings.flatMap((m) => m.synonyms).slice(0, 2);

  const goDetail = () => {
    const params = new URLSearchParams({ date: editionDate, grade });
    navigate(`/word-of-day/${encodeURIComponent(word.word)}?${params}`);
  };

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (word.audioUrl) new Audio(word.audioUrl).play().catch(() => null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index % 12, 8) * 0.03 }}
      style={{ height: '100%' }}
    >
      <Card
        bg={color.bg}
        borderColor={color.border}
        borderWidth={1.5}
        h="100%"
        cursor="pointer"
        onClick={goDetail}
        _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)' }}
        transition="all 0.2s"
      >
        <CardBody p={{ base: 3, md: 4 }}>
          <VStack align="stretch" spacing={2} h="100%">
            <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={1}>
              <Badge colorScheme={color.badge} fontSize="2xs" borderRadius="full">
                {formatShortDate(editionDate)}
              </Badge>
              <Badge colorScheme="gray" variant="subtle" fontSize="2xs">
                #{wordOrd}
              </Badge>
            </HStack>

            <HStack spacing={2} align="center" flexWrap="wrap">
              <Box
                bg={color.border}
                color="white"
                borderRadius="full"
                w={7}
                h={7}
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="sm"
                fontWeight="bold"
                flexShrink={0}
              >
                {wordOrd}
              </Box>
              <Text
                fontSize={{ base: 'lg', md: 'xl' }}
                fontWeight="extrabold"
                color={color.num}
                textTransform="capitalize"
                noOfLines={1}
                flex={1}
              >
                {word.word}
              </Text>
              {word.audioUrl && (
                <IconButton
                  aria-label="Play pronunciation"
                  icon={<Text fontSize="sm">🔊</Text>}
                  size="xs"
                  variant="ghost"
                  colorScheme={color.badge}
                  onClick={playAudio}
                />
              )}
            </HStack>

            {word.phonetic && (
              <Text fontSize="xs" color="gray.500" fontStyle="italic" pl={9}>
                {word.phonetic}
              </Text>
            )}

            {firstMeaning?.partOfSpeech && (
              <Badge
                colorScheme={color.badge}
                fontSize="2xs"
                alignSelf="flex-start"
                textTransform="capitalize"
              >
                {firstMeaning.partOfSpeech}
              </Badge>
            )}

            {meaning && (
              <Text fontSize="sm" color="gray.700" lineHeight="tall" noOfLines={3} flex={1}>
                {meaning}
              </Text>
            )}

            {synonyms.length > 0 && (
              <HStack spacing={1} flexWrap="wrap">
                {synonyms.map((s) => (
                  <Badge key={s} colorScheme="green" variant="subtle" fontSize="2xs">
                    {s}
                  </Badge>
                ))}
              </HStack>
            )}

            <Text fontSize="xs" color={`${color.badge}.600`} fontWeight="semibold" pt={1}>
              Tap for full explanation →
            </Text>
          </VStack>
        </CardBody>
      </Card>
    </motion.div>
  );
}
