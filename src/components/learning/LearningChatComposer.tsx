/**
 * Chat input row — text field with mic and send icon buttons side by side.
 */
import { type KeyboardEvent } from 'react';
import {
  Box,
  HStack,
  IconButton,
  Input,
  Spinner,
  Text,
  Tooltip,
  useColorModeValue,
} from '@/shared/design-system';
import { FiMic, FiSend, FiVolumeX } from 'react-icons/fi';
import type { useVoiceConversation } from '@/hooks/useVoiceConversation';
import type { LearningBotMode } from '@/types/learningWorkspace';

type VoiceState = ReturnType<typeof useVoiceConversation>;

interface Props {
  draft: string;
  chatMode: LearningBotMode;
  showOnboarding: boolean;
  showAiStudy: boolean;
  pending: boolean;
  bootLoading: boolean;
  voice: VoiceState;
  onSend: () => void;
  onKeyDown: (ev: KeyboardEvent) => void;
  onDraftChange: (value: string) => void;
}

export function LearningChatComposer({
  draft,
  chatMode,
  showOnboarding,
  showAiStudy,
  pending,
  bootLoading,
  voice,
  onSend,
  onKeyDown,
  onDraftChange,
}: Props) {
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const statusBg = useColorModeValue('purple.50', 'purple.900');

  const inputDisabled = pending || bootLoading;
  const canSend = !inputDisabled && draft.trim() && !showOnboarding;
  const listening = voice.phase === 'listening';
  const speaking = voice.phase === 'speaking';
  const thinking = voice.phase === 'thinking';

  const handleMic = () => {
    if (!voice.voiceSupported || inputDisabled) return;
    if (speaking) {
      voice.stopSpeakingNow();
      return;
    }
    if (!voice.voiceMode) {
      voice.toggleVoiceMode();
      return;
    }
    if (listening) {
      voice.toggleVoiceMode();
      return;
    }
    if (thinking) return;
    voice.startMic();
  };

  const micLabel = !voice.voiceSupported
    ? 'Voice needs Chrome or Edge with microphone access'
    : speaking
      ? 'Skip voice reply'
      : voice.voiceMode
        ? listening
          ? 'Stop voice chat'
          : 'Start listening'
        : 'Talk with Guru (natural voice)';

  const placeholder =
    voice.voiceMode && listening
      ? 'Listening… speak your question'
      : chatMode === 'chat'
        ? 'Ask Guru anything…'
        : showOnboarding
          ? 'Or type a topic + question…'
          : 'Ask a follow-up…';

  return (
    <Box borderTopWidth="1px" borderColor={borderColor} flexShrink={0}>
      {showAiStudy && voice.voiceMode && (
        <HStack px={3} py={1} bg={statusBg} spacing={2}>
          {thinking && <Spinner size="xs" color="purple.500" />}
          <Text fontSize="xs" color="purple.700" noOfLines={1}>
            {voice.interimTranscript || voice.voiceLabel}
          </Text>
        </HStack>
      )}

      <HStack align="center" spacing={2} px={3} py={3}>
        <Input
          flex={1}
          value={voice.voiceMode && voice.interimTranscript ? voice.interimTranscript : draft}
          isReadOnly={voice.voiceMode && listening && !!voice.interimTranscript}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          size="md"
          isDisabled={inputDisabled}
        />

        {showAiStudy && (
          <Tooltip label={micLabel}>
            <IconButton
              aria-label={micLabel}
              icon={speaking ? <FiVolumeX size={18} /> : <FiMic size={18} />}
              size="md"
              variant={voice.voiceMode ? 'solid' : 'outline'}
              colorScheme={listening ? 'red' : speaking ? 'orange' : 'purple'}
              onClick={handleMic}
              isDisabled={!voice.voiceSupported || inputDisabled || thinking}
              flexShrink={0}
            />
          </Tooltip>
        )}

        <Tooltip label="Send message">
          <IconButton
            aria-label="Send message"
            icon={<FiSend size={18} />}
            size="md"
            colorScheme="blue"
            onClick={onSend}
            isDisabled={!canSend}
            flexShrink={0}
          />
        </Tooltip>
      </HStack>
    </Box>
  );
}
