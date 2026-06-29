/**
 * Admin — review payment screenshots and activate plans.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, AlertIcon, Badge, Box, Button, Heading, HStack, Image, Modal,
  ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay,
  Select, Spinner, Table, Tbody, Td, Text, Textarea, Th, Thead, Tr, useDisclosure, useToast, VStack,
} from '@/shared/design-system';
import { paymentAdminApi } from '@/services/payment';
import { apiClient } from '@/services/api';
import type { AdminPaymentRequest } from '@/types/payment';
import { formatPlanPrice } from '@/utils/planPricing';

const statusColor = (s: string) => (s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'yellow');

export function PaymentRequestsManagement() {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AdminPaymentRequest[]>([]);
  const [selected, setSelected] = useState<AdminPaymentRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [acting, setActing] = useState(false);
  const [screenshotSrc, setScreenshotSrc] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentAdminApi.listRequests({ status, limit: 50 });
      setItems(res.requests);
    } catch (err) {
      toast({ title: 'Failed to load', description: String(err), status: 'error', duration: 5000 });
    } finally {
      setLoading(false);
    }
  }, [status, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected?.screenshotUrl) {
      setScreenshotSrc(null);
      return;
    }
    let objectUrl: string | null = null;
    apiClient
      .get(`/admin/payment-requests/${selected.id}/screenshot`, { responseType: 'blob' })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data);
        setScreenshotSrc(objectUrl);
      })
      .catch(() => setScreenshotSrc(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selected?.id, selected?.screenshotUrl]);

  const openDetail = (item: AdminPaymentRequest) => {
    setSelected(item);
    setRejectNotes('');
    onOpen();
  };

  const handleApprove = async () => {
    if (!selected) return;
    setActing(true);
    try {
      const res = await paymentAdminApi.approveRequest(selected.id);
      toast({ title: res.message, status: 'success', duration: 4000 });
      onClose();
      await load();
    } catch (err) {
      toast({ title: 'Approve failed', description: String(err), status: 'error', duration: 5000 });
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setActing(true);
    try {
      const res = await paymentAdminApi.rejectRequest(selected.id, rejectNotes || undefined);
      toast({ title: res.message, status: 'info', duration: 4000 });
      onClose();
      await load();
    } catch (err) {
      toast({ title: 'Reject failed', description: String(err), status: 'error', duration: 5000 });
    } finally {
      setActing(false);
    }
  };

  return (
    <Box p={{ base: 4, md: 6 }}>
      <VStack align="stretch" spacing={6}>
        <HStack justify="space-between" flexWrap="wrap" gap={3}>
          <Box>
            <Heading size="lg">Payment Requests</Heading>
            <Text color="gray.600" fontSize="sm" mt={1}>
              Verify UPI payments and activate student plans
            </Text>
          </Box>
          <Select w="auto" minW="140px" size="sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </Select>
        </HStack>

        {loading ? (
          <VStack py={12}><Spinner size="lg" /><Text>Loading…</Text></VStack>
        ) : items.length === 0 ? (
          <Alert status="info" borderRadius="md"><AlertIcon />No payment requests found.</Alert>
        ) : (
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Student</Th>
                  <Th>Plan</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Submitted</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {items.map((item) => (
                  <Tr key={item.id}>
                    <Td>
                      <Text fontWeight="medium">{item.userName}</Text>
                      <Text fontSize="xs" color="gray.500">{item.userEmail}</Text>
                    </Td>
                    <Td>{item.planName}</Td>
                    <Td>{formatPlanPrice(item.amount)}</Td>
                    <Td><Badge colorScheme={statusColor(item.status)}>{item.status}</Badge></Td>
                    <Td fontSize="sm">{new Date(item.createdAt).toLocaleString()}</Td>
                    <Td>
                      <Button size="xs" onClick={() => openDetail(item)}>Review</Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Payment proof</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selected && (
              <VStack align="stretch" spacing={3}>
                <Text><strong>{selected.userName}</strong> — {selected.planName} ({formatPlanPrice(selected.amount)})</Text>
                {selected.transactionRef && <Text fontSize="sm">UTR: {selected.transactionRef}</Text>}
                {screenshotSrc && (
                  <Image
                    src={screenshotSrc}
                    alt="Payment screenshot"
                    maxH="320px"
                    objectFit="contain"
                    borderRadius="md"
                    borderWidth={1}
                  />
                )}
                {selected.status === 'pending' && (
                  <FormRejectNotes value={rejectNotes} onChange={setRejectNotes} />
                )}
                {selected.adminNotes && (
                  <Text fontSize="sm" color="gray.600">Note: {selected.adminNotes}</Text>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={onClose}>Close</Button>
            {selected?.status === 'pending' && (
              <>
                <Button colorScheme="red" variant="outline" onClick={handleReject} isLoading={acting}>
                  Reject
                </Button>
                <Button colorScheme="green" onClick={handleApprove} isLoading={acting}>
                  Approve & activate plan
                </Button>
              </>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

function FormRejectNotes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Box>
      <Text fontSize="sm" mb={1}>Rejection note (optional)</Text>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} placeholder="Reason for rejection…" />
    </Box>
  );
}
