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
import type { ArchivedFactItem, DailyFact, FactSubject, FactSubjectId } from '@/types/dailyFacts';
import FactCard from './FactCard';
import { useFactsArchive } from './useFactsArchive';

interface Props {
  gradeLabel: string;
  untilDate: string;
  subjectFilter: FactSubjectId | 'all';
  subjects: FactSubject[];
  onOpenDetail: (fact: DailyFact) => void;
}

function formatShortDate(dateStr: string) {
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

export default function FactsArchivePanel({
  gradeLabel,
  untilDate,
  subjectFilter,
  subjects,
  onOpenDetail,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { items, total, hasMore, loading, loadingMore, error, loadMore, reload } =
    useFactsArchive({
      gradeLabel,
      untilDate,
      subjectFilter,
      enabled: true,
    });

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

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
          Loading all saved facts for your class…
        </Text>
        <SimpleGrid
          minChildWidth={{ base: '100%', md: '260px', lg: '300px' }}
          spacing={{ base: 3, md: 4 }}
        >
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
        <Button size="sm" colorScheme="orange" onClick={reload}>
          Try again
        </Button>
      </Box>
    );
  }

  if (!items.length) {
    return (
      <Text textAlign="center" fontSize="sm" color="gray.500" py={8}>
        No saved facts yet. Check back after today&apos;s edition is created.
      </Text>
    );
  }

  return (
    <VStack align="stretch" spacing={4}>
      <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.500">
        Showing {items.length} of {total} facts saved until {formatShortDate(untilDate)}.
        Scroll for more — 20 per page.
      </Text>

      <SimpleGrid
        minChildWidth={{ base: '100%', md: '260px', lg: '300px' }}
        spacing={{ base: 3, md: 4 }}
        w="100%"
      >
        {items.map((entry: ArchivedFactItem, i: number) => (
          <FactCard
            key={`${entry.editionDate}-${entry.fact.id}-${i}`}
            fact={entry.fact}
            subjectMeta={subjectMap.get(entry.fact.subject)}
            index={i}
            editionDate={entry.editionDate}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </SimpleGrid>

      <Box ref={sentinelRef} h="1px" w="100%" aria-hidden />

      {loadingMore && (
        <Box display="flex" justifyContent="center" py={4}>
          <Spinner size="md" color="orange.400" />
        </Box>
      )}

      {hasMore && !loadingMore && (
        <Box display="flex" justifyContent="center">
          <Button size="sm" variant="outline" colorScheme="orange" onClick={loadMore}>
            Load 20 more
          </Button>
        </Box>
      )}

      {!hasMore && items.length > 0 && (
        <Text textAlign="center" fontSize="xs" color="gray.400" pb={2}>
          You&apos;ve reached the end — all {total} facts are loaded.
        </Text>
      )}
    </VStack>
  );
}
