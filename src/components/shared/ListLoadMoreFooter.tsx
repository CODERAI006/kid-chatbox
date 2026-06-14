import { Box, Button, Spinner, Text } from '@/shared/design-system';
import { useInfiniteScrollSentinel } from '@/hooks/useInfiniteScrollSentinel';

interface Props {
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  observeKey?: number;
  loadMoreLabel?: string;
  endLabel?: string;
  spinnerColor?: string;
}

export function ListLoadMoreFooter({
  hasMore,
  loadingMore,
  onLoadMore,
  observeKey = 0,
  loadMoreLabel = 'Load more',
  endLabel,
  spinnerColor = 'blue.400',
}: Props) {
  const sentinelRef = useInfiniteScrollSentinel({
    enabled: hasMore && !loadingMore,
    onLoadMore,
    observeKey,
  });

  if (!hasMore && !loadingMore && !endLabel) return null;

  return (
    <Box w="100%">
      {hasMore && <Box ref={sentinelRef} h="1px" w="100%" aria-hidden />}

      {loadingMore && (
        <Box display="flex" justifyContent="center" py={4}>
          <Spinner size="md" color={spinnerColor} />
        </Box>
      )}

      {hasMore && !loadingMore && (
        <Box display="flex" justifyContent="center" py={2}>
          <Button size="sm" variant="outline" colorScheme="blue" onClick={onLoadMore}>
            {loadMoreLabel}
          </Button>
        </Box>
      )}

      {!hasMore && endLabel && (
        <Text textAlign="center" fontSize="xs" color="gray.400" py={2}>
          {endLabel}
        </Text>
      )}
    </Box>
  );
}
