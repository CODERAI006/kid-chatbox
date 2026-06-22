import { useEffect, useRef } from 'react';
import {
  Box,
  Button,
  SimpleGrid,
  Skeleton,
  Spinner,
  Text,
  VStack,
  Progress,
} from '@/shared/design-system';
import { ArchiveWordCard } from './ArchiveWordCard';
import { formatShortDate } from './expressionUtils';
import { useWordsArchive } from './useWordsArchive';

interface Props {
  gradeLabel: string;
  untilDate: string;
  editionDate: string | null;
}

const SKELETON_COUNT = 8;

function CardSkeleton() {
  return <Skeleton height="200px" borderRadius="xl" />;
}

export function WordsArchivePanel({ gradeLabel, untilDate, editionDate }: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { items, total, hasMore, loading, loadingMore, error, loadMore, reload } = useWordsArchive({
    gradeLabel,
    untilDate,
    editionDate,
    enabled: true,
  });

  const progress = total > 0 ? Math.round((items.length / total) * 100) : 0;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '320px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, loadingMore, items.length]);

  if (loading) {
    return (
      <VStack spacing={4} align="stretch">
        <Text fontSize="sm" color="gray.500" textAlign="center">
          Loading all saved words…
        </Text>
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, xl: 4 }} spacing={{ base: 3, md: 4 }}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </SimpleGrid>
      </VStack>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={10} bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200">
        <Text fontSize="md" color="gray.600" mb={4}>{error}</Text>
        <Button size="sm" colorScheme="purple" onClick={reload}>Try again</Button>
      </Box>
    );
  }

  if (!items.length) {
    return (
      <Text textAlign="center" fontSize="sm" color="gray.500" py={8}>
        No saved words yet for this filter.
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={4}>
      <Box bg="purple.50" borderRadius="lg" p={3} borderWidth="1px" borderColor="purple.100">
        <Text fontSize="sm" fontWeight="semibold" color="purple.800" mb={2}>
          {items.length} of {total} words loaded
          {editionDate ? ` · ${formatShortDate(editionDate)}` : ` · until ${formatShortDate(untilDate)}`}
        </Text>
        <Progress value={progress} size="xs" colorScheme="purple" borderRadius="full" />
        {hasMore && (
          <Text fontSize="2xs" color="purple.600" mt={2}>
            Scroll down to load more cards
          </Text>
        )}
      </Box>

      <SimpleGrid
        columns={{ base: 1, sm: 2, md: 3, xl: 4 }}
        spacing={{ base: 3, md: 4 }}
        w="100%"
      >
        {items.map((item, i) => (
          <ArchiveWordCard
            key={`${item.editionDate}-${item.word.word}-${item.wordOrd}`}
            item={item}
            grade={gradeLabel}
            index={i}
          />
        ))}
        {loadingMore &&
          Array.from({ length: 4 }, (_, i) => <CardSkeleton key={`sk-${i}`} />)}
      </SimpleGrid>

      <Box ref={sentinelRef} h="4px" w="100%" aria-hidden />

      {loadingMore && (
        <Box display="flex" justifyContent="center" alignItems="center" gap={3} py={2}>
          <Spinner size="sm" color="purple.400" />
          <Text fontSize="sm" color="gray.500">Loading more words…</Text>
        </Box>
      )}

      {!hasMore && items.length > 0 && (
        <Text textAlign="center" fontSize="xs" color="gray.400" pb={4}>
          All {total} words loaded.
        </Text>
      )}
    </VStack>
  );
}
