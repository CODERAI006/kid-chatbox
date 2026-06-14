/**
 * Admin: Education News pipeline — status, manual sync, source overview.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, AlertIcon, Box, Button, Heading, HStack, Spinner, Text, VStack, Badge, useToast,
} from '@/shared/design-system';
import { newsPipelineApi } from '@/services/admin';

export const EducationNewsAdminPage: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof newsPipelineApi.getStatus>> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await newsPipelineApi.getStatus();
      setStatus(data);
    } catch (err) {
      toast({
        title: 'Failed to load pipeline status',
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
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  const handleSync = async (forceRefresh = false) => {
    setSyncing(true);
    try {
      const result = await newsPipelineApi.triggerSync({ forceRefresh });
      if (result.success) {
        toast({
          title: 'News sync started',
          description: 'Running in background — refresh status in a few minutes.',
          status: 'success',
          duration: 5000,
        });
      } else {
        toast({ title: result.message || 'Sync skipped', status: 'warning', duration: 5000 });
      }
      await load();
    } catch (err) {
      toast({
        title: 'Sync failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 6000,
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <VStack py={12}>
        <Spinner size="lg" />
        <Text>Loading education news pipeline…</Text>
      </VStack>
    );
  }

  const run = status?.latestRun;
  const stats = run?.stats_json as { cacheDate?: string; categories?: Record<string, number> } | undefined;

  return (
    <VStack spacing={6} align="stretch" maxW="960px">
      <Box>
        <Heading size="md" mb={2}>Education News Pipeline</Heading>
        <Text color="gray.600" fontSize="sm">
          Nightly job scrapes RSS feeds, enriches stories with AI (summary, quiz, fun facts), and caches them for students.
          Use manual sync after adding sources or when content looks stale.
        </Text>
      </Box>

      <Alert status="info" borderRadius="md">
        <AlertIcon />
        RSS-first (~70% feeds). Playwright is optional — set NEWS_PLAYWRIGHT_ENABLED=true on the server for dynamic pages.
      </Alert>

      <Box bg="white" borderRadius="lg" borderWidth={1} p={5}>
        <HStack spacing={3} mb={4} flexWrap="wrap">
          <Badge colorScheme={status?.isRunning ? 'orange' : 'green'}>
            {status?.isRunning ? 'Sync running' : 'Idle'}
          </Badge>
          <Badge colorScheme="blue">{status?.activeSourceCount ?? 0} active sources</Badge>
          <Badge colorScheme={status?.playwrightEnabled ? 'purple' : 'gray'}>
            Playwright {status?.playwrightEnabled ? 'on' : 'off'}
          </Badge>
        </HStack>

        <HStack spacing={3} mb={4}>
          <Button colorScheme="blue" onClick={() => handleSync(false)} isLoading={syncing} loadingText="Syncing…">
            Run sync now
          </Button>
          <Button variant="outline" onClick={() => handleSync(true)} isLoading={syncing}>
            Force refresh all
          </Button>
          <Button variant="ghost" onClick={load} isDisabled={syncing}>
            Refresh status
          </Button>
        </HStack>

        {run && (
          <VStack align="stretch" spacing={2} fontSize="sm">
            <Text><strong>Last run:</strong> {run.status} · {run.trigger_type}</Text>
            <Text color="gray.600">
              Started {new Date(run.started_at).toLocaleString()}
              {run.finished_at ? ` · Finished ${new Date(run.finished_at).toLocaleString()}` : ''}
            </Text>
            {stats?.cacheDate && <Text>Cache date: {stats.cacheDate}</Text>}
            {stats?.categories && (
              <Text>
                Articles: {Object.entries(stats.categories).map(([k, v]) => `${k}: ${v}`).join(' · ')}
              </Text>
            )}
            {run.error_message && <Text color="red.600">{run.error_message}</Text>}
          </VStack>
        )}
      </Box>

      {status?.sources && status.sources.length > 0 && (
        <Box bg="white" borderRadius="lg" borderWidth={1} p={5}>
          <Heading size="sm" mb={3}>Active RSS sources</Heading>
          <VStack align="stretch" spacing={2} fontSize="sm">
            {status.sources.map((src) => (
              <HStack key={src.id} justify="space-between" borderBottomWidth={1} pb={2}>
                <Text fontWeight="medium">{src.name}</Text>
                <Badge>{src.category}</Badge>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  );
};
