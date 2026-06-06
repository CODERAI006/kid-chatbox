/**
 * Bulk Schedule Tests — apply one schedule window to many quizzes at once.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, VStack, HStack, Heading, Text, Button, Badge, Checkbox, Divider,
  FormControl, FormLabel, Input, Textarea, useToast, Progress, Alert, AlertIcon,
  AlertDescription, SimpleGrid,
} from '@/shared/design-system';
import { Quiz, scheduledTestsApi } from '@/services/admin';
import { getErrorMessage } from '@/services/api';
import {
  applySchedulePreset, emptyScheduleForm, SCHEDULE_PRESET_OPTIONS, type ScheduleFormData,
  validateScheduleForm, withVisibleFrom,
} from './scheduleTestUtils';
import { ScheduleAudienceFields } from './ScheduleAudienceFields';

interface BulkScheduleTestsProps {
  quizzes: Quiz[];
  plans: Array<{ id: string; name: string }>;
  preselectedQuizIds?: string[];
  onComplete?: () => void;
}

export const BulkScheduleTests: React.FC<BulkScheduleTestsProps> = ({
  quizzes,
  plans,
  preselectedQuizIds = [],
  onComplete,
}) => {
  const toast = useToast();
  const activeQuizzes = useMemo(() => quizzes.filter((q) => q.isActive), [quizzes]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<ScheduleFormData>(() =>
    applySchedulePreset('tomorrowMorning', emptyScheduleForm())
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ created: number; failed: number; errors: string[] } | null>(null);

  useEffect(() => {
    if (preselectedQuizIds.length > 0) {
      setSelected(new Set(preselectedQuizIds.filter((id) => activeQuizzes.some((q) => q.id === id))));
    }
  }, [preselectedQuizIds, activeQuizzes]);

  useEffect(() => {
    if (plans.length > 0 && form.planIds.length === 0) {
      setForm((f) => ({ ...f, planIds: plans.map((p) => p.id) }));
    }
  }, [plans, form.planIds.length]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(activeQuizzes.map((q) => q.id)));
  const selectLibrary = () =>
    setSelected(new Set(activeQuizzes.filter((q) => q.inLibrary).map((q) => q.id)));
  const clearAll = () => setSelected(new Set());

  const handleBulkSchedule = async () => {
    const ids = [...selected];
    if (ids.length === 0) {
      toast({ title: 'Select at least one quiz', status: 'warning', duration: 3000 });
      return;
    }
    const validationError = validateScheduleForm({ ...form, quizId: ids[0] }, false);
    if (validationError) {
      toast({ title: validationError, status: 'error', duration: 4000 });
      return;
    }

    setUploading(true);
    setProgress(0);
    setResult(null);

    try {
      const res = await scheduledTestsApi.createBulkScheduledTests({
        quizIds: ids,
        scheduledFor: form.scheduledFor,
        visibleFrom: form.visibleFrom,
        visibleUntil: form.visibleUntil || undefined,
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes, 10) : undefined,
        planIds: form.planIds,
        userIds: form.userIds,
        instructions: form.instructions || undefined,
      });
      setResult({ created: res.created, failed: res.failed, errors: res.errors.map((e) => `${e.name}: ${e.reason}`) });
      toast({
        title: 'Bulk schedule complete',
        description: `${res.created} scheduled · ${res.failed} failed`,
        status: res.failed > 0 ? 'warning' : 'success',
        duration: 5000,
      });
      if (res.created > 0) onComplete?.();
    } catch (err) {
      toast({ title: 'Bulk schedule failed', description: getErrorMessage(err), status: 'error', duration: 5000 });
    } finally {
      setUploading(false);
      setProgress(100);
    }
  };

  return (
    <Box border="1px" borderColor="green.200" borderRadius="lg" p={4} bg="green.50">
      <VStack align="stretch" spacing={4}>
        <Box>
          <Heading size="sm" color="gray.700">📅 Bulk Schedule Tests</Heading>
          <Text fontSize="sm" color="gray.600" mt={1}>
            Pick multiple quizzes and apply the same open window, duration, and audience in one go.
          </Text>
        </Box>

        <HStack spacing={2} flexWrap="wrap">
          <Button size="xs" variant="outline" onClick={selectAll}>Select all</Button>
          <Button size="xs" variant="outline" onClick={selectLibrary}>Library quizzes</Button>
          <Button size="xs" variant="ghost" onClick={clearAll}>Clear</Button>
          <Badge colorScheme="blue">{selected.size} selected</Badge>
        </HStack>

        <Box maxH="220px" overflowY="auto" bg="white" borderRadius="md" border="1px" borderColor="gray.200" p={2}>
          <VStack align="stretch" spacing={1}>
            {activeQuizzes.length === 0 && (
              <Text fontSize="sm" color="gray.500" py={4} textAlign="center">No active quizzes available.</Text>
            )}
            {activeQuizzes.map((q) => (
              <Checkbox
                key={q.id}
                isChecked={selected.has(q.id)}
                onChange={() => toggle(q.id)}
                size="sm"
              >
                <HStack spacing={2} flexWrap="wrap">
                  <Text fontSize="sm">{q.name}</Text>
                  {q.inLibrary && <Badge colorScheme="teal" fontSize="xs">Library</Badge>}
                  {q.gradeLevel && <Badge fontSize="xs">{q.gradeLevel}</Badge>}
                </HStack>
              </Checkbox>
            ))}
          </VStack>
        </Box>

        <Divider />

        <HStack spacing={2} flexWrap="wrap">
          <Text fontSize="sm" fontWeight="medium">Quick presets:</Text>
          {SCHEDULE_PRESET_OPTIONS.map(({ key, label }) => (
            <Button
              key={key}
              size="xs"
              variant="outline"
              colorScheme="blue"
              onClick={() => setForm((f) => applySchedulePreset(key, f))}
            >
              {label}
            </Button>
          ))}
        </HStack>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
          <FormControl isRequired>
            <FormLabel fontSize="sm">Students can start</FormLabel>
            <Input
              type="datetime-local"
              size="sm"
              value={form.visibleFrom}
              onChange={(e) => setForm((f) => withVisibleFrom(f, e.target.value))}
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Access closes (optional)</FormLabel>
            <Input
              type="datetime-local"
              size="sm"
              value={form.visibleUntil}
              onChange={(e) => setForm({ ...form, visibleUntil: e.target.value })}
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Time limit per attempt (minutes)</FormLabel>
            <Input
              type="number"
              size="sm"
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
              placeholder="60"
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Instructions (optional)</FormLabel>
            <Textarea
              size="sm"
              rows={2}
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="Shown to students before they begin"
            />
          </FormControl>
        </SimpleGrid>

        <ScheduleAudienceFields
          plans={plans}
          planIds={form.planIds}
          onPlanIdsChange={(planIds) => setForm({ ...form, planIds })}
        />

        {uploading && <Progress value={progress} size="sm" colorScheme="green" hasStripe isAnimated />}

        {result && (
          <Alert status={result.failed > 0 ? 'warning' : 'success'} borderRadius="md">
            <AlertIcon />
            <AlertDescription fontSize="sm">
              {result.created} test(s) scheduled
              {result.failed > 0 && ` · ${result.failed} failed`}
              {result.errors.length > 0 && (
                <VStack align="start" mt={2} spacing={0}>
                  {result.errors.map((e, i) => <Text key={i} fontSize="xs">{e}</Text>)}
                </VStack>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Button
          colorScheme="green"
          isLoading={uploading}
          loadingText="Scheduling…"
          onClick={handleBulkSchedule}
          isDisabled={selected.size === 0}
        >
          Schedule {selected.size || ''} Test{selected.size !== 1 ? 's' : ''}
        </Button>
      </VStack>
    </Box>
  );
};

export default BulkScheduleTests;
