/**
 * Admin: Puzzle module settings — global config, per-grade daily count, puzzle bank.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, AlertIcon, Box, Button, Heading, Spinner, Switch, Table, Tbody, Td, Th, Thead, Tr,
  Text, VStack, HStack, useToast, Input, Select, Textarea, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalCloseButton, useDisclosure,
} from '@/shared/design-system';
import { puzzleAdminApi } from '@/services/admin';
import type { Puzzle, PuzzleGradeSetting, PuzzleGlobalConfig } from '@/types/puzzle';

export function PuzzleSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [global, setGlobal] = useState<PuzzleGlobalConfig>({
    enabled: true, showOnHomepage: true, defaultGrade: 'Class 5 / Grade 5',
  });
  const [settings, setSettings] = useState<PuzzleGradeSetting[]>([]);
  const [bank, setBank] = useState<Puzzle[]>([]);
  const [editPuzzle, setEditPuzzle] = useState<Puzzle | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await puzzleAdminApi.getSettings();
      setGlobal(res.global);
      setSettings(res.settings);
      const bankRes = await puzzleAdminApi.getBank();
      setBank(bankRes.puzzles);
    } catch (err) {
      toast({ title: 'Failed to load', description: String(err), status: 'error', duration: 5000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await puzzleAdminApi.updateSettings({ global, settings });
      toast({ title: 'Settings saved', status: 'success', duration: 3000 });
    } catch (err) {
      toast({ title: 'Save failed', description: String(err), status: 'error', duration: 5000 });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await puzzleAdminApi.regenerateToday();
      toast({ title: res.message || 'Regenerated', status: 'success', duration: 4000 });
    } catch (err) {
      toast({ title: 'Regenerate failed', description: String(err), status: 'error', duration: 5000 });
    } finally {
      setRegenerating(false);
    }
  };

  const savePuzzle = async () => {
    if (!editPuzzle) return;
    try {
      await puzzleAdminApi.savePuzzle(editPuzzle.id, editPuzzle);
      toast({ title: 'Puzzle updated', status: 'success', duration: 3000 });
      onClose();
      await load();
    } catch (err) {
      toast({ title: 'Save failed', description: String(err), status: 'error', duration: 5000 });
    }
  };

  if (loading) {
    return (
      <VStack py={12}>
        <Spinner size="lg" />
        <Text>Loading puzzle settings…</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch" maxW="1100px">
      <Box>
        <Heading size="md" mb={2}>Puzzle Module Settings</Heading>
        <Text color="gray.600" fontSize="sm">
          Configure daily top puzzles shown on the homepage and dashboard. Each grade gets a fresh set every day.
        </Text>
      </Box>

      <Alert status="info" borderRadius="md">
        <AlertIcon />
        {bank.length} puzzles in the bank across {new Set(bank.map((p) => p.category)).size} categories.
      </Alert>

      <Box bg="white" p={4} borderRadius="lg" borderWidth={1}>
        <Heading size="sm" mb={3}>Global</Heading>
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between">
            <Text fontSize="sm">Module enabled</Text>
            <Switch isChecked={global.enabled} onChange={(e) => setGlobal({ ...global, enabled: e.target.checked })} />
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm">Show on homepage (public)</Text>
            <Switch isChecked={global.showOnHomepage} onChange={(e) => setGlobal({ ...global, showOnHomepage: e.target.checked })} />
          </HStack>
          <HStack>
            <Text fontSize="sm" minW="140px">Default grade (homepage)</Text>
            <Select
              size="sm"
              maxW="280px"
              value={global.defaultGrade}
              onChange={(e) => setGlobal({ ...global, defaultGrade: e.target.value })}
            >
              {settings.map((s) => (
                <option key={s.grade} value={s.grade}>{s.grade}</option>
              ))}
            </Select>
          </HStack>
        </VStack>
      </Box>

      <Box bg="white" p={4} borderRadius="lg" borderWidth={1} overflowX="auto">
        <Heading size="sm" mb={3}>Per-grade daily count</Heading>
        <Table size="sm">
          <Thead>
            <Tr><Th>Grade</Th><Th>Enabled</Th><Th>Daily puzzles</Th></Tr>
          </Thead>
          <Tbody>
            {settings.map((s) => (
              <Tr key={s.grade}>
                <Td>{s.grade}</Td>
                <Td>
                  <Switch
                    isChecked={s.enabled}
                    onChange={(e) => setSettings((prev) => prev.map((r) => r.grade === s.grade ? { ...r, enabled: e.target.checked } : r))}
                  />
                </Td>
                <Td>
                  <Input
                    type="number"
                    size="sm"
                    w="70px"
                    min={1}
                    max={20}
                    value={s.dailyCount}
                    onChange={(e) => setSettings((prev) => prev.map((r) => r.grade === s.grade ? { ...r, dailyCount: Number(e.target.value) } : r))}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <HStack>
        <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>Save settings</Button>
        <Button variant="outline" onClick={handleRegenerate} isLoading={regenerating}>Regenerate today</Button>
      </HStack>

      <Box bg="white" p={4} borderRadius="lg" borderWidth={1} overflowX="auto">
        <Heading size="sm" mb={3}>Puzzle bank (edit)</Heading>
        <Table size="sm">
          <Thead>
            <Tr><Th>ID</Th><Th>Type</Th><Th>Class</Th><Th>Difficulty</Th><Th></Th></Tr>
          </Thead>
          <Tbody>
            {bank.slice(0, 50).map((p) => (
              <Tr key={p.id}>
                <Td>{p.id}</Td>
                <Td>{p.category} · {p.puzzleType}</Td>
                <Td>{p.classFrom}–{p.classTo}</Td>
                <Td>{p.difficulty}</Td>
                <Td>
                  <Button size="xs" onClick={() => { setEditPuzzle(p); onOpen(); }}>Edit</Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        {bank.length > 50 && <Text fontSize="xs" color="gray.500" mt={2}>Showing first 50 of {bank.length}</Text>}
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit puzzle {editPuzzle?.id}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {editPuzzle && (
              <VStack spacing={3} align="stretch">
                <Textarea value={editPuzzle.question} onChange={(e) => setEditPuzzle({ ...editPuzzle, question: e.target.value })} rows={3} />
                <Input value={String(editPuzzle.answer)} onChange={(e) => setEditPuzzle({ ...editPuzzle, answer: e.target.value })} placeholder="Answer" />
                <Textarea value={editPuzzle.explanation} onChange={(e) => setEditPuzzle({ ...editPuzzle, explanation: e.target.value })} rows={3} placeholder="Explanation" />
                <Button colorScheme="blue" onClick={savePuzzle}>Save puzzle</Button>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
