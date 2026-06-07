/**
 * Rich assistant bubble for conversational chat mode.
 */
import { Box, Button, HStack, Text, useColorModeValue } from '@/shared/design-system';
import { speakText, unlockSpeechSynthesis } from '@/utils/speechSynthesis';
import { AiRichContentView } from './AiRichContentView';

interface Props {
  content: string;
  speakAloud?: boolean;
  onAskPrompt?: (prompt: string) => void;
}

export function LearningConversationalMessage({ content, speakAloud, onAskPrompt }: Props) {
  const bubbleBg = useColorModeValue('white', 'gray.800');
  const bubbleBorder = useColorModeValue('gray.200', 'gray.600');

  return (
    <Box
      alignSelf="stretch"
      w="100%"
      maxW="100%"
      px={{ base: 3, md: 4 }}
      py={3}
      borderRadius="lg"
      bg={bubbleBg}
      borderWidth="1px"
      borderColor={bubbleBorder}
      boxShadow="sm"
    >
      <HStack justify="space-between" mb={2}>
        <HStack spacing={2}>
          <Text fontSize="lg">💬</Text>
          <Text fontSize="xs" color="gray.500" fontWeight="semibold">
            AI Tutor
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
