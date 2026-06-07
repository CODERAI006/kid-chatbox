/**
 * Inline Ask AI Teacher — topic-aware mini chat on the study page.
 */
import { useCallback, useRef, useState } from 'react';
import {
  Box, VStack, HStack, Text, Input, Button, Spinner, Badge, useColorModeValue,
} from '@/shared/design-system';
import { getErrorMessage, learningBotApi } from '@/services/api';

interface StudyAskTeacherProps {
  topic: string;
  subject: string;
  suggestedPrompts?: string[];
}

export const StudyAskTeacher: React.FC<StudyAskTeacherProps> = ({
  topic,
  subject,
  suggestedPrompts = [],
}) => {
  const [draft, setDraft] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationId = useRef<string | null>(null);
  const bubbleBg = useColorModeValue('blue.50', 'blue.900');
  const answerBg = useColorModeValue('green.50', 'green.900');

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError(null);
    setReply(null);
    try {
      const contextual = `I'm studying "${topic}" in ${subject}. ${trimmed}`;
      const res = await learningBotApi.sendMessage({
        conversationId: conversationId.current,
        text: contextual,
      });
      conversationId.current = res.conversationId;
      setReply(res.content);
      setDraft('');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setPending(false);
    }
  }, [topic, subject, pending]);

  const prompts = suggestedPrompts.length
    ? suggestedPrompts
    : [
        `Explain ${topic} in simpler words`,
        `Give me a practice question on ${topic}`,
        `What are common mistakes in ${topic}?`,
      ];

  return (
    <VStack spacing={4} align="stretch">
      <Text fontSize="sm" color="gray.600">
        Ask anything about <strong>{topic}</strong>. Your AI teacher knows you are studying this lesson.
      </Text>
      <HStack flexWrap="wrap" gap={2}>
        {prompts.slice(0, 6).map((p) => (
          <Badge
            key={p}
            as="button"
            px={3}
            py={1}
            borderRadius="full"
            colorScheme="purple"
            cursor="pointer"
            fontWeight="normal"
            onClick={() => send(p)}
            _hover={{ opacity: 0.85 }}
          >
            {p}
          </Badge>
        ))}
      </HStack>
      <HStack>
        <Input
          placeholder={`Ask about ${topic}…`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(draft)}
          bg="white"
          borderRadius="lg"
        />
        <Button colorScheme="purple" onClick={() => send(draft)} isLoading={pending} flexShrink={0}>
          Ask
        </Button>
      </HStack>
      {pending && (
        <HStack spacing={2} color="gray.500">
          <Spinner size="sm" />
          <Text fontSize="sm">AI Teacher is thinking…</Text>
        </HStack>
      )}
      {error && (
        <Box p={3} bg="red.50" borderRadius="lg" borderLeftWidth={4} borderLeftColor="red.400">
          <Text fontSize="sm" color="red.700">{error}</Text>
        </Box>
      )}
      {reply && (
        <Box p={4} bg={answerBg} borderRadius="xl" borderLeftWidth={4} borderLeftColor="green.400">
          <Text fontSize="xs" fontWeight="bold" color="green.700" mb={2}>
            AI TEACHER
          </Text>
          <Text fontSize="sm" lineHeight="tall" whiteSpace="pre-wrap" color="gray.800">
            {reply}
          </Text>
        </Box>
      )}
      {!reply && !pending && (
        <Box p={3} bg={bubbleBg} borderRadius="lg">
          <Text fontSize="sm" color="gray.600" fontStyle="italic">
            Tip: Try a suggested question above or type your own doubt.
          </Text>
        </Box>
      )}
    </VStack>
  );
};
