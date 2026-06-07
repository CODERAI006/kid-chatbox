/**
 * Step 1: pick study format. Step 2: enter topic.
 */
import { useState } from 'react';
import {
  Box,
  Button,
  Input,
  SimpleGrid,
  Text,
  VStack,
  useColorModeValue,
} from '@/shared/design-system';
import {
  STUDY_FORMAT_OPTIONS,
  buildStudyTopicPrompt,
  type LearningBotMode,
  type LearningStudyFormat,
} from '@/types/learningWorkspace';

interface Props {
  disabled?: boolean;
  onStart: (params: { text: string; mode: LearningBotMode; format: LearningStudyFormat }) => void;
}

export function LearningFormatOnboarding({ disabled, onStart }: Props) {
  const [step, setStep] = useState<'format' | 'topic'>('format');
  const [format, setFormat] = useState<LearningStudyFormat | null>(null);
  const [topic, setTopic] = useState('');

  const cardBg = useColorModeValue('white', 'gray.700');
  const highlightBg = useColorModeValue('blue.50', 'blue.900');
  const selected = STUDY_FORMAT_OPTIONS.find((o) => o.key === format);

  const pickFormat = (key: LearningStudyFormat) => {
    setFormat(key);
    setStep('topic');
  };

  const submitTopic = () => {
    if (!format || !topic.trim()) return;
    const option = STUDY_FORMAT_OPTIONS.find((o) => o.key === format);
    if (!option) return;
    onStart({
      text: buildStudyTopicPrompt(format, topic),
      mode: option.mode,
      format,
    });
    setStep('format');
    setFormat(null);
    setTopic('');
  };

  if (step === 'format') {
    return (
      <Box>
        <Text fontSize="sm" fontWeight="bold" mb={1}>
          What kind of help do you need?
        </Text>
        <Text fontSize="xs" color="gray.500" mb={3}>
          Pick a format first — then tell me your topic.
        </Text>
        <SimpleGrid columns={{ base: 2, md: 3 }} spacing={2}>
          {STUDY_FORMAT_OPTIONS.map((option) => (
            <Button
              key={option.key}
              h="auto"
              py={3}
              px={2}
              flexDirection="column"
              whiteSpace="normal"
              variant="outline"
              bg={cardBg}
              isDisabled={disabled}
              onClick={() => pickFormat(option.key)}
            >
              <Text fontSize="lg">{option.emoji}</Text>
              <Text fontSize="sm" fontWeight="bold">{option.label}</Text>
              <Text fontSize="xs" color="gray.500">{option.hint}</Text>
            </Button>
          ))}
        </SimpleGrid>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={3}>
      <Button
        size="xs"
        alignSelf="flex-start"
        variant="ghost"
        onClick={() => {
          setStep('format');
          setTopic('');
        }}
      >
        ← Change format
      </Button>
      <Box p={3} borderRadius="md" bg={highlightBg}>
        <Text fontSize="sm" fontWeight="bold">
          {selected?.emoji} {selected?.label}
        </Text>
        <Text fontSize="xs" color="gray.600">{selected?.hint}</Text>
      </Box>
      <Text fontSize="sm" fontWeight="semibold">
        What topic should we study?
      </Text>
      <Input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="e.g. Photosynthesis, fractions, World War 2…"
        size="md"
        isDisabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && topic.trim()) submitTopic();
        }}
      />
      <Button
        colorScheme="blue"
        onClick={submitTopic}
        isDisabled={disabled || !topic.trim()}
      >
        Start learning
      </Button>
    </VStack>
  );
}
