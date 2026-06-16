/**
 * Admin: Facts & Fun — per-grade complexity and daily refresh.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, AlertIcon, Box, Button, Heading, Select, Spinner, Switch,
  Table, Tbody, Td, Th, Thead, Tr, Text, VStack, HStack, useToast,
} from '@/shared/design-system';
import { factsAndFunApi } from '@/services/admin';
import type { DailyFactsGradeSetting } from '@/types/dailyFacts';
import type { WordComplexity } from '@/types/wordOfDay';

const COMPLEXITY_OPTIONS: { value: WordComplexity; label: string }[] = [
  { value: 'basic', label: 'Beginner (Grades 1–3)' },
  { value: 'intermediate', label: 'Intermediate (Grades 4–6)' },
  { value: 'advanced', label: 'Advanced (Grades 7–10)' },
  { value: 'expert', label: 'Expert (Grades 11–12)' },
];

export const FactsAndFunSettingsPage: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [settings, setSettings] = useState<DailyFactsGradeSetting[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await factsAndFunApi.getSettings();
      setSettings(res.settings);
    } catch (err) {
      toast({
        title: 'Failed to load settings',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const updateRow = (grade: string, patch: Partial<DailyFactsGradeSetting>) => {
    setSettings((prev) => prev.map((s) => (s.grade === grade ? { ...s, ...patch } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await factsAndFunApi.updateSettings(settings);
      toast({ title: 'Settings saved', status: 'success', duration: 3000 });
      await load();
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await factsAndFunApi.regenerateToday();
      toast({ title: res.message || 'Regenerated', status: 'success', duration: 4000 });
    } catch (err) {
      toast({
        title: 'Regenerate failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <VStack py={12}>
        <Spinner size="lg" />
        <Text>Loading Facts & Fun settings…</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch" maxW="960px">
      <Box>
        <Heading size="md" mb={2}>Facts & Fun Settings</Heading>
        <Text color="gray.600" fontSize="sm">
          Each enabled grade gets 10 fresh facts per calendar day. The first student in a class
          triggers generation; later opens reuse the cache. Nightly pregeneration runs at 00:20 IST.
        </Text>
      </Box>

      <Alert status="info" borderRadius="md">
        <AlertIcon />
        Facts refresh daily per class — same pattern as Word of the Day.
      </Alert>

      <Box bg="white" p={4} borderRadius="lg" borderWidth={1} overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Grade</Th>
              <Th>Complexity</Th>
              <Th>Enabled</Th>
            </Tr>
          </Thead>
          <Tbody>
            {settings.map((row) => (
              <Tr key={row.grade}>
                <Td fontWeight="medium">{row.grade}</Td>
                <Td>
                  <Select
                    size="sm"
                    value={row.complexity}
                    onChange={(e) =>
                      updateRow(row.grade, { complexity: e.target.value as WordComplexity })
                    }
                    isDisabled={!row.enabled}
                  >
                    {COMPLEXITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </Td>
                <Td>
                  <Switch
                    isChecked={row.enabled}
                    onChange={(e) => updateRow(row.grade, { enabled: e.target.checked })}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <HStack spacing={3}>
        <Button colorScheme="purple" onClick={handleSave} isLoading={saving}>
          Save settings
        </Button>
        <Button
          variant="outline"
          colorScheme="orange"
          onClick={handleRegenerate}
          isLoading={regenerating}
        >
          Regenerate today
        </Button>
      </HStack>
    </VStack>
  );
};
