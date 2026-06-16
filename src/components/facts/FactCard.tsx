import { type KeyboardEvent } from 'react';
import { Badge, Box, Text, VStack } from '@/shared/design-system';
import type { DailyFact, FactCategory } from '@/types/dailyFacts';
import {
  getCategoryBadgeStyle,
  resolveFactCategorySlug,
} from '@/utils/factCategoryUi';

interface Props {
  fact: DailyFact;
  categoryMeta?: FactCategory;
  index: number;
  editionDate?: string;
  onOpenDetail?: (fact: DailyFact) => void;
}

function formatEditionDate(dateStr: string) {
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function FactCard({ fact, categoryMeta, index, editionDate, onOpenDetail }: Props) {
  const slug = resolveFactCategorySlug(fact);
  const badge = getCategoryBadgeStyle(slug);
  const label = categoryMeta?.label || slug.replace(/_/g, ' ');

  return (
    <Box
      as="button"
      type="button"
      display="flex"
      flexDirection="column"
      h="100%"
      minW={0}
      w="100%"
      textAlign="left"
      bg="white"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.100"
      boxShadow="sm"
      overflow="hidden"
      cursor={onOpenDetail ? 'pointer' : 'default'}
      aria-label={onOpenDetail ? `${fact.title}. Tap for full details.` : undefined}
      onClick={() => onOpenDetail?.(fact)}
      onKeyDown={(e: KeyboardEvent) => {
        if (!onOpenDetail) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail(fact);
        }
      }}
      _hover={onOpenDetail ? { boxShadow: 'md', borderColor: 'orange.200' } : undefined}
      _active={onOpenDetail ? { transform: 'scale(0.99)' } : undefined}
      _focusVisible={{ outline: '2px solid', outlineColor: 'orange.400', outlineOffset: '2px' }}
      transition="box-shadow 0.2s, border-color 0.2s, transform 0.1s"
    >
      <Box
        px={{ base: 3, md: 4 }}
        pt={{ base: 3, md: 4 }}
        pb={2}
        display="flex"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={2}
        minW={0}
        w="100%"
      >
        <Text fontSize={{ base: 'xl', md: '2xl' }} flexShrink={0} aria-hidden>
          {fact.emoji}
        </Text>
        <Badge
          fontSize={{ base: '2xs', sm: 'xs' }}
          letterSpacing="wide"
          px={2}
          py={0.5}
          borderRadius="full"
          borderWidth="1px"
          bg={badge.bg}
          color={badge.color}
          borderColor={badge.borderColor}
          maxW="100%"
          whiteSpace="normal"
          textAlign="right"
        >
          {label}
          {fact.topic ? ` · ${fact.topic}` : ''}
        </Badge>
      </Box>
      <VStack
        align="stretch"
        px={{ base: 3, md: 4 }}
        pb={{ base: 3, md: 4 }}
        flex={1}
        spacing={2}
        minW={0}
        w="100%"
      >
        <Text fontSize={{ base: '2xs', sm: 'xs' }} fontWeight="semibold" color="gray.400">
          {editionDate ? formatEditionDate(editionDate) : `Fact #${index + 1}`}
        </Text>
        <Text
          fontSize={{ base: 'sm', md: 'md' }}
          fontWeight="extrabold"
          color="gray.900"
          lineHeight="snug"
          wordBreak="break-word"
        >
          {fact.title}
        </Text>
        <Text
          fontSize={{ base: 'xs', sm: 'sm' }}
          color="gray.600"
          lineHeight="relaxed"
          flex={1}
          noOfLines={{ base: 5, md: 6 }}
          wordBreak="break-word"
        >
          {fact.fact}
        </Text>
        {onOpenDetail && (
          <Text fontSize="2xs" color="orange.500" fontWeight="semibold" pt={1}>
            Tap for the full story →
          </Text>
        )}
      </VStack>
    </Box>
  );
}
