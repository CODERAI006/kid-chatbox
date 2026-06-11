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
import { formatOptionLabel } from '@/types/learningWorkspace';
import { DEFAULT_QUIZ_COUNT } from '@/constants/learningQuiz';
import { inferStudyFormat } from '@/utils/inferStudyFormat';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { buildNewChatShareText, shareOrCopyText } from '@/utils/chatShare';
import { buildStudyPlanPrompt, type StudyPlanDay } from '@/utils/studyPlanSchedule';

const WELCOME_TOPIC = 'Pick a format to start';

type ChatOpenDetail = {
  mode?: 'continue' | 'new' | 'study-plan';
  examName?: string;
  day?: StudyPlanDay;
};

export const LearningChatWidget: FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<LearningBotUiMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<LearningBotMode>('workspace');
  const [studyFormat, setStudyFormat] = useState<LearningStudyFormat | null>(null);
  const [quizQuestionCount, setQuizQuestionCount] = useState(DEFAULT_QUIZ_COUNT);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [bootLoading, setBootLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const historyDrawer = useDisclosure();
  const pendingRef = useRef(false);
  const bootLoadingRef = useRef(false);
  pendingRef.current = pending;
  bootLoadingRef.current = bootLoading;
  const { showAiStudy } = usePlanAiFlags();
  const isDesktopModal = useBreakpointValue({ base: false, lg: true }) ?? false;

  const panelBg = useColorModeValue('white', 'gray.800');
  const panelBorder = useColorModeValue('gray.200', 'gray.600');
  const userBubble = useColorModeValue('blue.50', 'blue.900');
  const workspaceBg = useColorModeValue('gray.50', 'gray.900');

  const currentTopic = useMemo(() => {
    let topic = WELCOME_TOPIC;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.role === 'assistant') {
        const ws = resolveWorkspace(m.content);
        if (ws.topic && ws.topic !== 'Learning') {
          topic = ws.topic;
          break;
        }
      }
    }
    const formatLabel = formatOptionLabel(studyFormat);
    const quizSuffix =
      studyFormat === 'quiz' ? ` (${quizQuestionCount} Qs)` : '';
    if (formatLabel && topic !== WELCOME_TOPIC) {
      return `${formatLabel}${quizSuffix} · ${topic}`;
    }
    if (formatLabel && messages.length === 0) return `${formatLabel}${quizSuffix}`;
    return topic;
  }, [messages, studyFormat, quizQuestionCount]);

  const loadActive = useCallback(async () => {
    setBootLoading(true);
    setError(null);
    try {
      const data = await learningBotApi.getConversation();
      setConversationId(data.conversationId);
      const loaded = Array.isArray(data.messages) ? data.messages : [];
      setMessages(loaded);
      setChatMode(inferChatMode(loaded));
      setStudyFormat(inferStudyFormat(loaded));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBootLoading(false);
    }
  }, []);

  const openFreshChat = useCallback(async () => {
    setOpen(true);
    setError(null);
    setSaveHint(null);
    try {
      await learningBotApi.resetConversation();
    } catch (e) {
      setError(getErrorMessage(e));
    }
    resetSession();
  }, []);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, pending, bootLoading]);

  useBodyScrollLock(open);

  const sendText = useCallback(
    async (
      text: string,
      opts?: { mode?: LearningBotMode; format?: LearningStudyFormat | null; quizCount?: number }
    ): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed || pendingRef.current || bootLoadingRef.current) return false;

      const mode = opts?.mode ?? chatMode;
      const format = opts?.format ?? studyFormat ?? undefined;
      const quizCount = opts?.quizCount ?? quizQuestionCount;

      setError(null);
      setSaveHint(null);
      setDraft('');
      setPending(true);
      if (opts?.mode) setChatMode(opts.mode);
      if (opts?.format) setStudyFormat(opts.format);
      if (opts?.quizCount) setQuizQuestionCount(opts.quizCount);

      let outbound = trimmed;
      if (format === 'quiz' && !/separate quiz cards/i.test(trimmed)) {
        outbound = `${trimmed} Return exactly ${quizCount} separate quiz cards.`;
      }

      try {
        const { conversationId: cid, content } = await learningBotApi.sendMessage({
          conversationId,
          text: outbound,
          mode,
          format: format ?? undefined,
        });
        setConversationId(cid);
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
    [conversationId, chatMode, studyFormat, quizQuestionCount]
  );

  useEffect(() => {
    const onOpenRequest = (ev: Event) => {
      const detail = (ev as CustomEvent<ChatOpenDetail>).detail;
      setOpen(true);
      if (detail?.mode === 'continue') {
        void loadActive();
        return;
      }
      if (detail?.mode === 'study-plan' && detail.day && detail.examName) {
        void (async () => {
          await openFreshChat();
          const text = buildStudyPlanPrompt(detail.examName!, detail.day!);
          await sendText(text, { mode: 'workspace', format: 'studyplan' });
        })();
        return;
      }
      void openFreshChat();
    };
    window.addEventListener('learning-chat:open', onOpenRequest);
    return () => window.removeEventListener('learning-chat:open', onOpenRequest);
  }, [loadActive, openFreshChat, sendText]);

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
    setChatMode('workspace');
    setStudyFormat(null);
    setQuizQuestionCount(DEFAULT_QUIZ_COUNT);
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

  const downloadConversation = useCallback(async () => {
    if (!conversationId) {
      setError('No conversation to download');
      return;
    }

    try {
      setError(null);
      setPending(true);

      // Get messages directly from getConversation (already in state or fetch fresh)
      let conversationMessages = messages;
      if (messages.length === 0) {
        // Fetch if not in state
        const data = await learningBotApi.getConversation();
        conversationMessages = data.messages || [];
      }

      // Generate PDF using jsPDF - Chat-like interface
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header with Guru AI branding (matching chat UI)
      const headerBg = [59, 130, 246]; // Blue 600
      const headerText = [255, 255, 255]; // White
      doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
      doc.rect(0, 0, pageWidth, 28, 'F');
      doc.setTextColor(headerText[0], headerText[1], headerText[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Guru AI', pageWidth / 2, 17, { align: 'center' });

      // Chat topic and metadata
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const topicLine = conversationMessages.find((m) => m.role === 'user')?.content?.substring(0, 50) || 'Chat Conversation';
      doc.setTextColor(225, 235, 255);
      const dateStr = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
      doc.text(`Topic: ${topicLine}  |  Exported: ${dateStr}  |  ${conversationMessages.length} messages`, pageWidth / 2, 24, { align: 'center' });

      // Messages area
      let currentY = 42;
      const margin = 14;
      const maxContentWidth = pageWidth - margin * 2;

      // Message bubble styling
      const userBubbleBg = [239, 246, 253]; // Blue 50
      const aiBubbleBg = [255, 255, 255]; // White
      const userText = [30, 64, 175]; // Blue 900
      const aiText = [55, 65, 81]; // Gray 800
      const userBadgeBg = [59, 130, 246]; // Blue 600
      const aiBadgeBg = [16, 185, 129]; // Green 500

      for (let i = 0; i < conversationMessages.length; i++) {
        const msg = conversationMessages[i];
        const isUser = msg.role === 'user';

        // Message bubble background
        const bubbleBg = isUser ? userBubbleBg : aiBubbleBg;
        doc.setFillColor(bubbleBg[0], bubbleBg[1], bubbleBg[2]);

        // Calculate bubble width
        const msgText = msg.content || '';
        const lines = doc.splitTextToSize(msgText, maxContentWidth);
        const contentHeight = lines.length * 6;
        const bubbleHeight = Math.max(24, contentHeight + 12);
        const bubbleWidth = maxContentWidth - (isUser ? 0 : 0);

        // Check if we need a new page
        if (currentY + bubbleHeight + 10 > pageHeight - 20) {
          doc.addPage();
          currentY = 20;
        }

        // Draw bubble
        const bubbleX = isUser ? margin : margin;
        doc.roundedRect(bubbleX, currentY, bubbleWidth, bubbleHeight, 2, 2, 'F');

        // Role badge
        const badgeBg = isUser ? userBadgeBg : aiBadgeBg;
        const badgeText = isUser ? 'YOU' : 'AI';
        const badgeWidth = doc.getTextWidth(badgeText) + 8;
        const badgeHeight = 7;
        doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
        doc.roundedRect(bubbleX, currentY - 4, badgeWidth, badgeHeight, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.text(badgeText, bubbleX + 4, currentY - 0.5);

        // Timestamp (only on first message of each role group)
        if (i === 0 || conversationMessages[i - 1]?.role !== msg.role) {
          doc.setFontSize(7);
          doc.setTextColor(107, 114, 128); // Gray 500
          doc.text(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), bubbleX, currentY + bubbleHeight - 2);
        }

        // Message content
        currentY += 10;
        doc.setFontSize(9);
        doc.setTextColor(isUser ? userText[0] : aiText[0], isUser ? userText[1] : aiText[1], isUser ? userText[2] : aiText[2]);

        for (let j = 0; j < lines.length; j++) {
          doc.text(lines[j], bubbleX + 2, currentY + j * 6);
        }

        currentY += contentHeight + 12;
      }

      // Footer (matching chat UI)
      const footerY = pageHeight - 12;
      doc.setDrawColor(229, 231, 235); // Gray 200
      doc.setLineWidth(0.5);
      doc.line(margin, footerY, pageWidth - margin, footerY);

      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128); // Gray 500
      doc.text('Guru AI - AI-Powered Educational Platform', pageWidth / 2, pageHeight - 5, { align: 'center' });

      // Save PDF
      const fileName = `chat_export_${conversationId.substring(0, 8)}.pdf`;
      doc.save(fileName);

    } catch (e) {
      const msg = getErrorMessage(e);
      setError(msg);
    } finally {
      setPending(false);
    }
  }, [conversationId, messages]);

  const onOpenSavedChat = (id: string, loaded: LearningBotUiMessage[]) => {
    setConversationId(id);
    setMessages(loaded);
    setChatMode(inferChatMode(loaded));
    setStudyFormat(inferStudyFormat(loaded));
    setSaveHint(null);
  };

  const onSavedCurrent = () => {
    resetSession();
    setSaveHint('Chat saved. Start a new question anytime.');
  };

  const showOnboarding = messages.length === 0 && !bootLoading;
  const isNewChat = showOnboarding;
  const shareText = buildNewChatShareText(currentTopic);

  const handleShare = useCallback(async () => {
    const result = await shareOrCopyText(buildNewChatShareText(currentTopic));
    if (result === 'failed') setError('Could not share. Copy the invite text from the header.');
  }, [currentTopic]);

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

  const panelProps = {
    currentTopic,
    messages,
    chatMode,
    studyFormat,
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
    voice,
    endRef,
    onClose: () => setOpen(false),
    onHistoryOpen: historyDrawer.onOpen,
    onNewTopic: () => void startNewTopic(),
    onShare: () => void handleShare(),
    shareText,
    isNewChat,
    onSend: () => void send(),
    onSendText: sendText,
    onKeyDown,
    onDraftChange: setDraft,
    onDownload: downloadConversation,
  };

  return (
    <>
      {!open && (
        <IconButton
          aria-label="Open Guru AI"
          icon={<Text fontSize="xl">🧘</Text>}
          position="fixed"
          bottom={{ base: 'calc(4.5rem + env(safe-area-inset-bottom, 0px) + 0.5rem)', md: 8 }}
          right={{ base: 5, md: 8 }}
          zIndex={1500}
          size="lg"
          rounded="full"
          colorScheme="blue"
          boxShadow="lg"
          onClick={() => void openFreshChat()}
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
            data-chat-overlay
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
            sx={{ overscrollBehavior: 'none' }}
          >
            <LearningChatPanelContent {...panelProps} />
          </ModalContent>
        </Modal>
      )}

      {open && !isDesktopModal && (
        <Box
          data-chat-overlay
          position="fixed"
          bottom={{ base: 0, sm: 2 }}
          right={{ base: 0, sm: 2 }}
          left={{ base: 0, sm: 2 }}
          zIndex={1500}
          maxW="100%"
          minW={0}
          h={{ base: '100dvh', sm: 'min(92dvh, 820px)' }}
          bg={panelBg}
          borderWidth="1px"
          borderColor={panelBorder}
          borderRadius={{ base: 'none', sm: 'xl' }}
          boxShadow="2xl"
          display="flex"
          flexDirection="column"
          overflow="hidden"
          sx={{ overscrollBehavior: 'none' }}
        >
          <LearningChatPanelContent {...panelProps} />
        </Box>
      )}
    </>
  );
};
