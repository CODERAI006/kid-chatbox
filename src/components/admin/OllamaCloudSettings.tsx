/**
 * Admin: configure Ollama Cloud (API key, enable/disable).
 * When enabled, the server routes AI to https://ollama.com/api instead of local Ollama.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Spinner,
  Switch,
  Text,
  VStack,
  useToast,
  Link,
} from '@/shared/design-system';
import { ollamaCloudApi, type OllamaCloudSettings } from '@/services/admin';

export const OllamaCloudSettingsPage: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<OllamaCloudSettings | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [cloudModel, setCloudModel] = useState('gpt-oss:120b');
  const [apiKeyInput, setApiKeyInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { settings: data } = await ollamaCloudApi.getSettings();
      setSettings(data);
      setEnabled(data.enabled);
      setCloudModel(data.cloudModel);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: { enabled: boolean; cloudModel: string; apiKey?: string } = {
        enabled,
        cloudModel: cloudModel.trim() || 'gpt-oss:120b',
      };
      if (apiKeyInput.trim()) {
        payload.apiKey = apiKeyInput.trim();
      }
      const result = await ollamaCloudApi.updateSettings(payload);
      setSettings(result.settings);
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
        description: `Mode: ${result.mode}, model: ${result.model || cloudModel}. Preview: ${result.preview || '—'}`,
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

  return (
    <VStack align="stretch" spacing={6} maxW="720px">
      <Box>
        <Heading size="md" mb={2}>
          Ollama Cloud
        </Heading>
        <Text color="gray.600" fontSize="sm">
          Route quiz generation, study mode, and the learning bot through{' '}
          <Link href="https://docs.ollama.com/cloud" isExternal color="blue.500">
            Ollama Cloud
          </Link>{' '}
          instead of a local <Text as="code" fontSize="sm">ollama serve</Text> instance. Create an API key at{' '}
          <Link href="https://ollama.com/settings/keys" isExternal color="blue.500">
            ollama.com/settings/keys
          </Link>
          .
        </Text>
      </Box>

      <Alert status="info" borderRadius="md">
        <AlertIcon />
        When Ollama Cloud is <strong>off</strong>, the app uses local Ollama (
        <Text as="code" fontSize="sm">OLLAMA_HOST</Text> / port 11434). When <strong>on</strong>, requests go to{' '}
        <Text as="code" fontSize="sm">https://ollama.com/api</Text> with your stored API key.
      </Alert>

      <FormControl display="flex" alignItems="center">
        <FormLabel htmlFor="ollama-cloud-enabled" mb={0}>
          Enable Ollama Cloud
        </FormLabel>
        <Switch
          id="ollama-cloud-enabled"
          isChecked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          colorScheme="blue"
        />
      </FormControl>

      <FormControl>
        <FormLabel>Cloud model</FormLabel>
        <Input
          value={cloudModel}
          onChange={(e) => setCloudModel(e.target.value)}
          placeholder="gpt-oss:120b"
        />
        <FormHelperText>
          Model name for cloud API (see{' '}
          <Link href="https://ollama.com/search?c=cloud" isExternal>
            cloud models
          </Link>
          ).
        </FormHelperText>
      </FormControl>

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
        <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>
          Save settings
        </Button>
        <Button variant="outline" onClick={handleTest} isLoading={testing}>
          Test connection
        </Button>
      </HStack>
    </VStack>
  );
};
