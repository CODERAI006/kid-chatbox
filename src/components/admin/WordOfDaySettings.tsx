/**
 * Admin: Word of the Day — per-grade complexity, weekly themes, and feature toggles.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, AlertIcon, Box, Button, Heading, Select, Spinner, Switch,
  Table, Tbody, Td, Th, Thead, Tr, Text, VStack, HStack, Badge,
  SimpleGrid, Divider, useToast,
} from '@/shared/design-system';
import { wordOfDayApi } from '@/services/admin';
import { WORDS_PER_DAY } from '@/constants/wordOfDay';
import type {
  WordOfDayGradeSetting, WordComplexity, WordOfDayConfig,
  WeeklyThemeInfo, GradeCategoryInfo,
} from '@/types/wordOfDay';

const COMPLEXITY_OPTIONS: { value: WordComplexity; label: string }[] = [
  { value: 'basic', label: 'Beginner (Grades 1–3)' },
  { value: 'intermediate', label: 'Intermediate (Grades 4–6)' },
  { value: 'advanced', label: 'Advanced (Grades 7–10)' },
  { value: 'expert', label: 'Expert (Grades 11–12)' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const WordOfDaySettingsPage: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [settings, setSettings] = useState<WordOfDayGradeSetting[]>([]);
  const [config, setConfig] = useState<WordOfDayConfig | null>(null);
  const [weeklyThemes, setWeeklyThemes] = useState<WeeklyThemeInfo[]>([]);
  const [gradeCategories, setGradeCategories] = useState<Record<string, GradeCategoryInfo>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, configRes] = await Promise.all([
        wordOfDayApi.getSettings(),
        wordOfDayApi.getConfig(),
      ]);
      setSettings(settingsRes.settings);
      setConfig(configRes.config);
      setWeeklyThemes(configRes.weeklyThemes);
      setGradeCategories(configRes.gradeCategories);
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
      if (config) await wordOfDayApi.updateConfig(config);
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

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await wordOfDayApi.regenerateToday();
      toast({ title: res.message || 'Regenerated', status: 'success', duration: 4000 });
    } catch (err) {
      toast({
        title: 'Regenerate failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error', duration: 5000,
      });
    } finally {
      setRegenerating(false);
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
    <VStack spacing={6} align="stretch" maxW="960px">
      <Box>
        <Heading size="md" mb={2}>Word of the Day Settings</Heading>
        <Text color="gray.600" fontSize="sm">
          Each grade gets {WORDS_PER_DAY} themed words per day with simple meanings, examples,
          synonyms, antonyms, a fun challenge, and a quiz. Expressions match the same level.
        </Text>
      </Box>

      {config && (
        <Box bg="white" p={4} borderRadius="lg" borderWidth={1}>
          <Heading size="sm" mb={3}>Feature toggles</Heading>
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Box>
                <Text fontWeight="medium">Weekly themes</Text>
                <Text fontSize="xs" color="gray.500">Group words by Mon–Sun topic (Science, Nature, etc.)</Text>
              </Box>
              <Switch
                isChecked={config.weeklyThemesEnabled}
                onChange={(e) => setConfig({ ...config, weeklyThemesEnabled: e.target.checked })}
                colorScheme="purple"
              />
            </HStack>
            <HStack justify="space-between">
              <Box>
                <Text fontWeight="medium">Daily quiz</Text>
                <Text fontSize="xs" color="gray.500">Antonym/synonym quiz on word detail page</Text>
              </Box>
              <Switch
                isChecked={config.showQuiz}
                onChange={(e) => setConfig({ ...config, showQuiz: e.target.checked })}
                colorScheme="purple"
              />
            </HStack>
            <HStack justify="space-between">
              <Box>
                <Text fontWeight="medium">Fun challenge</Text>
                <Text fontSize="xs" color="gray.500">"Use this word in a sentence today" prompt</Text>
              </Box>
              <Switch
                isChecked={config.showFunChallenge}
                onChange={(e) => setConfig({ ...config, showFunChallenge: e.target.checked })}
                colorScheme="purple"
              />
            </HStack>
          </VStack>
        </Box>
      )}

      {weeklyThemes.length > 0 && (
        <Box bg="purple.50" p={4} borderRadius="lg" borderWidth={1} borderColor="purple.100">
          <Heading size="sm" mb={3} color="purple.800">Weekly theme schedule</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
            {weeklyThemes.map((t) => (
              <HStack key={t.key} align="start" spacing={2}>
                <Badge colorScheme="purple" minW="72px">{DAY_NAMES[t.day]}</Badge>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold">{t.label}</Text>
                  <Text fontSize="xs" color="gray.600">{t.examples.slice(0, 3).join(', ')}</Text>
                </Box>
              </HStack>
            ))}
          </SimpleGrid>
        </Box>
      )}

      <Alert status="info" borderRadius="md">
        <AlertIcon />
        Words are age-appropriate per class. Disabled grades will not receive daily vocabulary.
      </Alert>

      <Box overflowX="auto" bg="white" borderRadius="lg" borderWidth={1}>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Grade / Class</Th>
              <Th>Category</Th>
              <Th>Complexity</Th>
              <Th>Enabled</Th>
            </Tr>
          </Thead>
          <Tbody>
            {settings.map((row) => {
              const cat = gradeCategories[row.grade];
              return (
                <Tr key={row.grade}>
                  <Td fontWeight="medium">{row.grade}</Td>
                  <Td>
                    {cat && (
                      <VStack align="start" spacing={0}>
                        <Badge colorScheme="blue" fontSize="2xs">{cat.tier}</Badge>
                        <Text fontSize="xs" color="gray.500">{cat.focus}</Text>
                      </VStack>
                    )}
                  </Td>
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
              );
            })}
          </Tbody>
        </Table>
      </Box>

      <HStack spacing={3} flexWrap="wrap">
        <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>
          Save Settings
        </Button>
        <Button variant="outline" colorScheme="orange" onClick={handleRegenerate} isLoading={regenerating}>
          Regenerate Today
        </Button>
      </HStack>

      <Divider />
      <Text fontSize="xs" color="gray.500">
        Regenerate clears today&apos;s cache and rebuilds vocabulary for all enabled grades
        (uses AI if configured, otherwise fallback word banks).
      </Text>
    </VStack>
  );
};
