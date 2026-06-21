/**
 * Daily top puzzles panel — homepage & dashboard preview.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardBody, Heading, Text, VStack, HStack, Button, Badge, Spinner, SimpleGrid,
} from '@/shared/design-system';
import { publicApi } from '@/services/api';
import type { Puzzle } from '@/types/puzzle';
import { PUZZLE_CATEGORY_EMOJI, DIFFICULTY_COLOR, DEFAULT_PUBLIC_GRADE } from '@/constants/puzzles';
import { PuzzleDetailModal } from './PuzzleDetailModal';

interface Props {
  grade?: string;
  /** Dark glass style for landing page */
  variant?: 'light' | 'dark';
  maxCount?: number;
  showViewAll?: boolean;
}

export function DailyPuzzlesPanel({
  grade,
  variant = 'light',
  maxCount = 5,
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
                <Heading size="sm" color={headingColor}>🧩 Top {maxCount} Puzzles Today</Heading>
                <Text fontSize="xs" color={textColor}>Fresh brain teasers for {gradeLabel}</Text>
              </VStack>
              {showViewAll && (
                <Button size="sm" variant={isDark ? 'outline' : 'ghost'} colorScheme="purple" onClick={() => navigate('/puzzles')}>
                  View all →
                </Button>
              )}
            </HStack>

            {loading ? (
              <HStack justify="center" py={6}><Spinner size="md" /></HStack>
            ) : puzzles.length === 0 ? (
              <Text fontSize="sm" color={textColor}>No puzzles available today. Check back soon!</Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: maxCount >= 5 ? 2 : 1 }} spacing={3}>
                {puzzles.map((p, i) => (
                  <Box
                    key={p.id}
                    p={3}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor={isDark ? 'whiteAlpha.200' : 'gray.200'}
                    cursor="pointer"
                    _hover={{ borderColor: isDark ? 'cyan.400' : 'purple.300', transform: 'translateY(-1px)' }}
                    transition="all 0.2s"
                    onClick={() => setActive(p)}
                  >
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="xs" fontWeight="bold" color={isDark ? 'cyan.300' : 'purple.600'}>
                        #{i + 1} {PUZZLE_CATEGORY_EMOJI[p.category] || '🧩'} {p.puzzleType}
                      </Text>
                      <Badge size="sm" colorScheme={DIFFICULTY_COLOR[p.difficulty]}>{p.difficulty}</Badge>
                    </HStack>
                    <Text fontSize="sm" noOfLines={2} color={isDark ? 'whiteAlpha.900' : 'gray.700'}>
                      {p.question}
                    </Text>
                    <Text fontSize="xs" color={textColor} mt={1}>{p.points} pts · {p.timeLimit}s</Text>
                  </Box>
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
