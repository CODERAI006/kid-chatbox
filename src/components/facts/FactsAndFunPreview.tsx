/**
 * Compact preview — 3 Facts & Fun topics with tap-to-detail on home.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Badge,
  Spinner,
} from '@/shared/design-system';
import { useCalendarDay } from '@/hooks/useCalendarDay';
import { publicApi } from '@/services/api';
import type { DailyFact, FactCategory } from '@/types/dailyFacts';
import FactDetailModal from './FactDetailModal';
import {
  getCategoryBadgeStyle,
  getCategoryColorScheme,
  resolveFactCategorySlug,
} from '@/utils/factCategoryUi';

const PREVIEW_COUNT = 3;

interface Props {
  grade?: string;
}

export default function FactsAndFunPreview({ grade }: Props) {
  const navigate = useNavigate();
  const today = useCalendarDay();
  const gradeLabel = grade || 'Class 5 / Grade 5';
  const [facts, setFacts] = useState<DailyFact[]>([]);
  const [categories, setCategories] = useState<FactCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailFact, setDetailFact] = useState<DailyFact | null>(null);

  const categoryMap = useMemo(() => {
    const m = new Map<string, FactCategory>();
    categories.forEach((c) => m.set(c.slug, c));
    return m;
  }, [categories]);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await publicApi.getDailyFacts(today, gradeLabel);
      if (res.success && res.facts?.length) {
        setFacts(res.facts.slice(0, PREVIEW_COUNT));
        setCategories(res.categories || []);
      } else {
        setFacts([]);
        setCategories(res.categories || []);
      }
    } catch {
      setFacts([]);
    } finally {
      setLoading(false);
    }
  }, [gradeLabel, today]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  if (!loading && facts.length === 0) return null;

  const detailMeta = detailFact
    ? categoryMap.get(resolveFactCategorySlug(detailFact))
    : undefined;

  return (
    <>
      <Card bg="white" borderColor="orange.200" borderWidth={2} boxShadow="md">
        <CardBody p={{ base: 3, md: 4 }}>
          <VStack spacing={3} align="stretch">
            <Box>
              <Heading size="sm" color="orange.600">💡 Facts &amp; Fun</Heading>
              <Text fontSize="xs" color="gray.500" mt={0.5}>
                Tap a fact for the full story · {PREVIEW_COUNT} of today&apos;s 10
              </Text>
            </Box>

            {loading ? (
              <HStack justify="center" py={4}>
                <Spinner size="sm" color="orange.400" />
                <Text fontSize="sm" color="gray.500">Loading facts…</Text>
              </HStack>
            ) : (
              <VStack spacing={2} align="stretch">
                {facts.map((fact) => {
                  const slug = resolveFactCategorySlug(fact);
                  const meta = categoryMap.get(slug);
                  const badge = getCategoryBadgeStyle(slug);
                  const label = meta?.label || slug.replace(/_/g, ' ');
                  return (
                    <Box
                      key={fact.id}
                      as="button"
                      type="button"
                      w="100%"
                      textAlign="left"
                      p={3}
                      borderRadius="md"
                      bg="orange.50"
                      borderWidth="1px"
                      borderColor="orange.100"
                      cursor="pointer"
                      aria-label={`${fact.title}. Tap for full details.`}
                      onClick={() => setDetailFact(fact)}
                      _hover={{ borderColor: 'orange.300', boxShadow: 'sm' }}
                      _focusVisible={{ outline: '2px solid', outlineColor: 'orange.400' }}
                    >
                      <HStack justify="space-between" mb={1} flexWrap="wrap" gap={1}>
                        <HStack spacing={2} minW={0}>
                          <Text fontSize="lg" aria-hidden>{fact.emoji}</Text>
                          <Text fontSize="sm" fontWeight="bold" color="gray.800" noOfLines={1}>
                            {fact.title}
                          </Text>
                        </HStack>
                        <Badge
                          colorScheme={getCategoryColorScheme(slug)}
                          fontSize="2xs"
                          bg={badge.bg}
                          color={badge.color}
                          borderWidth="1px"
                          borderColor={badge.borderColor}
                          maxW="100%"
                          whiteSpace="normal"
                        >
                          {label}{fact.topic ? ` · ${fact.topic}` : ''}
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" color="gray.600" noOfLines={2} lineHeight="1.5">
                        {fact.fact}
                      </Text>
                      <Text fontSize="2xs" color="orange.500" fontWeight="semibold" pt={1}>
                        Tap for the full story →
                      </Text>
                    </Box>
                  );
                })}
              </VStack>
            )}

            <Button
              size="sm"
              colorScheme="orange"
              variant="outline"
              onClick={() => navigate('/news')}
            >
              Show more Facts &amp; Fun →
            </Button>
          </VStack>
        </CardBody>
      </Card>

      <FactDetailModal
        fact={detailFact}
        categoryMeta={detailMeta}
        isOpen={Boolean(detailFact)}
        onClose={() => setDetailFact(null)}
      />
    </>
  );
}
