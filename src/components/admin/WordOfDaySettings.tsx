/**
 * Admin: configure Word of the Day complexity per grade/class.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, AlertIcon, Box, Button, Heading, Select, Spinner, Switch,
  Table, Tbody, Td, Th, Thead, Tr, Text, VStack, useToast,
} from '@/shared/design-system';
import { wordOfDayApi } from '@/services/admin';
import type { WordOfDayGradeSetting, WordComplexity } from '@/types/wordOfDay';

const COMPLEXITY_OPTIONS: { value: WordComplexity; label: string }[] = [
  { value: 'basic', label: 'Basic (younger classes)' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced (older classes)' },
];

export const WordOfDaySettingsPage: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<WordOfDayGradeSetting[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { settings: data } = await wordOfDayApi.getSettings();
      setSettings(data);
    } catch (err) {
      toast({
        title: 'Failed to load settings',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error', duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const updateRow = (grade: string, patch: Partial<WordOfDayGradeSetting>) => {
    setSettings((prev) => prev.map((s) => (s.grade === grade ? { ...s, ...patch } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await wordOfDayApi.updateSettings(settings);
      toast({ title: 'Settings saved', status: 'success', duration: 3000 });
      await load();
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error', duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <VStack py={12}>
        <Spinner size="lg" />
        <Text>Loading Word of the Day settings…</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch" maxW="900px">
      <Box>
        <Heading size="md" mb={2}>Word of the Day Settings</Heading>
        <Text color="gray.600" fontSize="sm">
          Set vocabulary complexity per class. Each grade gets 3 words per day
          plus 5 idiomatic expressions matched to the same level.
        </Text>
      </Box>

      <Alert status="info" borderRadius="md">
        <AlertIcon />
        Basic uses simpler words; Intermediate uses broader vocabulary; Advanced uses SAT-level words.
      </Alert>

      <Box overflowX="auto" bg="white" borderRadius="lg" borderWidth={1}>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Grade / Class</Th>
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
                    onChange={(e) => updateRow(row.grade, { complexity: e.target.value as WordComplexity })}
                  >
                    {COMPLEXITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </Td>
                <Td>
                  <Switch
                    isChecked={row.enabled}
                    onChange={(e) => updateRow(row.grade, { enabled: e.target.checked })}
                    colorScheme="purple"
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Button colorScheme="blue" onClick={handleSave} isLoading={saving} alignSelf="flex-start">
        Save Settings
      </Button>
    </VStack>
  );
};
