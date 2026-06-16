import { useEffect, useRef } from 'react';
import {
  Box,
  Button,
  SimpleGrid,
  Skeleton,
  Spinner,
  Text,
  VStack,
} from '@/shared/design-system';
import type { ArchivedPhraseItem } from '@/types/wordOfDay';
import { ExpressionCard } from './ExpressionCard';
import type { ExpressionDetail } from './expressionUtils';
import { formatShortDate } from './expressionUtils';
import { useExpressionsArchive } from './useExpressionsArchive';

interface Props {
  gradeLabel: string;
  untilDate: string;
  contextFilter: 'all' | 'school' | 'daily';
  onOpenDetail: (expression: ExpressionDetail) => void;
}

export function ExpressionsArchivePanel({
  gradeLabel,
  untilDate,
  contextFilter,
  onOpenDetail,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { items, total, hasMore, loading, loadingMore, error, loadMore, reload } =
    useExpressionsArchive({
      gradeLabel,
      untilDate,
      contextFilter,
      enabled: true,
    });

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, items.length]);

  if (loading) {
    return (
      <VStack spacing={4} align="stretch">
        <Text fontSize="sm" color="gray.500" textAlign="center">
          Loading all saved expressions…
        </Text>
        <SimpleGrid minChildWidth={{ base: '100%', md: '260px', lg: '300px' }} spacing={{ base: 3, md: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height="176px" borderRadius="xl" />
          ))}
        </SimpleGrid>
      </VStack>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={10} bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200">
        <Text fontSize="md" color="gray.600" mb={4}>
          {error}
        </Text>
        <Button size="sm" colorScheme="teal" onClick={reload}>
          Try again
        </Button>
      </Box>
    );
  }

  if (!items.length) {
    return (
      <Text textAlign="center" fontSize="sm" color="gray.500" py={8}>
        No saved expressions yet. Check back after today&apos;s edition is created.
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={4}>
      <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.500">
        Showing {items.length} of {total} expressions saved until {formatShortDate(untilDate)}.
        Scroll for more — 20 per page.
      </Text>

      <SimpleGrid minChildWidth={{ base: '100%', md: '260px', lg: '300px' }} spacing={{ base: 3, md: 4 }} w="100%">
        {items.map((entry: ArchivedPhraseItem, i: number) => (
          <ExpressionCard
            key={`${entry.editionDate}-${entry.phrase.id || i}`}
            expression={{ ...entry.phrase, editionDate: entry.editionDate }}
            index={i}
            showDate
            onOpenDetail={onOpenDetail}
          />
        ))}
      </SimpleGrid>

      <Box ref={sentinelRef} h="1px" w="100%" aria-hidden />

      {loadingMore && (
        <Box display="flex" justifyContent="center" py={4}>
          <Spinner size="md" color="teal.400" />
        </Box>
      )}

      {hasMore && !loadingMore && (
        <Box display="flex" justifyContent="center">
          <Button size="sm" variant="outline" colorScheme="teal" onClick={loadMore}>
            Load 20 more
          </Button>
        </Box>
      )}

      {!hasMore && items.length > 0 && (
        <Text textAlign="center" fontSize="xs" color="gray.400" pb={2}>
          You&apos;ve reached the end — all {total} expressions are loaded.
        </Text>
      )}
    </VStack>
  );
}
