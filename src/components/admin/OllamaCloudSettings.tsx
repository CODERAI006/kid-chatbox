/**
 * Admin: configure Ollama Cloud — API key and per-capability model routing.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, AlertIcon, Box, Button, FormControl, FormHelperText, FormLabel,
  Heading, HStack, Input, Spinner, Switch, Text, VStack, useToast, Link, Divider,
} from '@/shared/design-system';
import { ollamaCloudApi, type OllamaCloudSettings, type OllamaModelCatalogEntry } from '@/services/admin';
import { OllamaModelTypeField } from './OllamaModelTypeField';

const DEFAULT_MODELS: Record<string, string> = {
  text: 'gpt-oss:120b',
  ocr: 'qwen3-vl:235b-cloud',
  image: 'flux:cloud',
  voice: '',
  pdf: '',
};

export const OllamaCloudSettingsPage: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<OllamaCloudSettings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [models, setModels] = useState<Record<string, string>>(DEFAULT_MODELS);
  const [catalog, setCatalog] = useState<OllamaModelCatalogEntry[]>([]);
  const [apiKeyInput, setApiKeyInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { settings: data } = await ollamaCloudApi.getSettings();
      setSettings(data);
      setEnabled(data.enabled);
      setModels({ ...DEFAULT_MODELS, ...data.models });
      setCatalog(data.modelCatalog || []);
      setApiKeyInput('');
    } catch (err) {
      toast({
        title: 'Failed to load Ollama settings',
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

  const setModel = (typeId: string, value: string) => {
    setModels((prev) => ({ ...prev, [typeId]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: {
        enabled: boolean;
        models: Record<string, string>;
        apiKey?: string;
      } = { enabled, models };
      if (apiKeyInput.trim()) payload.apiKey = apiKeyInput.trim();

      const result = await ollamaCloudApi.updateSettings(payload);
      setSettings(result.settings);
      setModels({ ...DEFAULT_MODELS, ...result.settings.models });
      setApiKeyInput('');
      toast({
        title: 'Settings saved',
        description: result.message || 'Ollama Cloud configuration updated.',
        status: 'success',
        duration: 4000,
      });
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

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await ollamaCloudApi.testConnection();
      toast({
        title: 'Connection OK',
        description: `Mode: ${result.mode}, text model: ${result.model || models.text}. Preview: ${result.preview || '—'}`,
        status: 'success',
        duration: 6000,
      });
    } catch (err) {
      toast({
        title: 'Connection test failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 7000,
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Box py={10} textAlign="center">
        <Spinner size="lg" />
      </Box>
    );
  }

  const entries = catalog.length
    ? catalog
    : Object.entries(DEFAULT_MODELS).map(([id, defaultCloud]) => ({
        id,
        label: id,
        description: '',
        emoji: '⚙️',
        envVar: '',
        implemented: id === 'text' || id === 'ocr',
        defaultCloud,
        defaultLocal: '',
        presets: [],
      }));

  return (
    <VStack align="stretch" spacing={6} maxW="720px">
      <Box>
        <Heading size="md" mb={2}>Ollama Cloud</Heading>
        <Text color="gray.600" fontSize="sm">
          Route AI by capability through{' '}
          <Link href="https://docs.ollama.com/cloud" isExternal color="blue.500">Ollama Cloud</Link>.
          API keys from{' '}
          <Link href="https://ollama.com/settings/keys" isExternal color="blue.500">ollama.com/settings/keys</Link>.
        </Text>
      </Box>

      <Alert status="info" borderRadius="md">
        <AlertIcon />
        Assign a different model per task — text chat, OCR, image, voice, PDF — instead of one model for everything.
      </Alert>

      <FormControl display="flex" alignItems="center">
        <FormLabel htmlFor="ollama-cloud-enabled" mb={0}>Enable Ollama Cloud</FormLabel>
        <Switch
          id="ollama-cloud-enabled"
          isChecked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          colorScheme="blue"
        />
      </FormControl>

      <Box>
        <Heading size="sm" mb={3}>Models by type</Heading>
        <VStack align="stretch" spacing={4}>
          {entries.map((entry) => (
            <OllamaModelTypeField
              key={entry.id}
              entry={entry}
              value={models[entry.id] || ''}
              onChange={(v) => setModel(entry.id, v)}
            />
          ))}
        </VStack>
      </Box>

      <Divider />

      <FormControl>
        <FormLabel>API key</FormLabel>
        <Input
          type="password"
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          placeholder={settings?.hasApiKey ? 'Leave blank to keep current key' : 'Paste Ollama API key'}
          autoComplete="off"
        />
        {settings?.hasApiKey && settings.apiKeyMasked && (
          <FormHelperText>Current key: {settings.apiKeyMasked}</FormHelperText>
        )}
      </FormControl>

      <HStack spacing={3}>
        <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>Save settings</Button>
        <Button variant="outline" onClick={handleTest} isLoading={testing}>Test text connection</Button>
      </HStack>
    </VStack>
  );
};
