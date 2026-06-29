/**
 * Step 1: pick study format. Step 2: configure options + enter topic.
 */
import { useState } from 'react';
import {
  Box,
  Button,
  HStack,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
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
import { StudyPlanOnboarding } from './StudyPlanOnboarding';
import {
  DEFAULT_QUIZ_COUNT,
  MIN_QUIZ_COUNT,
  MAX_QUIZ_COUNT,
  QUIZ_COUNT_OPTIONS,
  clampQuizCount,
} from '@/constants/learningQuiz';

interface Props {
  disabled?: boolean;
  onStart: (params: {
    text: string;
    mode: LearningBotMode;
    format: LearningStudyFormat;
    quizCount?: number;
    startVoice?: boolean;
  }) => void;
}

export function LearningFormatOnboarding({ disabled, onStart }: Props) {
  const [step, setStep] = useState<'format' | 'topic' | 'studyplan'>('format');
  const [format, setFormat] = useState<LearningStudyFormat | null>(null);
  const [topic, setTopic] = useState('');
  const [quizCount, setQuizCount] = useState(DEFAULT_QUIZ_COUNT);

  const cardBg = useColorModeValue('white', 'gray.700');
  const highlightBg = useColorModeValue('blue.50', 'blue.900');
  const selected = STUDY_FORMAT_OPTIONS.find((o) => o.key === format);

  const pickFormat = (key: LearningStudyFormat) => {
    setFormat(key);
    setStep(key === 'studyplan' ? 'studyplan' : 'topic');
  };

  const submitTopic = () => {
    if (!format || !topic.trim()) return;
    const option = STUDY_FORMAT_OPTIONS.find((o) => o.key === format);
    if (!option) return;
    const count = format === 'quiz' ? clampQuizCount(quizCount) : undefined;
    onStart({
      text: buildStudyTopicPrompt(format, topic, { quizCount: count }),
      mode: option.mode,
      format,
      quizCount: count,
      startVoice: format === 'conversation',
    });
    setStep('format');
    setFormat(null);
    setTopic('');
    setQuizCount(DEFAULT_QUIZ_COUNT);
  };

  if (step === 'studyplan') {
    return (
      <StudyPlanOnboarding
        disabled={disabled}
        onBack={() => {
          setStep('format');
          setFormat(null);
        }}
        onPlanCreated={({ text }) => {
          if (!text) return;
          onStart({
            text,
            mode: 'workspace',
            format: 'studyplan',
          });
          setStep('format');
          setFormat(null);
        }}
      />
    );
  }

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

      {format === 'quiz' && (
        <Box>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            How many questions?
          </Text>
          <HStack spacing={2} flexWrap="wrap" mb={2}>
            {QUIZ_COUNT_OPTIONS.map((n) => (
              <Button
                key={n}
                size="sm"
                variant={quizCount === n ? 'solid' : 'outline'}
                colorScheme="green"
                onClick={() => setQuizCount(n)}
              >
                {n}
              </Button>
            ))}
          </HStack>
          <NumberInput
            size="sm"
            min={MIN_QUIZ_COUNT}
            max={MAX_QUIZ_COUNT}
            value={quizCount}
            onChange={(_, val) => setQuizCount(clampQuizCount(Number.isFinite(val) ? val : DEFAULT_QUIZ_COUNT))}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Guru AI will generate {clampQuizCount(quizCount)} multiple-choice questions.
          </Text>
        </Box>
      )}

      <Text fontSize="sm" fontWeight="semibold">
        {format === 'conversation' ? 'What would you like to talk about?' : 'What topic should we study?'}
      </Text>
      {format === 'conversation' && (
        <Text fontSize="xs" color="gray.500">
          Guru will reply with a soft-spoken voice. Allow microphone access when prompted.
        </Text>
      )}
      <Input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder={
          format === 'conversation'
            ? 'e.g. Tell me about the solar system…'
            : 'e.g. Photosynthesis, fractions, World War 2…'
        }
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
        {format === 'conversation' ? 'Start voice chat' : 'Start learning'}
      </Button>
    </VStack>
  );
}
