/**
 * Past Guru chats — table list with read-only detail panel.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Badge,
  Button,
  HStack,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useBreakpointValue,
  useColorModeValue,
} from '@/shared/design-system';
import {
  getErrorMessage,
  learningBotApi,
  type LearningBotSavedChat,
  type LearningBotUiMessage,
} from '@/services/api';
import { PastChatMessageList } from './PastChatMessageList';
import { PullToRefresh } from '@/components/PullToRefresh';
import { StudentPageLayout } from '@/components/layout/StudentPageHeader';

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function PastChatsPage() {
  const [items, setItems] = useState<LearningBotSavedChat[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailMeta, setDetailMeta] = useState<LearningBotSavedChat | null>(null);
  const [detailMessages, setDetailMessages] = useState<LearningBotUiMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const isMobile = useBreakpointValue({ base: true, lg: false }) ?? false;
  const panelBg = useColorModeValue('white', 'gray.800');
  const panelBorder = useColorModeValue('gray.200', 'gray.600');
  const rowHover = useColorModeValue('blue.50', 'gray.700');
  const mutedBg = useColorModeValue('gray.50', 'gray.900');

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await learningBotApi.listConversations();
      setItems(res.conversations);
    } catch (e) {
      setListError(getErrorMessage(e));
      setItems([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await learningBotApi.getConversationById(id);
      setDetailMeta(res.conversation);
      setDetailMessages(res.messages);
    } catch (e) {
      setDetailError(getErrorMessage(e));
      setDetailMeta(null);
      setDetailMessages([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const selectRow = (id: string) => {
    setSelectedId(id);
    void loadDetail(id);
  };

  const clearSelection = () => {
    setSelectedId(null);
    setDetailMeta(null);
    setDetailMessages([]);
    setDetailError(null);
  };

  const continueInGuru = async () => {
    if (!selectedId) return;
    setActionPending(true);
    setDetailError(null);
    try {
      await learningBotApi.openConversation(selectedId);
      window.dispatchEvent(
        new CustomEvent('learning-chat:open', { detail: { mode: 'continue' } })
      );
    } catch (e) {
      setDetailError(getErrorMessage(e));
    } finally {
      setActionPending(false);
    }
  };

  const downloadPdf = async () => {
    if (!selectedId) return;
    setActionPending(true);
    setDetailError(null);
    try {
      const blob = await learningBotApi.downloadConversationPdf(selectedId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guru-chat-${selectedId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDetailError(getErrorMessage(e));
    } finally {
      setActionPending(false);
    }
  };

  const showList = !isMobile || !selectedId;

  return (
    <PullToRefresh onRefresh={loadList}>
      <StudentPageLayout
        icon="💬"
        title="Past Chats"
        subtitle="Your Guru study conversations — read threads or continue in Guru"
      >
        <VStack align="stretch" spacing={4}>
          {listError && (
            <Text fontSize={{ base: 'xs', sm: 'sm' }} color="red.500">{listError}</Text>
          )}

          <HStack
            align="stretch"
            spacing={4}
            flexDirection={{ base: 'column', lg: 'row' }}
            minH={{ base: 'auto', lg: '70vh' }}
          >
            {showList && (
              <Box
                flex={{ lg: selectedId ? '0 0 42%' : '1' }}
                minW={0}
                borderWidth="1px"
                borderColor={panelBorder}
                borderRadius="lg"
                bg={panelBg}
                overflow="hidden"
              >
                {listLoading ? (
                  <HStack justify="center" py={10}>
                    <Spinner size="sm" />
                    <Text fontSize="sm" color="gray.500">Loading chats…</Text>
                  </HStack>
                ) : items.length === 0 ? (
                  <Text py={10} textAlign="center" fontSize="sm" color="gray.500">
                    No past chats yet. Start a conversation with Guru to see it here.
                  </Text>
                ) : (
                  <Box overflowX="auto">
                    <Table size="sm" variant="simple">
                      <Thead bg={mutedBg}>
                        <Tr>
                          <Th>Preview</Th>
                          <Th>Status</Th>
                          <Th isNumeric>Messages</Th>
                          <Th>Updated</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {items.map((item) => {
                          const isSelected = item.id === selectedId;
                          return (
                            <Tr
                              key={item.id}
                              cursor="pointer"
                              bg={isSelected ? rowHover : undefined}
                              _hover={{ bg: rowHover }}
                              onClick={() => selectRow(item.id)}
                            >
                              <Td maxW="220px">
                                <Text fontSize="sm" fontWeight="medium" noOfLines={2}>
                                  {item.preview || 'Study chat'}
                                </Text>
                              </Td>
                              <Td>
                                <Badge
                                  colorScheme={item.archived ? 'gray' : 'green'}
                                  fontSize="0.65rem"
                                >
                                  {item.archived ? 'Saved' : 'Active'}
                                </Badge>
                              </Td>
                              <Td isNumeric>{item.messageCount}</Td>
                              <Td>
                                <Text fontSize="xs" color="gray.600">
                                  {formatWhen(item.updatedAt)}
                                </Text>
                              </Td>
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  </Box>
                )}
              </Box>
            )}

            {selectedId && (
              <Box
                flex={1}
                minW={0}
                borderWidth="1px"
                borderColor={panelBorder}
                borderRadius="lg"
                bg={panelBg}
                display="flex"
                flexDirection="column"
                minH={{ base: '60vh', lg: 'auto' }}
              >
                <Box
                  px={4}
                  py={3}
                  borderBottomWidth="1px"
                  borderColor={panelBorder}
                  flexShrink={0}
                >
                  <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={2}>
                    <VStack align="start" spacing={1} flex={1} minW={0}>
                      {isMobile && (
                        <Button size="xs" variant="ghost" onClick={clearSelection}>
                          ← Back to list
                        </Button>
                      )}
                      <Text fontWeight="semibold" noOfLines={2}>
                        {detailMeta?.preview || 'Chat details'}
                      </Text>
                      {detailMeta && (
                        <HStack spacing={2} flexWrap="wrap">
                          <Badge colorScheme={detailMeta.archived ? 'gray' : 'green'}>
                            {detailMeta.archived ? 'Saved' : 'Active'}
                          </Badge>
                          <Text fontSize="xs" color="gray.500">
                            {detailMeta.messageCount} messages · Updated {formatWhen(detailMeta.updatedAt)}
                          </Text>
                        </HStack>
                      )}
                    </VStack>
                    <HStack spacing={2} flexShrink={0}>
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => void continueInGuru()}
                        isLoading={actionPending}
                      >
                        Continue in Guru
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void downloadPdf()}
                        isLoading={actionPending}
                      >
                        PDF
                      </Button>
                    </HStack>
                  </HStack>
                  {detailError && (
                    <Text fontSize="xs" color="red.500" mt={2}>{detailError}</Text>
                  )}
                </Box>

                <Box flex={1} minH={0} overflowY="auto" px={{ base: 2, md: 4 }} py={3} bg={mutedBg}>
                  {detailLoading ? (
                    <HStack justify="center" py={8}>
                      <Spinner size="sm" />
                      <Text fontSize="sm" color="gray.500">Loading messages…</Text>
                    </HStack>
                  ) : detailMessages.length === 0 ? (
                    <Text fontSize="sm" color="gray.500" textAlign="center" py={8}>
                      No messages in this chat.
                    </Text>
                  ) : (
                    <PastChatMessageList messages={detailMessages} />
                  )}
                </Box>
              </Box>
            )}
          </HStack>
        </VStack>
      </StudentPageLayout>
    </PullToRefresh>
  );
}
