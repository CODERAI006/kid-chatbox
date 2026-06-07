/**
 * Inner chat panel — header, scrollable messages, voice bar, input.
 */
import { type KeyboardEvent, type RefObject } from 'react';
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
  Badge,
  Divider,
} from '@/shared/design-system';
import type { LearningBotUiMessage } from '@/services/api';
import type { LearningBotMode, LearningStudyFormat } from '@/types/learningWorkspace';
import { LearningFormatOnboarding } from './LearningFormatOnboarding';
import { LearningConversationalMessage } from './LearningConversationalMessage';
import { LearningWorkspaceMessage } from './LearningWorkspaceMessage';
import { VoiceConversationBar } from './VoiceConversationBar';
import type { useVoiceConversation } from '@/hooks/useVoiceConversation';

type VoiceState = ReturnType<typeof useVoiceConversation>;

export interface LearningChatPanelContentProps {
  currentTopic: string;
  messages: LearningBotUiMessage[];
  chatMode: LearningBotMode;
  modeLabel: string;
  lastModel: string | null;
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
  modeBadgeBg: string;
  voice: VoiceState;
  endRef: RefObject<HTMLDivElement>;
  onClose: () => void;
  onHistoryOpen: () => void;
  onNewTopic: () => void;
  onSend: () => void;
  onSendText: (
    text: string,
    opts?: { mode?: LearningBotMode; format?: LearningStudyFormat | null }
  ) => void;
  onKeyDown: (ev: KeyboardEvent) => void;
  onDraftChange: (value: string) => void;
}

export function LearningChatPanelContent({
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
  onClose,
  onHistoryOpen,
  onNewTopic,
  onSend,
  onSendText,
  onKeyDown,
  onDraftChange,
}: LearningChatPanelContentProps) {
  return (
    <>
      <Flex
        px={3}
        py={2}
        align="center"
        justify="space-between"
        borderBottomWidth="1px"
        borderColor={panelBorder}
        bg="blue.600"
        color="white"
        flexShrink={0}
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
          <Button size="xs" variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} onClick={onHistoryOpen}>
            Saved chats
          </Button>
          <Button size="xs" variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }} onClick={onNewTopic}>
            New topic
          </Button>
          <IconButton
            aria-label="Close assistant"
            size="sm"
            variant="ghost"
            color="white"
            _hover={{ bg: 'whiteAlpha.200' }}
            icon={<Text>✕</Text>}
            onClick={onClose}
          />
        </HStack>
      </Flex>

      {saveHint && (
        <Box px={3} py={1} bg="green.50" borderBottomWidth="1px" borderColor="green.100" flexShrink={0}>
          <Text fontSize="xs" color="green.700">{saveHint}</Text>
        </Box>
      )}

      <VStack align="stretch" flex={1} spacing={0} overflow="hidden" minH={0}>
        <Box
          flex={1}
          minH={0}
          overflowY="auto"
          px={{ base: 3, md: 4 }}
          py={3}
          bg={workspaceBg}
          sx={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
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
                  onStart={({ text, mode, format }) => void onSendText(text, { mode, format })}
                />
              )}

              {messages.map((m, i) =>
                m.role === 'user' ? (
                  <Box
                    key={m.id || `u-${i}`}
                    alignSelf="flex-end"
                    maxW={{ base: '92%', md: '85%' }}
                    px={3}
                    py={2}
                    borderRadius="lg"
                    bg={userBubble}
                  >
                    <Text fontSize="sm" whiteSpace="pre-wrap" lineHeight="tall">{m.content}</Text>
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

        <HStack align="center" spacing={2} px={3} py={3} flexShrink={0}>
          <Input
            value={voice.voiceMode && voice.interimTranscript ? voice.interimTranscript : draft}
            isReadOnly={voice.voiceMode && voice.phase === 'listening' && !!voice.interimTranscript}
            onChange={(e) => onDraftChange(e.target.value)}
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
            onClick={onSend}
            isDisabled={pending || bootLoading || !draft.trim()}
          >
            Send
          </Button>
        </HStack>
      </VStack>
    </>
  );
}
