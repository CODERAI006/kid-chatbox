/**
 * Voice conversation controls for the learning chat widget.
 */
import { Box, Button, HStack, IconButton, Text, Tooltip } from '@/shared/design-system';
import type { VoicePhase } from '@/hooks/useVoiceConversation';

interface Props {
  voiceMode: boolean;
  voiceSupported: boolean;
  phase: VoicePhase;
  interimTranscript: string;
  voiceLabel: string;
  disabled: boolean;
  onToggleVoice: () => void;
  onStartMic: () => void;
  onStopMic: () => void;
  onStopSpeaking: () => void;
}

function MicIcon({ active }: { active: boolean }) {
  return <Text fontSize="lg">{active ? '🎙️' : '🎤'}</Text>;
}

export function VoiceConversationBar({
  voiceMode,
  voiceSupported,
  phase,
  interimTranscript,
  voiceLabel,
  disabled,
  onToggleVoice,
  onStartMic,
  onStopMic,
  onStopSpeaking,
}: Props) {
  const listening = phase === 'listening';
  const speaking = phase === 'speaking';

  if (!voiceSupported) {
    return (
      <Box px={3} py={1} bg="orange.50" borderTopWidth="1px" borderColor="orange.100">
        <Text fontSize="xs" color="orange.700">
          Voice chat needs Chrome or Edge with microphone access.
        </Text>
      </Box>
    );
  }

  return (
    <Box
      px={3}
      py={2}
      borderTopWidth="1px"
      borderColor={voiceMode ? 'purple.100' : 'gray.100'}
      bg={voiceMode ? 'purple.50' : 'gray.50'}
    >
      <HStack spacing={2} justify="space-between">
        <HStack spacing={2} flex={1} minW={0}>
          <Tooltip label={voiceMode ? 'Turn off voice chat' : 'Talk with AI tutor (Indian voice)'}>
            <Button
              size="sm"
              variant={voiceMode ? 'solid' : 'outline'}
              colorScheme="purple"
              leftIcon={<Text fontSize="sm">🗣️</Text>}
              onClick={onToggleVoice}
              isDisabled={disabled}
            >
              {voiceMode ? 'Voice on' : 'Voice chat'}
            </Button>
          </Tooltip>

          {voiceMode && !speaking && (
            <Tooltip label={listening ? 'Stop listening' : 'Start speaking'}>
              <IconButton
                aria-label={listening ? 'Stop listening' : 'Start voice input'}
                icon={<MicIcon active={listening} />}
                size="sm"
                rounded="full"
                colorScheme={listening ? 'red' : 'purple'}
                variant={listening ? 'solid' : 'outline'}
                onClick={listening ? onStopMic : onStartMic}
                isDisabled={disabled || phase === 'thinking'}
              />
            </Tooltip>
          )}

          <Text fontSize="xs" color="gray.600" noOfLines={2} flex={1}>
            {interimTranscript || voiceLabel}
          </Text>
        </HStack>

        {speaking && (
          <Tooltip label="Skip voice — continue with mic">
            <Button
              size="xs"
              colorScheme="purple"
              variant="outline"
              leftIcon={<Text fontSize="xs">🔊</Text>}
              onClick={onStopSpeaking}
              flexShrink={0}
            >
              Skip
            </Button>
          </Tooltip>
        )}
      </HStack>
    </Box>
  );
}
