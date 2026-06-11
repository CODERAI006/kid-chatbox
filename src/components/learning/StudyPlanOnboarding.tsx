/**
 * Exam prep form — builds a day-by-day schedule and saves to the server.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  NumberInput,
  NumberInputField,
  Text,
  Textarea,
  Tooltip,
  VStack,
  useColorModeValue,
} from '@/shared/design-system';
import { FiMic } from 'react-icons/fi';
import { buildExamSchedule, buildStudyPlanPrompt } from '@/utils/studyPlanSchedule';
import { studyPlanApi } from '@/services/studyPlan';
import { getErrorMessage } from '@/services/api';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

type Props = {
  disabled?: boolean;
  onPlanCreated: (params: { text: string; examName: string }) => void;
  onBack: () => void;
};

function defaultExamDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export function StudyPlanOnboarding({ disabled, onPlanCreated, onBack }: Props) {
  const [examName, setExamName] = useState('');
  const [topicsRaw, setTopicsRaw] = useState('');
  const [examDate, setExamDate] = useState(defaultExamDate);
  const [hoursPerDay, setHoursPerDay] = useState(1.5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keepListeningRef = useRef(false);

  const highlightBg = useColorModeValue('purple.50', 'purple.900');

  const appendSpokenTopic = useCallback((text: string) => {
    const spoken = text.trim();
    if (!spoken) return;
    setTopicsRaw((prev) => {
      const base = prev.trim();
      return base ? `${base}\n${spoken}` : spoken;
    });
  }, []);

  const {
    supported: micSupported,
    listening: micListening,
    interimTranscript,
    error: micError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    continuous: true,
    keepListeningRef,
    onFinalTranscript: appendSpokenTopic,
  });

  useEffect(() => () => {
    keepListeningRef.current = false;
    stopListening();
  }, [stopListening]);

  const toggleTopicsMic = () => {
    if (!micSupported || disabled || saving) return;
    if (micListening) {
      keepListeningRef.current = false;
      stopListening();
      resetTranscript();
      return;
    }
    keepListeningRef.current = true;
    resetTranscript();
    startListening();
  };

  const micLabel = !micSupported
    ? 'Voice input needs Chrome or Edge'
    : micListening
      ? 'Stop adding topics by voice'
      : 'Say topics to add (one per pause)';

  const preview = useMemo(() => {
    const topics = topicsRaw.split(/[\n,]+/).map((t) => t.trim()).filter(Boolean);
    if (!examName.trim() || topics.length === 0 || !examDate) return null;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(examDate);
    if (end <= start) return null;
    return buildExamSchedule({
      examName: examName.trim(),
      topics,
      startDate: start,
      examDate: end,
      hoursPerDay,
    });
  }, [examName, topicsRaw, examDate, hoursPerDay]);

  const submit = async () => {
    if (!preview?.length) {
      setError('Add exam name, future exam date, and at least one topic.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { today } = await studyPlanApi.create({
        examName: examName.trim(),
        examDate,
        hoursPerDay,
        schedule: preview,
      });
      const day = today || preview[0];
      window.dispatchEvent(new CustomEvent('study-plan:updated'));
      onPlanCreated({
        examName: examName.trim(),
        text: buildStudyPlanPrompt(examName.trim(), day),
      });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <VStack align="stretch" spacing={3}>
      <Button size="xs" alignSelf="flex-start" variant="ghost" onClick={onBack}>
        ← Change format
      </Button>

      <Box p={3} borderRadius="md" bg={highlightBg}>
        <Text fontSize="sm" fontWeight="bold">📅 Plan my studies</Text>
        <Text fontSize="xs" color="gray.600">
          Tell me your exam and topics — I&apos;ll build a daily schedule with reminders.
        </Text>
      </Box>

      <Text fontSize="sm" fontWeight="semibold">Exam or subject name</Text>
      <Input
        value={examName}
        onChange={(e) => setExamName(e.target.value)}
        placeholder="e.g. CBSE Class 8 Science Final"
        isDisabled={disabled || saving}
      />

      <HStack justify="space-between" align="center">
        <Text fontSize="sm" fontWeight="semibold">Topics to cover (one per line)</Text>
        <Tooltip label={micLabel}>
          <IconButton
            aria-label={micLabel}
            icon={<FiMic size={16} />}
            size="sm"
            variant={micListening ? 'solid' : 'outline'}
            colorScheme={micListening ? 'red' : 'purple'}
            onClick={toggleTopicsMic}
            isDisabled={!micSupported || disabled || saving}
          />
        </Tooltip>
      </HStack>
      <Box position="relative">
        <Textarea
          value={
            micListening && interimTranscript
              ? `${topicsRaw}${topicsRaw.trim() ? '\n' : ''}${interimTranscript}`
              : topicsRaw
          }
          onChange={(e) => setTopicsRaw(e.target.value)}
          placeholder={'Photosynthesis\nCell structure\nForce and motion'}
          rows={4}
          isDisabled={disabled || saving || micListening}
          pr={2}
        />
      </Box>
      {micListening && (
        <Text fontSize="xs" color="purple.600">
          Listening… pause between topics. Tap mic when done.
        </Text>
      )}
      {micError && <Text fontSize="xs" color="orange.600">{micError}</Text>}

      <Text fontSize="sm" fontWeight="semibold">Exam date</Text>
      <Input
        type="date"
        value={examDate}
        min={new Date().toISOString().slice(0, 10)}
        onChange={(e) => setExamDate(e.target.value)}
        isDisabled={disabled || saving}
      />

      <Text fontSize="sm" fontWeight="semibold">Study hours per day</Text>
      <NumberInput
        min={0.5}
        max={8}
        step={0.5}
        value={hoursPerDay}
        onChange={(_, v) => setHoursPerDay(Number.isFinite(v) ? v : 1)}
        isDisabled={disabled || saving}
      >
        <NumberInputField />
      </NumberInput>

      {preview && (
        <Box fontSize="xs" color="gray.600" p={2} borderWidth="1px" borderRadius="md">
          <Text fontWeight="bold" mb={1}>{preview.length}-day plan ready</Text>
          <Text>Day 1: {preview[0].topics.join(', ')}</Text>
          <Text>Day {preview.length}: {preview[preview.length - 1].focus}</Text>
        </Box>
      )}

      {error && <Text fontSize="xs" color="red.500">{error}</Text>}

      <Button
        colorScheme="purple"
        onClick={() => void submit()}
        isLoading={saving}
        isDisabled={disabled || !preview?.length}
      >
        Create my study schedule
      </Button>
    </VStack>
  );
}
