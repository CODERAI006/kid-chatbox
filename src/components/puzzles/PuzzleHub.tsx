/**
 * Puzzle Hub — 20 daily puzzles for YOUR class only, all skill areas.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, Heading, Text, Tabs, TabList, Tab, TabPanels, TabPanel,
  Badge, HStack, Spinner, Button, Switch, SimpleGrid,
} from '@/shared/design-system';
import { publicApi } from '@/services/api';
import type { Puzzle, ArchivedPuzzleItem } from '@/types/puzzle';
import { DAILY_PUZZLE_COUNT } from '@/constants/puzzles';
import { PuzzleDetailModal } from './PuzzleDetailModal';
import { PuzzleCard } from './PuzzleCard';
import { PullToRefresh } from '@/components/PullToRefresh';

interface Props {
  grade?: string;
}

const toYMD = (d: Date) => d.toISOString().slice(0, 10);

export function PuzzleHub({ grade }: Props) {
  const gradeLabel = grade || 'Class 5 / Grade 5';
  const [tab, setTab] = useState(0);
  const [daily, setDaily] = useState<Puzzle[]>([]);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [archive, setArchive] = useState<ArchivedPuzzleItem[]>([]);
  const [archiveAll, setArchiveAll] = useState(true);
  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [active, setActive] = useState<Puzzle | null>(null);

  const loadDaily = useCallback(async () => {
    setLoading(true);
    try {
      const res = await publicApi.getDailyPuzzles(undefined, gradeLabel);
      setDaily(res.success ? res.puzzles : []);
      setBreakdown(res.categoryBreakdown || {});
    } catch {
      setDaily([]);
    } finally {
      setLoading(false);
    }
  }, [gradeLabel]);

  const loadArchive = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const res = await publicApi.getPuzzleArchive(gradeLabel, { all: archiveAll, untilDate: toYMD(new Date()) });
      setArchive(res.puzzles || res.items || []);
    } catch {
      setArchive([]);
    } finally {
      setArchiveLoading(false);
    }
  }, [gradeLabel, archiveAll]);

  useEffect(() => { loadDaily(); }, [loadDaily]);
  useEffect(() => { if (tab === 1) loadArchive(); }, [tab, loadArchive]);

  return (
    <PullToRefresh onRefresh={async () => { await loadDaily(); if (tab === 1) await loadArchive(); }}>
      <Box p={{ base: 3, md: 5 }} maxW="1000px" mx="auto">
        <VStack align="stretch" spacing={5}>
          <Box>
            <Heading size="lg" color="purple.700">🧩 Puzzle Hub</Heading>
            <Text color="gray.600" fontSize="sm">
              {DAILY_PUZZLE_COUNT} smart questions for <strong>{gradeLabel}</strong> — GK, history, civics, finance &amp; more
            </Text>
          </Box>

          <Tabs index={tab} onChange={setTab} colorScheme="purple" variant="enclosed">
            <TabList>
              <Tab>⭐ Today ({DAILY_PUZZLE_COUNT})</Tab>
              <Tab>📅 My class archive</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                {Object.keys(breakdown).length > 0 && (
                  <HStack mb={4} flexWrap="wrap" spacing={2}>
                    {Object.entries(breakdown).map(([cat, n]) => (
                      <Badge key={cat} colorScheme="purple" variant="subtle">{cat}: {n}</Badge>
                    ))}
                  </HStack>
                )}
                {loading ? (
                  <HStack justify="center" py={10}><Spinner /></HStack>
                ) : daily.length === 0 ? (
                  <Text color="gray.500">No puzzles yet for your class today.</Text>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {daily.map((p, i) => (
                      <PuzzleCard key={p.id} puzzle={p} index={i} onClick={() => setActive(p)} />
                    ))}
                  </SimpleGrid>
                )}
              </TabPanel>
              <TabPanel px={0}>
                <HStack mb={4} spacing={4} flexWrap="wrap">
                  <Switch isChecked={archiveAll} onChange={(e) => setArchiveAll(e.target.checked)} />
                  <Text fontSize="sm">All puzzles from past days (your class only)</Text>
                  <Button size="xs" variant="outline" onClick={loadArchive} isLoading={archiveLoading}>Refresh</Button>
                </HStack>
                {archiveLoading ? (
                  <HStack justify="center" py={10}><Spinner /></HStack>
                ) : archive.length === 0 ? (
                  <Text color="gray.500">No archive yet.</Text>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {archive.map((p) => (
                      <Box key={`${p.id}-${p.archiveDate}`}>
                        <Badge mb={1} fontSize="2xs">{p.archiveDate}</Badge>
                        <PuzzleCard puzzle={p} onClick={() => setActive(p)} />
                      </Box>
                    ))}
                  </SimpleGrid>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
        <PuzzleDetailModal puzzle={active} isOpen={!!active} onClose={() => setActive(null)} />
      </Box>
    </PullToRefresh>
  );
}
