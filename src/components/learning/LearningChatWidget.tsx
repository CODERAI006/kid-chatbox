/**
 * Conversational Learning Workspace — chat is one component among cards.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FC, type KeyboardEvent } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Text,
  Input,
  VStack,
  Spinner,
  useColorModeValue,
  Badge,
  Divider,
  useDisclosure,
} from '@/shared/design-system';
import { getErrorMessage, learningBotApi, type LearningBotUiMessage } from '@/services/api';
import { LearningWorkspaceMessage } from './LearningWorkspaceMessage';
import { LearningConversationalMessage } from './LearningConversationalMessage';
import { LearningChatHistoryDrawer } from './LearningChatHistoryDrawer';
import { LearningFormatOnboarding } from './LearningFormatOnboarding';
import { resolveWorkspace } from '@/utils/learningWorkspaceParser';
import { inferChatMode } from '@/utils/learningChatMode';
import { extractSpeakableReply } from '@/utils/speechSynthesis';
import { useVoiceConversation } from '@/hooks/useVoiceConversation';
import { usePlanAiFlags } from '@/hooks/usePlanAiFlags';
import { VoiceConversationBar } from './VoiceConversationBar';
import type { LearningBotMode, LearningStudyFormat } from '@/types/learningWorkspace';

const WELCOME_TOPIC = 'Pick a format to start';

export const LearningChatWidget: FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<LearningBotUiMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<LearningBotMode>('workspace');
  const [studyFormat, setStudyFormat] = useState<LearningStudyFormat | null>(null);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [bootLoading, setBootLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastModel, setLastModel] = useState<string | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const historyDrawer = useDisclosure();
  const pendingRef = useRef(false);
  const bootLoadingRef = useRef(false);
  pendingRef.current = pending;
  bootLoadingRef.current = bootLoading;
  const { showAiStudy } = usePlanAiFlags();

  const panelBg = useColorModeValue('white', 'gray.800');
  const panelBorder = useColorModeValue('gray.200', 'gray.600');
  const userBubble = useColorModeValue('blue.50', 'blue.900');
  const workspaceBg = useColorModeValue('gray.50', 'gray.900');
  const modeBadgeBg = useColorModeValue('whiteAlpha.300', 'whiteAlpha.200');

  const currentTopic = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.role === 'assistant') {
        const ws = resolveWorkspace(m.content);
        if (ws.topic && ws.topic !== 'Learning') return ws.topic;
      }
    }
    return WELCOME_TOPIC;
  }, [messages]);

  const loadActive = useCallback(async () => {
    setBootLoading(true);
    setError(null);
    try {
      const data = await learningBotApi.getConversation();
      setConversationId(data.conversationId);
      const loaded = Array.isArray(data.messages) ? data.messages : [];
      setMessages(loaded);
      setChatMode(inferChatMode(loaded));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBootLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadActive();
  }, [open, loadActive]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, pending, bootLoading]);

  const sendText = useCallback(
    async (
      text: string,
      opts?: { mode?: LearningBotMode; format?: LearningStudyFormat | null }
    ): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed || pendingRef.current || bootLoadingRef.current) return false;

      const mode = opts?.mode ?? chatMode;
      const format = opts?.format ?? studyFormat ?? undefined;

      setError(null);
      setSaveHint(null);
      setDraft('');
      setPending(true);
      if (opts?.mode) setChatMode(opts.mode);
      if (opts?.format) setStudyFormat(opts.format);

      try {
        const { conversationId: cid, content, model } = await learningBotApi.sendMessage({
          conversationId,
          text: trimmed,
          mode,
          format: format ?? undefined,
        });
        setConversationId(cid);
        if (model) setLastModel(model);
        setMessages((prev) => [
          ...prev,
          { role: 'user', content: trimmed },
          { role: 'assistant', content },
        ]);
        return true;
      } catch (e) {
        const msg = getErrorMessage(e);
        setError(msg);
        setDraft(trimmed);
        return false;
      } finally {
        setPending(false);
      }
    },
    [conversationId, chatMode, studyFormat]
  );

  const send = useCallback(() => void sendText(draft), [draft, sendText]);

  const onKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      void send();
    }
  };

  const resetSession = () => {
    setConversationId(null);
    setMessages([]);
    setLastModel(null);
    setChatMode('workspace');
    setStudyFormat(null);
  };

  const startNewTopic = async () => {
    try {
      setError(null);
      await learningBotApi.resetConversation();
      resetSession();
      setSaveHint('Previous chat saved to your history.');
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const onOpenSavedChat = (id: string, loaded: LearningBotUiMessage[]) => {
    setConversationId(id);
    setMessages(loaded);
    setChatMode(inferChatMode(loaded));
    setSaveHint(null);
  };

  const onSavedCurrent = () => {
    resetSession();
    setSaveHint('Chat saved. Start a new question anytime.');
  };

  const showOnboarding = messages.length === 0 && !bootLoading;
  const modeLabel = chatMode === 'chat' ? '💬 Chat' : '📚 Cards';

  const lastAssistantText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') {
        return extractSpeakableReply(messages[i].content);
      }
    }
    return null;
  }, [messages]);

  const assistantMessageCount = useMemo(
    () => messages.filter((m) => m.role === 'assistant').length,
    [messages]
  );

  const voice = useVoiceConversation({
    enabled: showAiStudy && open,
    pending,
    onSendMessage: sendText,
    onTranscriptChange: setDraft,
    lastAssistantText,
    assistantMessageCount,
  });

  return (
    <>
      {!open && (
        <IconButton
          aria-label="Open AI study assistant"
          icon={<Text fontSize="xl">🎓</Text>}
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

      <LearningChatHistoryDrawer
        isOpen={historyDrawer.isOpen}
        onClose={historyDrawer.onClose}
        activeConversationId={conversationId}
        onOpenChat={onOpenSavedChat}
        onSaved={onSavedCurrent}
      />

      {open && (
        <Box
          position="fixed"
          bottom={{ base: 2, md: 4 }}
          right={{ base: 2, md: 4 }}
          left={{ base: 2, md: 'auto' }}
          zIndex={1500}
          w={{ base: 'auto', md: 'min(680px, calc(100vw - 2rem))' }}
          maxW="100%"
          h={{ base: 'min(88vh, 780px)', md: 'min(85vh, 760px)' }}
          bg={panelBg}
          borderWidth="1px"
          borderColor={panelBorder}
          borderRadius="xl"
          boxShadow="2xl"
          display="flex"
          flexDirection="column"
          overflow="hidden"
        >
          <Flex
            px={3}
            py={2}
            align="center"
            justify="space-between"
            borderBottomWidth="1px"
            borderColor={panelBorder}
            bg="blue.600"
            color="white"
          >
            <Box minW={0} flex={1}>
              <Text fontWeight="bold" fontSize="md">🎓 AI Study Assistant</Text>
              <Text fontSize="xs" opacity={0.9} noOfLines={1}>Topic: {currentTopic}</Text>
            </Box>
            <HStack spacing={1} flexShrink={0}>
              {messages.length > 0 && (
                <Badge fontSize="0.6rem" bg={modeBadgeBg} color="white">
                  {modeLabel}
                </Badge>
              )}
              {lastModel && (
                <Badge fontSize="0.6rem" colorScheme="purple" display={{ base: 'none', lg: 'inline-flex' }}>
                  {lastModel}
                </Badge>
              )}
              <Button
                size="xs"
                variant="ghost"
                color="white"
                _hover={{ bg: 'whiteAlpha.200' }}
                onClick={historyDrawer.onOpen}
              >
                Saved chats
              </Button>
              <Button
                size="xs"
                variant="ghost"
                color="white"
                _hover={{ bg: 'whiteAlpha.200' }}
                onClick={() => void startNewTopic()}
              >
                New topic
              </Button>
              <IconButton
                aria-label="Close assistant"
                size="sm"
                variant="ghost"
                color="white"
                _hover={{ bg: 'whiteAlpha.200' }}
                icon={<Text>✕</Text>}
                onClick={() => setOpen(false)}
              />
            </HStack>
          </Flex>

          {saveHint && (
            <Box px={3} py={1} bg="green.50" borderBottomWidth="1px" borderColor="green.100">
              <Text fontSize="xs" color="green.700">{saveHint}</Text>
            </Box>
          )}

          <VStack align="stretch" flex={1} spacing={0} overflow="hidden">
            <Box flex={1} overflowY="auto" px={3} py={3} bg={workspaceBg}>
              {bootLoading ? (
                <HStack py={6} justify="center">
                  <Spinner size="sm" />
                  <Text fontSize="sm" color="gray.500">Loading workspace…</Text>
                </HStack>
              ) : (
                <VStack align="stretch" spacing={3}>
                  {showOnboarding && (
                    <LearningFormatOnboarding
                      disabled={pending}
                      onStart={({ text, mode, format }) => void sendText(text, { mode, format })}
                    />
                  )}

                  {messages.map((m, i) =>
                    m.role === 'user' ? (
                      <Box
                        key={m.id || `u-${i}`}
                        alignSelf="flex-end"
                        maxW="85%"
                        px={3}
                        py={2}
                        borderRadius="lg"
                        bg={userBubble}
                      >
                        <Text fontSize="sm" whiteSpace="pre-wrap">{m.content}</Text>
                      </Box>
                    ) : chatMode === 'chat' ? (
                      <Box key={m.id || `a-${i}`} w="100%">
                        <LearningConversationalMessage
                          content={m.content}
                          speakAloud={voice.voiceMode}
                          onAskPrompt={(prompt) => void sendText(prompt)}
                        />
                      </Box>
                    ) : (
                      <Box key={m.id || `a-${i}`} w="100%">
                        <LearningWorkspaceMessage
                          content={m.content}
                          onAskPrompt={(prompt) => void sendText(prompt)}
                        />
                      </Box>
                    )
                  )}

                  {pending && (
                    <HStack py={2} spacing={2} justify="center">
                      <Spinner size="sm" />
                      <Text fontSize="sm" color="gray.500">
                        {chatMode === 'chat' ? 'Thinking…' : 'Building your learning cards…'}
                      </Text>
                    </HStack>
                  )}
                  <div ref={endRef} />
                </VStack>
              )}

              {error && <Text fontSize="xs" color="red.500" px={1} py={1}>{error}</Text>}
              {voice.voiceError && (
                <Text fontSize="xs" color="orange.600" px={1} py={1}>{voice.voiceError}</Text>
              )}
            </Box>

            {showAiStudy && (
              <VoiceConversationBar
                voiceMode={voice.voiceMode}
                voiceSupported={voice.voiceSupported}
                phase={voice.phase}
                interimTranscript={voice.interimTranscript}
                voiceLabel={voice.voiceLabel}
                disabled={pending || bootLoading}
                onToggleVoice={voice.toggleVoiceMode}
                onStartMic={voice.startMic}
                onStopMic={voice.stopMic}
                onStopSpeaking={voice.stopSpeakingNow}
              />
            )}

            <Divider />

            <HStack align="center" spacing={2} px={3} py={3}>
              <Input
                value={
                  voice.voiceMode && voice.interimTranscript
                    ? voice.interimTranscript
                    : draft
                }
                isReadOnly={voice.voiceMode && voice.phase === 'listening' && !!voice.interimTranscript}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={
                  voice.voiceMode && voice.phase === 'listening'
                    ? 'Speak your question…'
                    : chatMode === 'chat'
                      ? 'Type or use voice chat…'
                      : showOnboarding
                        ? 'Or type a topic + question…'
                        : 'Ask a follow-up…'
                }
                size="md"
                isDisabled={pending || bootLoading}
              />
              <Button
                colorScheme="blue"
                size="md"
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

