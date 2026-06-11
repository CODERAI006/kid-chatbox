/**
 * Saved learning-bot chat threads.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  VStack,
  Text,
  Button,
  Spinner,
  HStack,
  Badge,
  Box,
} from '@/shared/design-system';
import { getErrorMessage, learningBotApi, type LearningBotSavedChat } from '@/services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeConversationId: string | null;
  onOpenChat: (conversationId: string, messages: Awaited<ReturnType<typeof learningBotApi.getConversation>>['messages']) => void;
  onSaved: () => void;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function LearningChatHistoryDrawer({
  isOpen,
  onClose,
  activeConversationId,
  onOpenChat,
  onSaved,
}: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<LearningBotSavedChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await learningBotApi.listConversations();
      setItems(res.conversations);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  const openThread = async (id: string) => {
    setOpeningId(id);
    setError(null);
    try {
      const res = await learningBotApi.openConversation(id);
      onOpenChat(res.conversationId, res.messages);
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setOpeningId(null);
    }
  };

  const saveCurrent = async () => {
    setError(null);
    try {
      await learningBotApi.saveConversation();
      onSaved();
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="sm">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader fontSize="md">Saved chats</DrawerHeader>
        <DrawerBody>
          <VStack align="stretch" spacing={3}>
            <Text fontSize="xs" color="gray.600">
              Chats are saved automatically. Open a past thread or save the current one before starting fresh.
            </Text>
            <Button
              size="sm"
              variant="link"
              colorScheme="blue"
              alignSelf="flex-start"
              onClick={() => {
                onClose();
                navigate('/past-chats');
              }}
            >
              View all past chats →
            </Button>
            <Button size="sm" colorScheme="blue" variant="outline" onClick={() => void saveCurrent()}>
              💾 Save current chat
            </Button>
            {loading && (
              <HStack justify="center" py={4}>
                <Spinner size="sm" />
              </HStack>
            )}
            {error && (
              <Text fontSize="xs" color="red.500">{error}</Text>
            )}
            {!loading &&
              items.map((item) => (
                <Box
                  key={item.id}
                  as="button"
                  type="button"
                  textAlign="left"
                  w="100%"
                  p={3}
                  borderWidth="1px"
                  borderRadius="md"
                  borderColor={item.id === activeConversationId ? 'blue.300' : 'gray.200'}
                  bg={item.id === activeConversationId ? 'blue.50' : 'white'}
                  _hover={{ borderColor: 'blue.300' }}
                  onClick={() => void openThread(item.id)}
                  disabled={openingId === item.id}
                >
                  <HStack justify="space-between" mb={1}>
                    <Badge colorScheme={item.archived ? 'gray' : 'green'} fontSize="0.65rem">
                      {item.archived ? 'Saved' : 'Active'}
                    </Badge>
                    <Text fontSize="xs" color="gray.500">{formatWhen(item.updatedAt)}</Text>
                  </HStack>
                  <Text fontSize="sm" fontWeight="semibold" noOfLines={2}>
                    {item.preview || 'Study chat'}
                  </Text>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    {item.messageCount} messages
                  </Text>
                </Box>
              ))}
            {!loading && items.length === 0 && (
              <Text fontSize="sm" color="gray.500">No saved chats yet.</Text>
            )}
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
