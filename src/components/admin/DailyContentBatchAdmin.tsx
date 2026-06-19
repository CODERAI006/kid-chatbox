/**
 * Admin: Daily content batch jobs — schedule overview, manual trigger, run history.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, AlertIcon, Badge, Box, Button, Heading, HStack, Input, Spinner,
  Table, Tbody, Td, Text, Th, Thead, Tr, VStack, useToast,
} from '@/shared/design-system';
import { dailyContentBatchApi } from '@/services/admin';
import type {
  DailyContentBatchJob,
  DailyContentBatchOverview,
  DailyContentBatchRun,
  DailyContentGradeCacheStatus,
} from '@/types/dailyContentBatch';

function statusColor(status: string): string {
  if (status === 'completed') return 'green';
  if (status === 'running') return 'orange';
  if (status === 'failed') return 'red';
  return 'gray';
}

function formatWhen(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

/** PG date/timestamp → IST YYYY-MM-DD (avoids UTC off-by-one in UI). */
function formatTargetDate(run: DailyContentBatchRun): string {
  const fromStats = run.stats_json?.targetDate;
  if (fromStats && /^\d{4}-\d{2}-\d{2}$/.test(fromStats)) return fromStats;
  const raw = run.target_date;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (raw) {
    return new Date(raw).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }
  return '—';
}

function runSummary(run: DailyContentBatchRun): string {
  const s = run.stats_json;
  if (!s) return run.error_message || '—';
  const parts: string[] = [];
  if (s.wordOfDay) {
    const w = s.wordOfDay;
    parts.push(
      w.built ? `WOTD +${w.built}` : `WOTD cached (${w.total ?? 0} grades)`,
    );
  }
  if (s.facts) {
    const f = s.facts;
    parts.push(f.built ? `Facts +${f.built}` : `Facts cached (${f.total ?? 0} grades)`);
  }
  if (s.news && !s.news.skipped) parts.push(`News ${s.news.built ?? 0}`);
  return parts.join(' · ') || '—';
}

