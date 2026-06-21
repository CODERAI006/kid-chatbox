/**
 * Admin-only puzzle type catalog (45 types).
 */

import { useMemo, useState } from 'react';
import {
  Box, Heading, SimpleGrid, Text, Select, Badge, Table, Tbody, Td, Th, Thead, Tr,
} from '@/shared/design-system';
import type { PuzzleTypeMeta } from '@/types/puzzle';
import { PUZZLE_CATEGORY_EMOJI } from '@/constants/puzzles';

interface Props {
  types: PuzzleTypeMeta[];
}

export function PuzzleTypesCatalog({ types }: Props) {
  const [filterCat, setFilterCat] = useState('');
  const categories = useMemo(() => [...new Set(types.map((t) => t.category))], [types]);
  const filtered = filterCat ? types.filter((t) => t.category === filterCat) : types;

  return (
    <Box bg="white" p={4} borderRadius="lg" borderWidth={1}>
      <Heading size="sm" mb={2}>Puzzle type catalog ({types.length})</Heading>
      <Text fontSize="xs" color="gray.500" mb={3}>Admin reference — not shown to students.</Text>
      <Select maxW="240px" mb={4} placeholder="All categories" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
        {categories.map((c) => <option key={c} value={c}>{PUZZLE_CATEGORY_EMOJI[c]} {c}</option>)}
      </Select>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={2} display={{ base: 'none', md: 'grid' }}>
        {filtered.map((t) => (
          <Box key={`${t.category}-${t.puzzleType}`} p={2} borderWidth={1} borderRadius="md" fontSize="sm">
            <Text fontWeight="semibold">{PUZZLE_CATEGORY_EMOJI[t.category]} {t.puzzleType}</Text>
            <Text fontSize="xs" color="gray.600">Class {t.classFrom}–{t.classTo}</Text>
            <HStackTags difficulties={t.difficulties} />
          </Box>
        ))}
      </SimpleGrid>
      <Box overflowX="auto" display={{ base: 'block', md: 'none' }}>
        <Table size="sm">
          <Thead><Tr><Th>Type</Th><Th>Class</Th></Tr></Thead>
          <Tbody>
            {filtered.map((t) => (
              <Tr key={`${t.category}-${t.puzzleType}`}>
                <Td>{t.puzzleType}</Td>
                <Td>{t.classFrom}–{t.classTo}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

function HStackTags({ difficulties }: { difficulties: string[] }) {
  return (
    <Text fontSize="2xs" mt={1}>
      {difficulties.map((d) => (
        <Badge key={d} mr={1} size="sm">{d}</Badge>
      ))}
    </Text>
  );
}
