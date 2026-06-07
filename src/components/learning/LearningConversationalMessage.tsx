/**
 * Plain-text assistant bubble for conversational chat mode.
 */
import { Box, Text } from '@/shared/design-system';

interface Props {
  content: string;
}

export function LearningConversationalMessage({ content }: Props) {
  return (
    <Box
      alignSelf="flex-start"
      maxW="92%"
      px={3}
      py={2}
      borderRadius="lg"
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      boxShadow="sm"
    >
      <Text fontSize="xs" color="gray.500" fontWeight="semibold" mb={1}>
        💬 AI Tutor
      </Text>
      <Text fontSize="sm" lineHeight="tall" whiteSpace="pre-wrap">
        {content}
      </Text>
    </Box>
  );
}
