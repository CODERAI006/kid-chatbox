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
  CheckboxGroup, Checkbox, Stack, Tooltip, IconButton,
} from '@/shared/design-system';

const API = '/api/quiz-scheduler';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Mixed'];
const DEFAULT_TOPICS = [
  'Mathematics', 'Science', 'English', 'History', 'Geography',
  'General Knowledge', 'Current Affairs', 'Computer Science',
];

interface SchedulerJob {
  id: string;
  job_name: string;
  frequency_type: 'daily' | 'weekly';
  run_time: string;
  day_of_week: number | null;
  topics: string[];
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
  run_time: '08:00',
  day_of_week: 1,
  topics: [],
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

  const authHeader = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
  });

  /** Safely parse JSON from a fetch response; throws a clear error if HTML is returned. */
  const safeJson = async (r: Response) => {
    const text = await r.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Server returned unexpected response (status ${r.status}). Check backend logs.`);
    }
  };

  const fetchJobs = useCallback(async () => {
    try {
      const r = await fetch(`${API}/jobs`, { headers: authHeader() });
      const d = await safeJson(r);
      if (d.success) setJobs(d.data);
      else toast({ title: d.message || 'Failed to load jobs', status: 'error' });
    } catch (e: unknown) {
      toast({ title: (e as Error).message || 'Failed to load jobs', status: 'error' });
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

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
      const url = isEditing ? `${API}/jobs/${editJob.id}` : `${API}/jobs`;
      const method = isEditing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: authHeader(), body: JSON.stringify(editJob) });
      const d = await safeJson(r);
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
      const r = await fetch(`${API}/jobs/${id}/toggle`, { method: 'PATCH', headers: authHeader() });
      const d = await safeJson(r);
      if (!d.success) throw new Error(d.message);
      setJobs((prev) => prev.map((j) => (j.id === id ? d.data : j)));
    } catch (e: unknown) {
      toast({ title: (e as Error).message || 'Toggle failed', status: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this scheduler job?')) return;
    try {
      const r = await fetch(`${API}/jobs/${id}`, { method: 'DELETE', headers: authHeader() });
      const d = await safeJson(r);
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
      const r = await fetch(`${API}/jobs/${id}/run-now`, { method: 'POST', headers: authHeader() });
      const d = await safeJson(r);
      if (!d.success) throw new Error(d.message);
      toast({ title: 'Quiz generated successfully!', status: 'success', duration: 4000 });
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
              <Th>Job Name</Th><Th>Frequency</Th><Th>Run Time (UTC)</Th>
              <Th>Topics</Th><Th>Qs</Th><Th>Difficulty</Th>
              <Th>Status</Th><Th>Last Run</Th><Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {jobs.length === 0 && (
              <Tr><Td colSpan={9} textAlign="center" py={8} color="gray.500">No jobs yet – create one!</Td></Tr>
            )}
            {jobs.map((j) => (
              <Tr key={j.id}>
                <Td fontWeight="medium">{j.job_name}</Td>
                <Td>
                  {j.frequency_type === 'weekly'
                    ? `Weekly (${DAYS[j.day_of_week ?? 1]})`
                    : 'Daily'}
                </Td>
                <Td>{j.run_time} UTC</Td>
                <Td maxW="160px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  <Tooltip label={j.topics.join(', ')}>
                    <Text isTruncated>{j.topics.join(', ')}</Text>
                  </Tooltip>
                </Td>
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
                  <FormLabel>Run Time (UTC)</FormLabel>
                  <Input type="time" value={editJob.run_time || '08:00'} onChange={(e) => setEditJob({ ...editJob, run_time: e.target.value })} />
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
              <FormControl isRequired>
                <FormLabel>Topics</FormLabel>
                <CheckboxGroup value={editJob.topics || []} onChange={(v) => setEditJob({ ...editJob, topics: v as string[] })}>
                  <Stack direction="row" flexWrap="wrap" spacing={3}>
                    {DEFAULT_TOPICS.map((t) => <Checkbox key={t} value={t}>{t}</Checkbox>)}
                  </Stack>
                </CheckboxGroup>
              </FormControl>
              <HStack>
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