function CacheTable({
  title,
  rows,
}: {
  title: string;
  rows: DailyContentGradeCacheStatus[];
}) {
  if (!rows.length) return null;
  return (
    <Box bg="white" borderRadius="lg" borderWidth={1} overflowX="auto">
      <Box p={4} borderBottomWidth={1}>
        <Heading size="sm">{title}</Heading>
      </Box>
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Grade</Th>
            <Th isNumeric>Users</Th>
            <Th>Word of Day</Th>
            <Th>Facts &amp; Fun</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((g) => (
            <Tr key={g.grade}>
              <Td fontWeight="medium">{g.grade}</Td>
              <Td isNumeric>{g.userCount}</Td>
              <Td>
                <Badge colorScheme={g.wordOfDayReady ? 'green' : 'red'}>
                  {g.wordOfDayReady ? `Ready (${g.wordCount} words)` : 'Missing'}
                </Badge>
              </Td>
              <Td>
                <Badge colorScheme={g.factsReady ? 'green' : 'red'}>
                  {g.factsReady ? `Ready (${g.factCount} facts)` : 'Missing'}
                </Badge>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

export const DailyContentBatchAdminPage: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [overview, setOverview] = useState<DailyContentBatchOverview | null>(null);
  const [customDate, setCustomDate] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await dailyContentBatchApi.getOverview(25);
      setOverview(data);
      setCustomDate((prev) => prev || data.todayIst);
    } catch (err) {
      toast({
        title: 'Failed to load batch jobs',
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
    const timer = setInterval(load, overview?.isRunning ? 5000 : 15000);
    return () => clearInterval(timer);
  }, [load, overview?.isRunning]);

  const trigger = async (
    key: string,
    options: Parameters<typeof dailyContentBatchApi.trigger>[0],
  ) => {
    setTriggering(key);
    try {
      const result = await dailyContentBatchApi.trigger(options);
      if (result.skipped) {
        toast({ title: result.message || `Skipped: ${result.reason}`, status: 'warning', duration: 6000 });
      } else {
        toast({
          title: result.message || 'Batch started',
          description: `Target: ${result.targetDate || overview?.todayIst}. Wait 2–5 min, then refresh student app (F5).`,
          status: 'success',
          duration: 8000,
        });
      }
      await load();
    } catch (err) {
      toast({
        title: 'Trigger failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        status: 'error',
        duration: 6000,
      });
    } finally {
      setTriggering(null);
    }
  };

  if (loading && !overview) {
    return (
      <VStack py={12}>
        <Spinner size="lg" />
        <Text>Loading daily content batch jobs…</Text>
      </VStack>
    );
  }

  const jobs = overview?.jobs ?? [];
  const runs = overview?.recentRuns ?? [];
  const todayReady = overview?.cacheToday?.every(
    (g) => (!g.wordOfDayEnabled || g.wordOfDayReady) && (!g.factsEnabled || g.factsReady),
  );

  return (
    <VStack spacing={6} align="stretch" maxW="1100px">
      <Box>
        <Heading size="md" mb={2}>Daily Content Batch Jobs</Heading>
        <Text color="gray.600" fontSize="sm">
          Pre-generates Word of Day, expressions, Facts &amp; Fun, and news for classes with active users.
        </Text>
      </Box>

      <HStack spacing={3} flexWrap="wrap">
        <Badge colorScheme={overview?.isRunning ? 'orange' : 'green'} fontSize="sm" px={3} py={1}>
          {overview?.isRunning ? 'Batch running…' : 'Idle'}
        </Badge>
        <Badge colorScheme="blue">Today (IST): {overview?.todayIst}</Badge>
        <Badge colorScheme="purple">Tomorrow (IST): {overview?.tomorrowIst}</Badge>
        <Badge colorScheme={todayReady ? 'green' : 'yellow'}>
          Today cache: {todayReady ? 'ready' : 'incomplete'}
        </Badge>
      </HStack>

      <Alert status="warning" borderRadius="md">
        <AlertIcon />
        Use <strong>Run for today</strong> to warm content students see right now. &quot;Nightly&quot; job
        targets <strong>tomorrow</strong>. After batch completes, students must <strong>refresh the app (F5)</strong>
        if they already had a slow load in progress.
      </Alert>

      <CacheTable title={`Server cache — today (${overview?.todayIst})`} rows={overview?.cacheToday ?? []} />
      <CacheTable title={`Server cache — tomorrow (${overview?.tomorrowIst})`} rows={overview?.cacheTomorrow ?? []} />

      <Box bg="white" borderRadius="lg" borderWidth={1} overflowX="auto">
        <Box p={4} borderBottomWidth={1}>
          <Heading size="sm">Scheduled jobs</Heading>
        </Box>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Job</Th>
              <Th>Schedule</Th>
              <Th>Target day</Th>
              <Th>Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {jobs.map((job: DailyContentBatchJob) => (
              <Tr key={job.id}>
                <Td>
                  <Text fontWeight="medium">{job.name}</Text>
                  <Text fontSize="xs" color="gray.500">{job.description}</Text>
                </Td>
                <Td whiteSpace="nowrap">{job.schedule}</Td>
                <Td>
                  <Badge colorScheme={job.defaultTarget === 'tomorrow' ? 'purple' : 'blue'}>
                    {job.defaultTarget || 'today'}
                  </Badge>
                </Td>
                <Td>
                  <Button
                    size="sm"
                    colorScheme="purple"
                    variant="outline"
                    isLoading={triggering === job.id}
                    isDisabled={Boolean(overview?.isRunning)}
                    onClick={() => trigger(job.id, { jobId: job.id as 'nightly' | 'catchup' | 'boot' })}
                  >
                    Run now
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      <Box bg="white" borderRadius="lg" borderWidth={1} p={4}>
        <Heading size="sm" mb={3}>Manual trigger</Heading>
        <HStack spacing={3} flexWrap="wrap">
          <Button
            colorScheme="blue"
            isLoading={triggering === 'today'}
            isDisabled={Boolean(overview?.isRunning)}
            onClick={() => trigger('today', { today: true, skipNews: false })}
          >
            Run for today (recommended)
          </Button>
          <Button
            colorScheme="blue"
            variant="outline"
            isLoading={triggering === 'tomorrow'}
            isDisabled={Boolean(overview?.isRunning)}
            onClick={() => trigger('tomorrow', { date: overview?.tomorrowIst })}
          >
            Run for tomorrow
          </Button>
          <Input type="date" size="sm" maxW="180px" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
          <Button
            variant="outline"
            isLoading={triggering === 'custom'}
            isDisabled={Boolean(overview?.isRunning) || !customDate}
            onClick={() => trigger('custom', { date: customDate, skipNews: false })}
          >
            Run for date
          </Button>
          <Button variant="ghost" size="sm" onClick={() => load()}>Refresh status</Button>
        </HStack>
      </Box>

      <Box bg="white" borderRadius="lg" borderWidth={1} overflowX="auto">
        <Box p={4} borderBottomWidth={1}><Heading size="sm">Run history</Heading></Box>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Started (IST)</Th>
              <Th>Target (IST)</Th>
              <Th>Trigger</Th>
              <Th>Status</Th>
              <Th>Summary</Th>
            </Tr>
          </Thead>
          <Tbody>
            {runs.length === 0 ? (
              <Tr><Td colSpan={5} textAlign="center" color="gray.500" py={6}>No batch runs yet</Td></Tr>
            ) : (
              runs.map((run) => (
                <Tr key={run.id}>
                  <Td whiteSpace="nowrap">{formatWhen(run.started_at)}</Td>
                  <Td>{formatTargetDate(run)}</Td>
                  <Td><Badge>{run.trigger_type}</Badge></Td>
                  <Td><Badge colorScheme={statusColor(run.status)}>{run.status}</Badge></Td>
                  <Td fontSize="xs" maxW="300px">
                    {run.status === 'failed' && run.error_message ? run.error_message : runSummary(run)}
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>
    </VStack>
  );
};
