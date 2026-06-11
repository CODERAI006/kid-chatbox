/**
 * Inner chat panel — header, scrollable messages, voice bar, input.
 */
import { type KeyboardEvent, type RefObject } from 'react';
import { Box, HStack, Text, VStack, Spinner } from '@/shared/design-system';
import type { LearningBotUiMessage } from '@/services/api';
import type { LearningBotMode, LearningStudyFormat } from '@/types/learningWorkspace';
import { LearningFormatOnboarding } from './LearningFormatOnboarding';
import { LearningConversationalMessage } from './LearningConversationalMessage';
import { LearningWorkspaceMessage } from './LearningWorkspaceMessage';
import { LearningChatComposer } from './LearningChatComposer';
import { GuruChatHeader } from './GuruChatHeader';
import { StudyPlanTodayBanner } from './StudyPlanTodayBanner';
import { chatMessageContainerProps, chatResponsiveTextSx } from './chatResponsiveStyles';
import type { useVoiceConversation } from '@/hooks/useVoiceConversation';

type VoiceState = ReturnType<typeof useVoiceConversation>;

export interface LearningChatPanelContentProps {
  currentTopic: string;
  userName?: string;
  messages: LearningBotUiMessage[];
  chatMode: LearningBotMode;
  studyFormat: LearningStudyFormat | null;
  saveHint: string | null;
  bootLoading: boolean;
  pending: boolean;
  error: string | null;
  showOnboarding: boolean;
  showAiStudy: boolean;
  draft: string;
  panelBorder: string;
  userBubble: string;
  workspaceBg: string;
  voice: VoiceState;
  endRef: RefObject<HTMLDivElement>;
  onClose: () => void;
  onHistoryOpen: () => void;
  onNewTopic: () => void;
  onShare?: () => void;
  shareText?: string;
  isNewChat?: boolean;
  onDownload?: () => void;
  onSend: () => void;
  onSendText: (
    text: string,
    opts?: { mode?: LearningBotMode; format?: LearningStudyFormat | null; quizCount?: number }
  ) => void;
  onKeyDown: (ev: KeyboardEvent) => void;
  onDraftChange: (value: string) => void;
}

export function LearningChatPanelContent({
  currentTopic,
  userName,
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
  onClose,
  onHistoryOpen,
  onNewTopic,
  onShare,
  shareText,
  isNewChat,
  onDownload,
  onSend,
  onSendText,
  onKeyDown,
  onDraftChange,
}: LearningChatPanelContentProps) {
  const isChatActive =
    pending ||
    bootLoading ||
    (voice.voiceMode && voice.phase !== 'idle');

  return (
    <Box flex={1} minH={0} minW={0} display="flex" flexDirection="column" overflow="hidden">
      <GuruChatHeader
        currentTopic={currentTopic}
        userName={userName}
        isChatActive={isChatActive}
        isNewChat={isNewChat}
        shareText={shareText}
        panelBorder={panelBorder}
        onClose={onClose}
        onHistoryOpen={onHistoryOpen}
        onNewTopic={onNewTopic}
        onShare={onShare}
        onDownload={onDownload}
      />

      {saveHint && (
        <Box px={3} py={1} bg="green.50" borderBottomWidth="1px" borderColor="green.100" flexShrink={0}>
          <Text fontSize="xs" color="green.700">{saveHint}</Text>
        </Box>
      )}

      <VStack align="stretch" flex={1} spacing={0} overflow="hidden" minH={0}>
        <Box
          flex={1}
          minH={0}
          minW={0}
          overflowY="auto"
          overflowX="hidden"
          px={{ base: 2, sm: 3, md: 4 }}
          py={3}
          bg={workspaceBg}
          sx={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'none',
            touchAction: 'pan-y',
            ...chatResponsiveTextSx,
          }}
        >
          {bootLoading ? (
            <HStack py={6} justify="center">
              <Spinner size="sm" />
              <Text fontSize="sm" color="gray.500">Loading workspace…</Text>
            </HStack>
          ) : (
            <VStack align="stretch" spacing={3} {...chatMessageContainerProps}>
              <StudyPlanTodayBanner
                disabled={pending}
                onStartToday={(text) => void onSendText(text, { mode: 'workspace', format: 'studyplan' })}
              />

              {showOnboarding && (
                <LearningFormatOnboarding
                  disabled={pending}
                  onStart={({ text, mode, format, quizCount }) =>
                    void onSendText(text, { mode, format, quizCount })
                  }
                />
              )}

              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <Box
                    key={m.id || `u-${i}`}
                    alignSelf="flex-end"
                    maxW={{ base: '100%', sm: '92%', md: '85%' }}
                    minW={0}
                    px={3}
                    py={2}
                    borderRadius="lg"
                    bg={userBubble}
                  >
                    <Text fontSize="sm" whiteSpace="pre-wrap" lineHeight="tall" sx={chatResponsiveTextSx}>
                      {m.content}
                    </Text>
                  </Box>
                ) : chatMode === 'chat' ? (
                  <Box key={m.id || `a-${i}`} w="100%">
                    <LearningConversationalMessage
                      content={m.content}
                      speakAloud={voice.voiceMode}
                      onAskPrompt={(prompt) => void onSendText(prompt)}
                    />
                  </Box>
                ) : (
                  <Box key={m.id || `a-${i}`} w="100%">
                    <LearningWorkspaceMessage
                      content={m.content}
                      studyFormat={studyFormat}
                      onAskPrompt={(prompt) => void onSendText(prompt)}
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

        <LearningChatComposer
          draft={draft}
          chatMode={chatMode}
          showOnboarding={showOnboarding}
          showAiStudy={showAiStudy}
          pending={pending}
          bootLoading={bootLoading}
          voice={voice}
          onSend={onSend}
          onKeyDown={onKeyDown}
          onDraftChange={onDraftChange}
        />
      </VStack>
    </Box>
  );
}
