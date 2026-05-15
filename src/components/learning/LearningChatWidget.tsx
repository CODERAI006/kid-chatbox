/**
 * Floating learning assistant (Ollama + DB memory). Used in student and admin layouts.
 */

import { useCallback, useEffect, useRef, useState, type FC, type KeyboardEvent } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Text,
  Textarea,
  VStack,
  Spinner,
  useColorModeValue,
  Badge,
  Divider,
} from '@/shared/design-system';
import { getErrorMessage, learningBotApi, type LearningBotUiMessage } from '@/services/api';

const WELCOME =
  'Hi! I am your learning assistant (local Ollama). Ask me anything—school topics, study tips, or general questions. Your messages are saved so I can continue the thread next time. Tap New chat to start a fresh topic.';

export const LearningChatWidget: FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<LearningBotUiMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [bootLoading, setBootLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastModel, setLastModel] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const panelBg = useColorModeValue('white', 'gray.800');
  const panelBorder = useColorModeValue('gray.200', 'gray.600');
  const userBubble = useColorModeValue('blue.50', 'blue.900');
  const assistantBubble = useColorModeValue('gray.100', 'gray.700');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBootLoading(true);
    setError(null);
    learningBotApi
      .getConversation()
      .then((data) => {
        if (cancelled) return;
        setConversationId(data.conversationId);
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      })
      .catch((e) => {
        if (!cancelled) setError(getErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setBootLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, pending, bootLoading]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || pending || bootLoading) return;

    setError(null);
    setDraft('');
    setPending(true);

    try {
      const { conversationId: cid, content, model } = await learningBotApi.sendMessage({
        conversationId,
        text,
      });
      setConversationId(cid);
      if (model) setLastModel(model);
      setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'assistant', content }]);
    } catch (e) {
      const msg = getErrorMessage(e);
      setError(msg);
      console.error('[LearningChatWidget] send failed', { message: msg });
      setDraft(text);
    } finally {
      setPending(false);
    }
  }, [draft, pending, bootLoading, conversationId]);

  const onKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      void send();
    }
  };

  const newChat = async () => {
    try {
      setError(null);
      await learningBotApi.resetConversation();
      setConversationId(null);
      setMessages([]);
      setLastModel(null);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const displayRows: LearningBotUiMessage[] =
    messages.length === 0 && !bootLoading ? [{ role: 'assistant', content: WELCOME }] : messages;

  return (
    <>
      {!open && (
        <IconButton
          aria-label="Open learning assistant"
          icon={<Text fontSize="xl">🤖</Text>}
          position="fixed"
          bottom={{ base: 5, md: 8 }}
          right={{ base: 5, md: 8 }}
          zIndex={1500}
          size="lg"
          rounded="full"
          colorScheme="blue"
          boxShadow="lg"
          onClick={() => setOpen(true)}
        />
      )}

      {open && (
        <Box
          position="fixed"
          bottom={{ base: 4, md: 6 }}
          right={{ base: 4, md: 6 }}
          zIndex={1500}
          w={{ base: 'calc(100vw - 2rem)', sm: '380px', md: '420px' }}
          maxW="100vw"
          h={{ base: 'min(72vh, 540px)', md: '540px' }}
          bg={panelBg}
          borderWidth="1px"
          borderColor={panelBorder}
          borderRadius="xl"
          boxShadow="2xl"
          display="flex"
          flexDirection="column"
          overflow="hidden"
        >
          <Flex px={3} py={2} align="center" justify="space-between" borderBottomWidth="1px" borderColor={panelBorder}>
            <HStack spacing={2}>
              <Text fontWeight="bold">Learning assistant</Text>
              {lastModel && (
                <Badge fontSize="0.65rem" colorScheme="purple">
                  {lastModel}
                </Badge>
              )}
            </HStack>
            <HStack spacing={1}>
              <Button size="xs" variant="ghost" onClick={() => void newChat()}>
                New chat
              </Button>
              <IconButton
                aria-label="Close chat"
                size="sm"
                variant="ghost"
                icon={<Text>✕</Text>}
                onClick={() => setOpen(false)}
              />
            </HStack>
          </Flex>

          <VStack align="stretch" flex={1} spacing={0} overflow="hidden" px={2} py={2}>
            <Box flex={1} overflowY="auto" px={1}>
              {bootLoading ? (
                <HStack py={6} justify="center">
                  <Spinner size="sm" />
                  <Text fontSize="sm" color="gray.500">
                    Loading your conversation…
                  </Text>
                </HStack>
              ) : (
                displayRows.map((m, i) => (
                  <Box
                    key={m.id || `${i}-${m.role}-${m.content.slice(0, 24)}`}
                    alignSelf={m.role === 'user' ? 'flex-end' : 'flex-start'}
                    maxW="92%"
                    mb={2}
                    ml={m.role === 'user' ? 'auto' : 0}
                    mr={m.role === 'user' ? 0 : 'auto'}
                    px={3}
                    py={2}
                    borderRadius="lg"
                    bg={m.role === 'user' ? userBubble : assistantBubble}
                  >
                    <Text fontSize="sm" whiteSpace="pre-wrap">
                      {m.content}
                    </Text>
                  </Box>
                ))
              )}
              {pending && (
                <HStack py={2} spacing={2}>
                  <Spinner size="sm" />
                  <Text fontSize="sm" color="gray.500">
                    Thinking…
                  </Text>
                </HStack>
              )}
              <div ref={endRef} />
            </Box>

            {error && (
              <Box px={1} pb={1}>
                <Text fontSize="xs" color="red.500">
                  {error}
                </Text>
              </Box>
            )}

            <Divider />

            <HStack align="end" spacing={2} pt={1}>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask anything… (Enter to send, Shift+Enter for new line)"
                size="sm"
                rows={3}
                resize="none"
                isDisabled={pending || bootLoading}
              />
              <Button
                colorScheme="blue"
                size="sm"
                onClick={() => void send()}
                isDisabled={pending || bootLoading || !draft.trim()}
              >
                Send
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}
    </>
  );
};
