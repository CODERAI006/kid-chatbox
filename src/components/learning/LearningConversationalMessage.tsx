/**
 * Rich assistant bubble for conversational chat mode.
 */
import { Box, Button, HStack, Text, useColorModeValue } from '@/shared/design-system';
import { speakText, unlockSpeechSynthesis } from '@/utils/speechSynthesis';
import { AiRichContentView } from './AiRichContentView';
import { chatMessageContainerProps, chatResponsiveTextSx } from './chatResponsiveStyles';

interface Props {
  content: string;
  speakAloud?: boolean;
  voiceMode?: boolean;
  onAskPrompt?: (prompt: string) => void;
}

export function LearningConversationalMessage({
  content,
  speakAloud,
  voiceMode,
  onAskPrompt,
}: Props) {
  const bubbleBg = useColorModeValue('white', 'gray.800');
  const bubbleBorder = useColorModeValue('gray.200', 'gray.600');

  return (
    <Box
      alignSelf="stretch"
      {...chatMessageContainerProps}
      px={{ base: 2, sm: 3, md: 4 }}
      py={3}
      borderRadius="lg"
      bg={bubbleBg}
      borderWidth="1px"
      borderColor={bubbleBorder}
      boxShadow="sm"
      sx={chatResponsiveTextSx}
    >
      <HStack justify="space-between" mb={2} align="flex-start" gap={2} minW={0}>
        <HStack spacing={2}>
          <Text fontSize="lg">{voiceMode || speakAloud ? '🎙️' : '💬'}</Text>
          <Text fontSize="xs" color="gray.500" fontWeight="semibold">
            {voiceMode || speakAloud ? 'Guru (voice)' : 'AI Tutor'}
          </Text>
        </HStack>
        {!speakAloud && (
          <Button
            size="xs"
            variant="ghost"
            colorScheme="purple"
            onClick={() => {
              unlockSpeechSynthesis();
              void speakText(content);
            }}
          >
            🔊 Listen
          </Button>
        )}
      </HStack>
      <AiRichContentView content={content} onAction={onAskPrompt} />
    </Box>
  );
}

