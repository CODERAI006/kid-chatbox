/**
 * Student payment submission history.
 */

import {
  Badge, Box, Button, Card, CardBody, HStack, Table, Tbody, Td, Text, Th, Thead, Tr,
} from '@/shared/design-system';
import { formatPlanPrice } from '@/utils/planPricing';
import type { PaymentRequestSummary } from '@/types/payment';

const STATUS_COLORS: Record<PaymentRequestSummary['status'], string> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
};

interface PaymentRequestHistoryProps {
  requests: PaymentRequestSummary[];
  onRefresh?: () => void;
}

export function PaymentRequestHistory({ requests, onRefresh }: PaymentRequestHistoryProps) {
  return (
    <Card>
      <CardBody>
        <HStack justify="space-between" mb={3}>
          <Text fontWeight="semibold" color="gray.700">Payment history</Text>
          {onRefresh && (
            <Button size="xs" variant="ghost" onClick={onRefresh}>Refresh</Button>
          )}
        </HStack>
        <Box overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th>Plan</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Submitted</Th>
              </Tr>
            </Thead>
            <Tbody>
              {requests.map((req) => (
                <Tr key={req.id}>
                  <Td>{req.planName}</Td>
                  <Td>{formatPlanPrice(req.amount)}</Td>
                  <Td>
                    <Badge colorScheme={STATUS_COLORS[req.status]} textTransform="capitalize">
                      {req.status}
                    </Badge>
                    {req.status === 'rejected' && req.adminNotes && (
                      <Text fontSize="xs" color="red.600" mt={1}>{req.adminNotes}</Text>
                    )}
                  </Td>
                  <Td fontSize="xs">{new Date(req.createdAt).toLocaleDateString()}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </CardBody>
    </Card>
  );
}
