/**
 * Shared puzzle card — no difficulty/complexity shown to students.
 */

import { Box, Text, HStack } from '@/shared/design-system';
import type { Puzzle } from '@/types/puzzle';
import { PUZZLE_CATEGORY_EMOJI } from '@/constants/puzzles';

interface Props {
  puzzle: Puzzle;
  index?: number;
  onClick: () => void;
  variant?: 'light' | 'dark';
}

export function PuzzleCard({ puzzle: p, index, onClick, variant = 'light' }: Props) {
  const isDark = variant === 'dark';
  return (
    <Box
      p={variant === 'dark' ? 3 : 4}
      borderWidth={1}
      borderRadius="lg"
      borderColor={isDark ? 'whiteAlpha.200' : 'purple.100'}
      bg={isDark ? 'transparent' : 'white'}
      cursor="pointer"
      _hover={{ shadow: isDark ? 'none' : 'md', borderColor: isDark ? 'cyan.400' : 'purple.300', transform: 'translateY(-1px)' }}
      transition="all 0.2s"
      onClick={onClick}
    >
      <Text fontSize={variant === 'dark' ? 'xs' : 'sm'} fontWeight="bold" color={isDark ? 'cyan.300' : 'purple.700'} mb={1}>
        {index != null ? `#${index + 1} ` : ''}{PUZZLE_CATEGORY_EMOJI[p.category] || '🧩'} {p.category}
      </Text>
      {p.skillArea && (
        <Text fontSize="2xs" color={isDark ? 'whiteAlpha.700' : 'gray.500'} mb={1} noOfLines={1}>
          🎯 {p.skillArea}
        </Text>
      )}
      <Text fontSize="sm" noOfLines={3} color={isDark ? 'whiteAlpha.900' : 'gray.700'}>
        {p.question}
      </Text>
    </Box>
  );
}

/** Compact row for lists with optional date label. */
export function PuzzleCardRow({ puzzle, index, onClick }: Props) {
  return (
    <HStack spacing={0} align="stretch">
      <Box flex={1}>
        <PuzzleCard puzzle={puzzle} index={index} onClick={onClick} />
      </Box>
    </HStack>
  );
}
