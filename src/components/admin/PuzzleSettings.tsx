/**
 * Admin: Puzzle module — settings, types catalog, web scrape, bank edit.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, AlertIcon, Box, Button, Heading, Spinner, Switch, Table, Tbody, Td, Th, Thead, Tr,
  Text, VStack, HStack, useToast, Input, Select, Textarea, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalBody, ModalCloseButton, useDisclosure, Tabs, TabList, Tab, TabPanels, TabPanel,
} from '@/shared/design-system';
import { puzzleAdminApi } from '@/services/admin';
import type { Puzzle, PuzzleGradeSetting, PuzzleGlobalConfig, PuzzleTypeMeta } from '@/types/puzzle';
import { PuzzleTypesCatalog } from './puzzle/PuzzleTypesCatalog';
import { PuzzleScrapePanel } from './puzzle/PuzzleScrapePanel';
import { DAILY_PUZZLE_COUNT } from '@/constants/puzzles';

export function PuzzleSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [previewGrade, setPreviewGrade] = useState('Class 5 / Grade 5');
  const [global, setGlobal] = useState<PuzzleGlobalConfig>({
    enabled: true, showOnHomepage: true, defaultGrade: 'Class 5 / Grade 5',
  });
  const [settings, setSettings] = useState<PuzzleGradeSetting[]>([]);
  const [types, setTypes] = useState<PuzzleTypeMeta[]>([]);
  const [bank, setBank] = useState<Puzzle[]>([]);
  const [editPuzzle, setEditPuzzle] = useState<Puzzle | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await puzzleAdminApi.getSettings();
      setGlobal(res.global);
      setSettings(res.settings);
      setTypes(res.types || []);
      setPreviewGrade(res.global.defaultGrade);
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

  const handleGenerateAi = async () => {
    setGeneratingAi(true);
    try {
      const res = await puzzleAdminApi.generateAi(previewGrade);
      setLastPrompt(res.generationPrompt || null);
      toast({
        title: res.message || 'AI + scrape complete',
        description: res.daily?.categoryBreakdown
          ? `${Object.keys(res.daily.categoryBreakdown).length} categories covered`
          : undefined,
        status: 'success',
        duration: 5000,
      });
      await load();
    } catch (err) {
      toast({ title: 'Generation failed', description: String(err), status: 'error', duration: 5000 });
    } finally {
      setGeneratingAi(false);
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
        <Heading size="md" mb={2}>Puzzle Module</Heading>
        <Text color="gray.600" fontSize="sm">
          {DAILY_PUZZLE_COUNT} smart questions per class — 10 brain teasers/riddles/critical thinking + 10 subject puzzles.
        </Text>
      </Box>

      <Tabs colorScheme="blue" variant="enclosed">
        <TabList flexWrap="wrap">
          <Tab>Settings</Tab>
          <Tab>Puzzle types</Tab>
          <Tab>Web import</Tab>
          <Tab>Bank</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            <VStack spacing={4} align="stretch">
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                {bank.length} puzzles in bank · default {DAILY_PUZZLE_COUNT}/day per grade
              </Alert>
              <Box bg="white" p={4} borderRadius="lg" borderWidth={1}>
                <Heading size="sm" mb={3}>Global</Heading>
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between">
                    <Text fontSize="sm">Module enabled</Text>
                    <Switch isChecked={global.enabled} onChange={(e) => setGlobal({ ...global, enabled: e.target.checked })} />
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm">Show on homepage</Text>
                    <Switch isChecked={global.showOnHomepage} onChange={(e) => setGlobal({ ...global, showOnHomepage: e.target.checked })} />
                  </HStack>
                  <HStack>
                    <Text fontSize="sm" minW="140px">Default grade (homepage)</Text>
                    <Select size="sm" maxW="280px" value={global.defaultGrade}
                      onChange={(e) => setGlobal({ ...global, defaultGrade: e.target.value })}>
                      {settings.map((s) => <option key={s.grade} value={s.grade}>{s.grade}</option>)}
                    </Select>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm">AI generation (Ollama)</Text>
                    <Switch isChecked={global.aiGenerationEnabled !== false}
                      onChange={(e) => setGlobal({ ...global, aiGenerationEnabled: e.target.checked })} />
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm">Auto web scrape on daily build</Text>
                    <Switch isChecked={global.autoScrapeEnabled !== false}
                      onChange={(e) => setGlobal({ ...global, autoScrapeEnabled: e.target.checked })} />
                  </HStack>
                  <HStack flexWrap="wrap" gap={2}>
                    <Text fontSize="sm" minW="140px">Generate for grade</Text>
                    <Select size="sm" maxW="280px" value={previewGrade}
                      onChange={(e) => setPreviewGrade(e.target.value)}>
                      {settings.map((s) => <option key={s.grade} value={s.grade}>{s.grade}</option>)}
                    </Select>
                    <Button size="sm" colorScheme="purple" onClick={handleGenerateAi} isLoading={generatingAi}>
                      Generate AI + scrape
                    </Button>
                  </HStack>
                  {lastPrompt && (
                    <Box>
                      <Text fontSize="xs" fontWeight="bold" mb={1}>Last batch prompt (admin only)</Text>
                      <Textarea value={lastPrompt} readOnly rows={6} fontSize="xs" bg="gray.50" />
                    </Box>
                  )}
                </VStack>
              </Box>
              <Box bg="white" p={4} borderRadius="lg" borderWidth={1} overflowX="auto">
                <Heading size="sm" mb={3}>Per-grade daily count</Heading>
                <Table size="sm">
                  <Thead><Tr><Th>Grade</Th><Th>Enabled</Th><Th>Daily count</Th></Tr></Thead>
                  <Tbody>
                    {settings.map((s) => (
                      <Tr key={s.grade}>
                        <Td>{s.grade}</Td>
                        <Td>
                          <Switch isChecked={s.enabled}
                            onChange={(e) => setSettings((prev) => prev.map((r) => r.grade === s.grade ? { ...r, enabled: e.target.checked } : r))} />
                        </Td>
                        <Td>
                          <Input type="number" size="sm" w="70px" min={20} max={30} value={s.dailyCount}
                            onChange={(e) => setSettings((prev) => prev.map((r) => r.grade === s.grade ? { ...r, dailyCount: Number(e.target.value) } : r))} />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
              <HStack>
                <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>Save</Button>
                <Button variant="outline" onClick={handleRegenerate} isLoading={regenerating}>Regenerate today</Button>
              </HStack>
            </VStack>
          </TabPanel>
          <TabPanel px={0}>
            <PuzzleTypesCatalog types={types} />
          </TabPanel>
          <TabPanel px={0}>
            <PuzzleScrapePanel onComplete={load} />
          </TabPanel>
          <TabPanel px={0}>
            <Box bg="white" p={4} borderRadius="lg" borderWidth={1} overflowX="auto">
              <Table size="sm">
                <Thead><Tr><Th>ID</Th><Th>Category</Th><Th>Source</Th><Th>Skill</Th><Th></Th></Tr></Thead>
                <Tbody>
                  {bank.slice(0, 80).map((p) => (
                    <Tr key={p.id}>
                      <Td fontSize="xs">{p.id}</Td>
                      <Td fontSize="xs">{p.category} · {p.puzzleType}</Td>
                      <Td fontSize="xs">{p.source || 'seed'}</Td>
                      <Td fontSize="xs" maxW="180px" isTruncated>{p.skillArea || '—'}</Td>
                      <Td><Button size="xs" onClick={() => { setEditPuzzle(p); onOpen(); }}>Edit</Button></Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {bank.length > 80 && <Text fontSize="xs" color="gray.500" mt={2}>Showing 80 of {bank.length}</Text>}
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay /><ModalContent>
          <ModalHeader>Edit {editPuzzle?.id}</ModalHeader><ModalCloseButton />
          <ModalBody pb={6}>
            {editPuzzle && (
              <VStack spacing={3} align="stretch">
                {editPuzzle.skillArea && (
                  <Text fontSize="xs" color="teal.600">🎯 Skill: {editPuzzle.skillArea}</Text>
                )}
                <Text fontSize="xs" color="gray.500">Source: {editPuzzle.source || 'seed'}</Text>
                <Textarea value={editPuzzle.question} onChange={(e) => setEditPuzzle({ ...editPuzzle, question: e.target.value })} rows={4} />
                <Input value={String(editPuzzle.answer)} onChange={(e) => setEditPuzzle({ ...editPuzzle, answer: e.target.value })} />
                <Textarea value={editPuzzle.explanation} onChange={(e) => setEditPuzzle({ ...editPuzzle, explanation: e.target.value })} rows={3} />
                {editPuzzle.generationPrompt && (
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" mb={1}>Generation prompt</Text>
                    <Textarea value={editPuzzle.generationPrompt} readOnly rows={5} fontSize="xs" bg="gray.50" />
                  </Box>
                )}
                <Button colorScheme="blue" onClick={savePuzzle}>Save</Button>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
