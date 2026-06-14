import { Box, Button, HStack, Text } from '@/shared/design-system';

interface NewsPaginationProps {
  page: number;
  totalPages: number;
  totalResults: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

function buildPages(current: number, total: number): (number | -1)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | -1)[] = [1];
  if (current > 3) pages.push(-1);
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push(-1);
  pages.push(total);
  return pages;
}

export default function NewsPagination({
  page,
  totalPages,
  totalResults,
  pageSize,
  loading,
  onPageChange,
}: NewsPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPages(page, totalPages);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalResults);

  return (
    <Box
      mt={2}
      bg="white"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.100"
      boxShadow="sm"
      p={{ base: 4, md: 5 }}
    >
      <Text textAlign="center" fontSize="sm" color="gray.500" mb={4}>
        Showing <Text as="span" fontWeight="bold" color="blue.600">{from}</Text>
        {' – '}
        <Text as="span" fontWeight="bold" color="blue.600">{to}</Text>
        {' of '}
        <Text as="span" fontWeight="bold" color="purple.600">{totalResults}</Text>
        {' stories'}
      </Text>

      <HStack justify="center" flexWrap="wrap" gap={2}>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(page - 1)}
          isDisabled={page === 1 || loading}
        >
          ← Prev
        </Button>

        {pages.map((p, i) =>
          p === -1 ? (
            <Text key={`ellipsis-${i}`} px={2} color="gray.400" fontSize="sm">…</Text>
          ) : (
            <Button
              key={p}
              size="sm"
              variant={p === page ? 'solid' : 'outline'}
              colorScheme={p === page ? 'blue' : 'gray'}
              onClick={() => onPageChange(p)}
              isDisabled={loading}
              minW="40px"
            >
              {p}
            </Button>
          ),
        )}

        <Button
          size="sm"
          colorScheme="blue"
          onClick={() => onPageChange(page + 1)}
          isDisabled={page === totalPages || loading}
        >
          Next →
        </Button>
      </HStack>

      <Text textAlign="center" fontSize="xs" color="gray.400" mt={3}>
        Page {page} of {totalPages}
      </Text>
    </Box>
  );
}
