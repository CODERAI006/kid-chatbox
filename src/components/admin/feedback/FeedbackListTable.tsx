/**
 * Paginated table of student feedback submissions.
 */

import { FC } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  HStack,
  Button,
} from '@/shared/design-system';
import type { AdminFeedbackItem } from '@/types/feedback';
import { ratingEmoji, sourceLabel, wishLabel } from './feedbackLabels';

interface FeedbackListTableProps {
  items: AdminFeedbackItem[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const FeedbackListTable: FC<FeedbackListTableProps> = ({
  items,
  total,
  page,
  pageSize,
  onPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (items.length === 0) {
    return (
      <Box py={6} textAlign="center">
        <Text color="gray.500">No feedback entries match this filter.</Text>
      </Box>
    );
  }

  return (
    <Box overflowX="auto">
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>Student</Th>
            <Th>Grade</Th>
            <Th>Rating</Th>
            <Th>Feature wishes</Th>
            <Th>Message</Th>
            <Th>Source</Th>
            <Th>Date</Th>
          </Tr>
        </Thead>
        <Tbody>
          {items.map((row) => (
            <Tr key={row.id}>
              <Td>
                <Text fontWeight="medium" fontSize="sm">{row.studentName}</Text>
                <Text fontSize="xs" color="gray.500">{row.studentEmail}</Text>
              </Td>
              <Td>
                <Badge colorScheme="blue" variant="subtle">{row.grade || '—'}</Badge>
              </Td>
              <Td fontSize="lg">{ratingEmoji(row.rating)}</Td>
              <Td maxW="200px">
                <HStack spacing={1} flexWrap="wrap">
                  {row.featureWishes.length === 0 ? (
                    <Text fontSize="xs" color="gray.400">—</Text>
                  ) : (
                    row.featureWishes.map((w) => (
                      <Badge key={w} size="sm" colorScheme="purple">{wishLabel(w)}</Badge>
                    ))
                  )}
                </HStack>
              </Td>
              <Td maxW="220px">
                <Text fontSize="sm" noOfLines={2}>{row.message || '—'}</Text>
                {row.quizSubject && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Quiz: {row.quizSubject}
                    {row.quizScore != null && row.quizTotal != null
                      ? ` (${row.quizScore}/${row.quizTotal})`
                      : ''}
                  </Text>
                )}
              </Td>
              <Td>
                <Badge variant="outline">{sourceLabel(row.source)}</Badge>
              </Td>
              <Td whiteSpace="nowrap" fontSize="sm">
                {new Date(row.createdAt).toLocaleString()}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <HStack justify="space-between" mt={4} px={2}>
        <Text fontSize="sm" color="gray.600">
          {total} total · page {page} of {totalPages}
        </Text>
        <HStack>
          <Button size="sm" variant="outline" isDisabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </Button>
          <Button size="sm" variant="outline" isDisabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next
          </Button>
        </HStack>
      </HStack>
    </Box>
  );
};
