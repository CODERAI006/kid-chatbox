/**
 * Read-only message thread for past Guru chats.
 */
import { Box, Text, VStack, useColorModeValue } from '@/shared/design-system';
import type { LearningBotUiMessage } from '@/services/api';
import { LearningConversationalMessage } from './LearningConversationalMessage';
import { LearningWorkspaceMessage } from './LearningWorkspaceMessage';
import { isWorkspaceContent } from '@/utils/learningChatMode';
import { inferStudyFormat } from '@/utils/inferStudyFormat';
import { chatMessageContainerProps, chatResponsiveTextSx } from './chatResponsiveStyles';

interface Props {
  messages: LearningBotUiMessage[];
}

export function PastChatMessageList({ messages }: Props) {
  const userBubble = useColorModeValue('blue.50', 'blue.900');
  const studyFormat = inferStudyFormat(messages);

  return (
    <VStack align="stretch" spacing={3} {...chatMessageContainerProps} sx={chatResponsiveTextSx}>
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
            <Text fontSize="sm" whiteSpace="pre-wrap" lineHeight="tall">
              {m.content}
            </Text>
          </Box>
        ) : isWorkspaceContent(m.content) ? (
          <Box key={m.id || `a-${i}`} w="100%">
            <LearningWorkspaceMessage content={m.content} studyFormat={studyFormat} />
          </Box>
        ) : (
          <Box key={m.id || `a-${i}`} w="100%">
            <LearningConversationalMessage content={m.content} />
          </Box>
        )
      )}
    </VStack>
  );
}
