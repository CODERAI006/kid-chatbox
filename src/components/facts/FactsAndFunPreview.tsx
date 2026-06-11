/**
 * Dashboard preview — 3 Facts & Fun topics with link to full page.
 */

import { useState, useEffect, useCallback } from 'react';
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
import { publicApi } from '@/services/api';
import type { DailyFact } from '@/types/dailyFacts';

const PREVIEW_COUNT = 3;

const toYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const BADGE_COLORS: Record<string, string> = {
  science: 'blue',
  geography: 'green',
  history: 'orange',
  current_affairs: 'pink',
  general_knowledge: 'purple',
  nature: 'green',
  india: 'orange',
  sports: 'cyan',
  math: 'indigo',
};

interface Props {
  grade?: string;
}

export default function FactsAndFunPreview({ grade }: Props) {
  const navigate = useNavigate();
  const gradeLabel = grade || 'Class 5 / Grade 5';
  const [facts, setFacts] = useState<DailyFact[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await publicApi.getDailyFacts(toYMD(new Date()), gradeLabel);
      if (res.success && res.facts?.length) {
        setFacts(res.facts.slice(0, PREVIEW_COUNT));
      } else {
        setFacts([]);
      }
    } catch {
      setFacts([]);
    } finally {
      setLoading(false);
    }
  }, [gradeLabel]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  if (!loading && facts.length === 0) return null;

  return (
    <Card bg="white" borderColor="orange.200" borderWidth={2} boxShadow="md">
      <CardBody p={{ base: 3, md: 4 }}>
        <VStack spacing={3} align="stretch">
          <Box>
            <Heading size="sm" color="orange.600">💡 Facts &amp; Fun</Heading>
            <Text fontSize="xs" color="gray.500" mt={0.5}>
              3 quick facts for {gradeLabel} today
            </Text>
          </Box>

          {loading ? (
            <HStack justify="center" py={4}>
              <Spinner size="sm" color="orange.400" />
              <Text fontSize="sm" color="gray.500">Loading facts…</Text>
            </HStack>
          ) : (
            <VStack spacing={2} align="stretch">
              {facts.map((fact) => (
                <Box
                  key={fact.id}
                  p={3}
                  borderRadius="md"
                  bg="orange.50"
                  borderWidth="1px"
                  borderColor="orange.100"
                >
                  <HStack justify="space-between" mb={1} flexWrap="wrap" gap={1}>
                    <HStack spacing={2}>
                      <Text fontSize="lg" aria-hidden>{fact.emoji}</Text>
                      <Text fontSize="sm" fontWeight="bold" color="gray.800" noOfLines={1}>
                        {fact.title}
                      </Text>
                    </HStack>
                    <Badge
                      colorScheme={BADGE_COLORS[fact.subject] || 'orange'}
                      fontSize="2xs"
                      textTransform="capitalize"
                    >
                      {fact.subject.replace(/_/g, ' ')}
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color="gray.600" noOfLines={2} lineHeight="1.5">
                    {fact.fact}
                  </Text>
                </Box>
              ))}
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
  );
}
