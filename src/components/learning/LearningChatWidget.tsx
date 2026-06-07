/**
 * Conversational Learning Workspace — chat is one component among cards.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FC, type KeyboardEvent } from 'react';
import {
  Box,
  IconButton,
  Text,
  useColorModeValue,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  useBreakpointValue,
} from '@/shared/design-system';
import { getErrorMessage, learningBotApi, type LearningBotUiMessage } from '@/services/api';
import { LearningChatHistoryDrawer } from './LearningChatHistoryDrawer';
import { LearningChatPanelContent } from './LearningChatPanelContent';
import { resolveWorkspace } from '@/utils/learningWorkspaceParser';
import { inferChatMode } from '@/utils/learningChatMode';
import { extractSpeakableReply } from '@/utils/speechSynthesis';
import { useVoiceConversation } from '@/hooks/useVoiceConversation';
import { usePlanAiFlags } from '@/hooks/usePlanAiFlags';
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

  const isDesktopModal = useBreakpointValue({ base: false, lg: true }) ?? false;

  const panelProps = {
    currentTopic,
    messages,
    chatMode,
    modeLabel,
    lastModel,
    saveHint,
    bootLoading,
    pending,
    error,
    showOnboarding,
    showAiStudy,
    draft,
    panelBorder,
    userBubble,
    workspaceBg,
    modeBadgeBg,
    voice,
    endRef,
    onClose: () => setOpen(false),
    onHistoryOpen: historyDrawer.onOpen,
    onNewTopic: () => void startNewTopic(),
    onSend: () => void send(),
    onSendText: sendText,
    onKeyDown,
    onDraftChange: setDraft,
  };

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

      {open && isDesktopModal && (
        <Modal isOpen onClose={() => setOpen(false)} size="6xl" isCentered scrollBehavior="inside">
          <ModalOverlay bg="blackAlpha.600" />
          <ModalContent
            maxW="min(960px, 92vw)"
            h="min(90vh, 860px)"
            bg={panelBg}
            borderWidth="1px"
            borderColor={panelBorder}
            borderRadius="xl"
            overflow="hidden"
            display="flex"
            flexDirection="column"
            m={4}
          >
            <LearningChatPanelContent {...panelProps} />
          </ModalContent>
        </Modal>
      )}

      {open && !isDesktopModal && (
        <Box
          position="fixed"
          bottom={2}
          right={2}
          left={2}
          zIndex={1500}
          maxW="100%"
          h="min(92dvh, 820px)"
          bg={panelBg}
          borderWidth="1px"
          borderColor={panelBorder}
          borderRadius="xl"
          boxShadow="2xl"
          display="flex"
          flexDirection="column"
          overflow="hidden"
        >
          <LearningChatPanelContent {...panelProps} />
        </Box>
      )}
    </>
  );
};
