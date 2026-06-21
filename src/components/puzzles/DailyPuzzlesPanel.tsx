/**
 * Daily top puzzles panel — homepage & dashboard preview (no difficulty shown).
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardBody, Heading, Text, VStack, HStack, Button, Spinner, SimpleGrid,
} from '@/shared/design-system';
import { publicApi } from '@/services/api';
import type { Puzzle } from '@/types/puzzle';
import { DEFAULT_PUBLIC_GRADE, DAILY_PUZZLE_COUNT, PUZZLE_HOME_PREVIEW_COUNT } from '@/constants/puzzles';
import { PuzzleDetailModal } from './PuzzleDetailModal';
import { PuzzleCard } from './PuzzleCard';

interface Props {
  grade?: string;
  variant?: 'light' | 'dark';
  maxCount?: number;
  showViewAll?: boolean;
}

export function DailyPuzzlesPanel({
  grade,
  variant = 'light',
  maxCount = PUZZLE_HOME_PREVIEW_COUNT,
  showViewAll = true,
}: Props) {
  const navigate = useNavigate();
  const gradeLabel = grade || DEFAULT_PUBLIC_GRADE;
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Puzzle | null>(null);
  const isDark = variant === 'dark';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await publicApi.getDailyPuzzles(undefined, gradeLabel);
      setPuzzles(res.success ? res.puzzles.slice(0, maxCount) : []);
    } catch {
      setPuzzles([]);
    } finally {
      setLoading(false);
    }
  }, [gradeLabel, maxCount]);

  useEffect(() => { load(); }, [load]);

  const cardBg = isDark ? 'rgba(255,255,255,0.08)' : 'white';
  const borderColor = isDark ? 'rgba(0,242,255,0.2)' : 'purple.200';
  const headingColor = isDark ? '#00f2ff' : 'purple.700';
  const textColor = isDark ? 'whiteAlpha.900' : 'gray.600';

  return (
    <>
      <Card bg={cardBg} borderColor={borderColor} borderWidth={2} boxShadow="md" backdropFilter={isDark ? 'blur(10px)' : undefined}>
        <CardBody p={{ base: 3, md: 4 }}>
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between" flexWrap="wrap" gap={2}>
              <VStack align="start" spacing={0}>
                <Heading size="sm" color={headingColor}>
                  🧩 {maxCount >= DAILY_PUZZLE_COUNT ? DAILY_PUZZLE_COUNT : `${maxCount} of ${DAILY_PUZZLE_COUNT}`} Puzzles Today
                </Heading>
                <Text fontSize="xs" color={textColor}>GK · History · Civics · Finance · Brain teasers</Text>
              </VStack>
              {showViewAll && (
                <Button size="sm" variant={isDark ? 'outline' : 'ghost'} colorScheme="purple" onClick={() => navigate('/puzzles')}>
                  View all {DAILY_PUZZLE_COUNT} →
                </Button>
              )}
            </HStack>

            {loading ? (
              <HStack justify="center" py={6}><Spinner size="md" /></HStack>
            ) : puzzles.length === 0 ? (
              <Text fontSize="sm" color={textColor}>No puzzles available today.</Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                {puzzles.map((p, i) => (
                  <PuzzleCard key={p.id} puzzle={p} index={i} variant={variant} onClick={() => setActive(p)} />
                ))}
              </SimpleGrid>
            )}
          </VStack>
        </CardBody>
      </Card>
      <PuzzleDetailModal puzzle={active} isOpen={!!active} onClose={() => setActive(null)} />
    </>
  );
}
