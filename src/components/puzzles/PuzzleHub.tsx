/**
 * Puzzle Hub — daily puzzles and practice by category.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, VStack, Heading, Text, Tabs, TabList, Tab, TabPanels, TabPanel,
  SimpleGrid, Badge, HStack, Spinner, Select, Button,
} from '@/shared/design-system';
import { publicApi } from '@/services/api';
import type { Puzzle, PuzzleTypeMeta } from '@/types/puzzle';
import { PUZZLE_CATEGORY_EMOJI, DIFFICULTY_COLOR } from '@/constants/puzzles';
import { PuzzleDetailModal } from './PuzzleDetailModal';
import { PullToRefresh } from '@/components/PullToRefresh';

interface Props {
  grade?: string;
}

export function PuzzleHub({ grade }: Props) {
  const gradeLabel = grade || 'Class 5 / Grade 5';
  const [tab, setTab] = useState(0);
  const [daily, setDaily] = useState<Puzzle[]>([]);
  const [types, setTypes] = useState<PuzzleTypeMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [active, setActive] = useState<Puzzle | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dailyRes, typesRes] = await Promise.all([
        publicApi.getDailyPuzzles(undefined, gradeLabel),
        publicApi.getPuzzleTypes(),
      ]);
      setDaily(dailyRes.success ? dailyRes.puzzles : []);
      setTypes(typesRes.success ? typesRes.types : []);
    } catch {
      setDaily([]);
    } finally {
      setLoading(false);
    }
  }, [gradeLabel]);

  useEffect(() => { load(); }, [load]);

  const categories = useMemo(
    () => [...new Set(types.map((t) => t.category))],
    [types],
  );

  const filteredTypes = filterCat
    ? types.filter((t) => t.category === filterCat)
    : types;

  return (
    <PullToRefresh onRefresh={load}>
      <Box p={{ base: 3, md: 5 }} maxW="1000px" mx="auto">
        <VStack align="stretch" spacing={5}>
          <Box>
            <Heading size="lg" color="purple.700">🧩 Puzzle Hub</Heading>
            <Text color="gray.600" fontSize="sm">
              Age-appropriate puzzles for {gradeLabel} — train your brain every day!
            </Text>
          </Box>

          <Tabs index={tab} onChange={setTab} colorScheme="purple" variant="enclosed">
            <TabList>
              <Tab>⭐ Today&apos;s Puzzles</Tab>
              <Tab>📚 Puzzle Types</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                {loading ? (
                  <HStack justify="center" py={10}><Spinner /></HStack>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    {daily.map((p, i) => (
                      <Box
                        key={p.id}
                        p={4}
                        borderWidth={1}
                        borderRadius="xl"
                        borderColor="purple.100"
                        bg="white"
                        cursor="pointer"
                        _hover={{ shadow: 'md', borderColor: 'purple.300' }}
                        onClick={() => setActive(p)}
                      >
                        <HStack justify="space-between" mb={2}>
                          <Text fontWeight="bold" fontSize="sm" color="purple.700">
                            #{i + 1} {PUZZLE_CATEGORY_EMOJI[p.category]} {p.puzzleType}
                          </Text>
                          <Badge colorScheme={DIFFICULTY_COLOR[p.difficulty]}>{p.difficulty}</Badge>
                        </HStack>
                        <Text fontSize="sm" noOfLines={3}>{p.question}</Text>
                        <Text fontSize="xs" color="gray.500" mt={2}>{p.points} pts · {p.timeLimit}s</Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                )}
              </TabPanel>
              <TabPanel px={0}>
                <Select
                  maxW="240px"
                  mb={4}
                  placeholder="All categories"
                  value={filterCat}
                  onChange={(e) => setFilterCat(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{PUZZLE_CATEGORY_EMOJI[c]} {c}</option>
                  ))}
                </Select>
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={3}>
                  {filteredTypes.map((t) => (
                    <Box key={`${t.category}-${t.puzzleType}`} p={3} borderWidth={1} borderRadius="lg" bg="gray.50">
                      <Text fontWeight="semibold" fontSize="sm">
                        {PUZZLE_CATEGORY_EMOJI[t.category]} {t.puzzleType}
                      </Text>
                      <Text fontSize="xs" color="gray.600" mt={1}>
                        Class {t.classFrom}–{t.classTo} · {t.difficulties.join(', ')}
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
                <Button mt={4} size="sm" variant="outline" onClick={() => setTab(0)}>
                  Solve today&apos;s puzzles →
                </Button>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
        <PuzzleDetailModal puzzle={active} isOpen={!!active} onClose={() => setActive(null)} />
      </Box>
    </PullToRefresh>
  );
}
