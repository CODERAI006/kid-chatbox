/**
 * Quiz Scheduler Management – Admin Panel
 * Configure automated quiz generation schedules.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Heading, Button, Badge, Spinner,
  Table, Thead, Tbody, Tr, Th, Td, useToast, useColorModeValue,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, FormControl,
  FormLabel, Input, Select, NumberInput, NumberInputField,
  Tooltip, IconButton,
} from '@/shared/design-system';
import { SchedulerTopicFields } from './SchedulerTopicFields';
import { apiClient } from '@/services/api';

const API = '/quiz-scheduler';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Mixed'];
interface SchedulerJob {
  id: string;
  job_name: string;
  frequency_type: 'daily' | 'weekly';
  run_time: string;
  day_of_week: number | null;
  topics?: string[];
  topic_ids?: string[];
  subtopic_ids?: string[];
  sets_per_run?: number;
  timezone?: string;
  question_count: number;
  difficulty: string;
  visibility_start_offset_mins: number;
  visibility_duration_mins: number | null;
  status: 'active' | 'inactive';
  last_run_at: string | null;
  created_at: string;
}

const emptyJob: Omit<SchedulerJob, 'id' | 'last_run_at' | 'created_at'> = {
  job_name: '',
  frequency_type: 'daily',
  run_time: '22:00',
  day_of_week: 1,
  topics: [],
  topic_ids: [],
  subtopic_ids: [],
  sets_per_run: 5,
  timezone: 'Asia/Kolkata',
  question_count: 10,
  difficulty: 'Mixed',
  visibility_start_offset_mins: 0,
  visibility_duration_mins: null,
  status: 'active',
};

export const QuizSchedulerManagement: React.FC = () => {
  const [jobs, setJobs] = useState<SchedulerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [editJob, setEditJob] = useState<Partial<SchedulerJob>>(emptyJob);
  const [isEditing, setIsEditing] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const fetchJobs = useCallback(async () => {
    try {
      const r = await apiClient.get<{ success: boolean; data?: SchedulerJob[]; message?: string }>(`${API}/jobs`);
      const d = r.data;
      if (d.success && d.data) setJobs(d.data);
      else toast({ title: String(d.message || 'Failed to load jobs'), status: 'error' });
    } catch (e: unknown) {
      toast({ title: (e as Error).message || 'Failed to load jobs', status: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const openCreate = () => {
    setEditJob(emptyJob);
    setIsEditing(false);
    onOpen();
  };

  const openEdit = (job: SchedulerJob) => {
    setEditJob({ ...job });
    setIsEditing(true);
    onOpen();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = isEditing
        ? await apiClient.put(`${API}/jobs/${editJob.id}`, editJob)
        : await apiClient.post(`${API}/jobs`, editJob);
      const d = r.data as { success?: boolean; message?: string };
      if (!d.success) throw new Error(d.message);
      toast({ title: isEditing ? 'Job updated' : 'Job created', status: 'success' });
      onClose();
      fetchJobs();
    } catch (e: unknown) {
      toast({ title: (e as Error).message || 'Save failed', status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const r = await apiClient.patch(`${API}/jobs/${id}/toggle`);
      const d = r.data as { success?: boolean; message?: string; data?: SchedulerJob };
      if (!d.success) throw new Error(d.message);
      setJobs((prev) => prev.map((j) => (j.id === id && d.data ? d.data : j)));
    } catch (e: unknown) {
      toast({ title: (e as Error).message || 'Toggle failed', status: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this scheduler job?')) return;
    try {
      const r = await apiClient.delete(`${API}/jobs/${id}`);
      const d = r.data as { success?: boolean; message?: string };
      if (!d.success) throw new Error(d.message);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      toast({ title: 'Job deleted', status: 'info' });
    } catch (e: unknown) {
      toast({ title: (e as Error).message || 'Delete failed', status: 'error' });
    }
  };

  const handleRunNow = async (id: string) => {
    setRunningId(id);
    try {
      const r = await apiClient.post(`${API}/jobs/${id}/run-now`);
      const d = r.data as {
        success?: boolean;
        message?: string;
        data?: { setsCompleted?: number; sets_completed?: number };
      };
      if (!d.success) throw new Error(d.message);
      const sets = d.data?.setsCompleted ?? d.data?.sets_completed;
      toast({
        title: sets != null ? `Generated ${sets} quiz set(s)` : 'Batch generated',
        status: 'success',
        duration: 4000,
      });
      fetchJobs();
    } catch (e: unknown) {
      toast({ title: (e as Error).message || 'Run failed', status: 'error' });
    } finally {
      setRunningId(null);
    }
  };

  if (loading) return <Spinner size="xl" m="auto" display="block" mt={20} />;

  return (
    <Box p={6}>
      <HStack justify="space-between" mb={6}>
        <Heading size="md">⏰ Quiz Scheduler Jobs</Heading>
        <Button colorScheme="blue" onClick={openCreate}>+ New Schedule</Button>
      </HStack>

      <Box bg={cardBg} border="1px" borderColor={borderColor} rounded="lg" overflow="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Job Name</Th><Th>Frequency</Th><Th>Run (IST)</Th>
              <Th>Sets</Th><Th>Qs</Th><Th>Difficulty</Th>
              <Th>Status</Th><Th>Last Run</Th><Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {jobs.length === 0 && (
              <Tr><Td colSpan={8} textAlign="center" py={8} color="gray.500">No jobs yet – create one!</Td></Tr>
            )}
            {jobs.map((j) => (
              <Tr key={j.id}>
                <Td fontWeight="medium">{j.job_name}</Td>
                <Td>
                  {j.frequency_type === 'weekly'
                    ? `Weekly (${DAYS[j.day_of_week ?? 1]})`
                    : 'Daily'}
                </Td>
                <Td>{j.run_time} IST</Td>
                <Td isNumeric>{j.sets_per_run ?? 5}</Td>
                <Td isNumeric>{j.question_count}</Td>
                <Td>{j.difficulty}</Td>
                <Td>
                  <Badge colorScheme={j.status === 'active' ? 'green' : 'gray'}>{j.status}</Badge>
                </Td>
                <Td fontSize="xs" color="gray.500">
                  {j.last_run_at ? new Date(j.last_run_at).toLocaleString() : '—'}
                </Td>
                <Td>
                  <HStack spacing={1}>
                    <Tooltip label="Edit"><IconButton aria-label="edit" icon={<Text>✏️</Text>} size="xs" onClick={() => openEdit(j)} /></Tooltip>
                    <Tooltip label={j.status === 'active' ? 'Pause' : 'Resume'}>
                      <IconButton aria-label="toggle" icon={<Text>{j.status === 'active' ? '⏸' : '▶️'}</Text>} size="xs" onClick={() => handleToggle(j.id)} />
                    </Tooltip>
                    <Tooltip label="Run Now">
                      <IconButton aria-label="run" icon={runningId === j.id ? <Spinner size="xs" /> : <Text>🚀</Text>} size="xs" isDisabled={!!runningId} onClick={() => handleRunNow(j.id)} />
                    </Tooltip>
                    <Tooltip label="Delete"><IconButton aria-label="delete" icon={<Text>🗑️</Text>} size="xs" colorScheme="red" variant="ghost" onClick={() => handleDelete(j.id)} /></Tooltip>
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* Create / Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isEditing ? 'Edit Scheduler Job' : 'New Scheduler Job'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Job Name</FormLabel>
                <Input value={editJob.job_name || ''} onChange={(e) => setEditJob({ ...editJob, job_name: e.target.value })} placeholder="e.g. Daily Math Quiz" />
              </FormControl>
              <HStack>
                <FormControl isRequired>
                  <FormLabel>Frequency</FormLabel>
                  <Select value={editJob.frequency_type} onChange={(e) => setEditJob({ ...editJob, frequency_type: e.target.value as 'daily' | 'weekly' })}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Run Time (IST)</FormLabel>
                  <Input type="time" value={editJob.run_time || '22:00'} onChange={(e) => setEditJob({ ...editJob, run_time: e.target.value })} />
                </FormControl>
              </HStack>
              {editJob.frequency_type === 'weekly' && (
                <FormControl isRequired>
                  <FormLabel>Day of Week</FormLabel>
                  <Select value={editJob.day_of_week ?? 1} onChange={(e) => setEditJob({ ...editJob, day_of_week: Number(e.target.value) })}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </Select>
                </FormControl>
              )}
              <SchedulerTopicFields
                topicIds={editJob.topic_ids || []}
                subtopicIds={editJob.subtopic_ids || []}
                onChange={(topic_ids, subtopic_ids) =>
                  setEditJob({ ...editJob, topic_ids, subtopic_ids, topics: [] })
                }
              />
              <HStack>
                <FormControl isRequired>
                  <FormLabel>Sets per night</FormLabel>
                  <NumberInput min={1} max={10} value={editJob.sets_per_run ?? 5} onChange={(_, v) => setEditJob({ ...editJob, sets_per_run: v })}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Questions per Quiz</FormLabel>
                  <NumberInput min={3} max={30} value={editJob.question_count || 10} onChange={(_, v) => setEditJob({ ...editJob, question_count: v })}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Difficulty</FormLabel>
                  <Select value={editJob.difficulty || 'Mixed'} onChange={(e) => setEditJob({ ...editJob, difficulty: e.target.value })}>
                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </FormControl>
              </HStack>
              <HStack>
                <FormControl>
                  <FormLabel>Visibility Delay (mins after run)</FormLabel>
                  <NumberInput min={0} value={editJob.visibility_start_offset_mins || 0} onChange={(_, v) => setEditJob({ ...editJob, visibility_start_offset_mins: v })}>
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Visible for (mins, blank = forever)</FormLabel>
                  <NumberInput min={0} value={editJob.visibility_duration_mins ?? ''} onChange={(_, v) => setEditJob({ ...editJob, visibility_duration_mins: Number.isNaN(v) ? null : v })}>
                    <NumberInputField placeholder="∞" />
                  </NumberInput>
                </FormControl>
              </HStack>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select value={editJob.status || 'active'} onChange={(e) => setEditJob({ ...editJob, status: e.target.value as 'active' | 'inactive' })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
            <Button colorScheme="blue" isLoading={saving} onClick={handleSave}>
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};
