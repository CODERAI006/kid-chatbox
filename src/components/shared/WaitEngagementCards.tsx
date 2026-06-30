/**
 * Flip cards — vocabulary & expressions while AI loads.
 */

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Button, Card, CardBody, HStack, Text, VStack, Badge, Spinner, Progress,
} from '@/shared/design-system';
import { useWaitEngagementContent, type EngagementItem } from '@/hooks/useWaitEngagementContent';

interface WaitEngagementCardsProps {
  gradeLabel?: string;
  /** Auto-rotate cards (ms). 0 = off */
  rotateMs?: number;
}

function cardContent(item: EngagementItem, flipped: boolean) {
  if (item.kind === 'word') {
    const w = item.word;
    const meaning = w.simpleMeaning || w.meanings[0]?.definitions[0]?.definition || 'Tap to learn!';
    const example = w.meanings[0]?.definitions[0]?.example || w.schoolExample;
    return (
      <VStack spacing={3} align="stretch" minH="140px" justify="center">
        <HStack justify="space-between" flexWrap="wrap">
          <Badge colorScheme="purple">Vocabulary</Badge>
          {w.phonetic && <Text fontSize="xs" color="gray.500" fontStyle="italic">{w.phonetic}</Text>}
        </HStack>
        {!flipped ? (
          <>
            <Text fontSize="2xl" fontWeight="bold" color="purple.700" textTransform="capitalize">
              {w.word}
            </Text>
            <Text fontSize="sm" color="gray.500">Tap to reveal the meaning</Text>
          </>
        ) : (
          <>
            <Text fontSize="md" fontWeight="semibold" color="gray.800">{meaning}</Text>
            {example && (
              <Text fontSize="sm" color="gray.600" fontStyle="italic">&ldquo;{example}&rdquo;</Text>
            )}
            {w.quiz && (
              <Box bg="purple.50" p={2} borderRadius="md" mt={1}>
                <Text fontSize="xs" fontWeight="semibold" color="purple.700">Quick check</Text>
                <Text fontSize="sm">{w.quiz.question}</Text>
              </Box>
            )}
          </>
        )}
      </VStack>
    );
  }

  const p = item.phrase;
  return (
    <VStack spacing={3} align="stretch" minH="140px" justify="center">
      <Badge colorScheme="teal" alignSelf="start">Expression</Badge>
      {!flipped ? (
        <>
          <Text fontSize="lg" fontWeight="bold" color="teal.700">{p.phrase}</Text>
          <Text fontSize="sm" color="gray.500">Tap to see what it means</Text>
        </>
      ) : (
        <>
          <Text fontSize="md" fontWeight="semibold">{p.meaning}</Text>
          <Text fontSize="sm" color="gray.600" fontStyle="italic">&ldquo;{p.example}&rdquo;</Text>
          <Badge size="sm" colorScheme={p.context === 'school' ? 'blue' : 'orange'}>
            {p.context === 'school' ? 'School' : 'Daily life'}
          </Badge>
        </>
      )}
    </VStack>
  );
}

export function WaitEngagementCards({ gradeLabel, rotateMs = 12_000 }: WaitEngagementCardsProps) {
  const { items, loading } = useWaitEngagementContent(gradeLabel);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const next = useCallback(() => {
    setFlipped(false);
    setIndex((i) => (items.length ? (i + 1) % items.length : 0));
  }, [items.length]);

  useEffect(() => {
    if (!rotateMs || items.length < 2) return;
    const t = setInterval(next, rotateMs);
    return () => clearInterval(t);
  }, [rotateMs, items.length, next]);

  if (loading) {
    return (
      <VStack py={4}>
        <Spinner size="md" color="purple.400" />
        <Text fontSize="sm" color="gray.500">Loading today&apos;s words…</Text>
      </VStack>
    );
  }

  if (!items.length) return null;

  const item = items[index % items.length];

  return (
    <Box w="100%">
      <HStack justify="space-between" mb={2} flexWrap="wrap" gap={2}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.600">
          🎮 Learn while you wait
        </Text>
        <Text fontSize="xs" color="gray.400">
          {index + 1} / {items.length}
        </Text>
      </HStack>

      <Card
        borderWidth={2}
        borderColor="purple.200"
        bg="white"
        cursor="pointer"
        onClick={() => setFlipped((f) => !f)}
        _hover={{ boxShadow: 'md' }}
        transition="box-shadow 0.2s"
      >
        <CardBody p={{ base: 4, md: 5 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${index}-${flipped}`}
              initial={{ opacity: 0, rotateY: flipped ? -8 : 8 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {cardContent(item, flipped)}
            </motion.div>
          </AnimatePresence>
        </CardBody>
      </Card>

      <HStack mt={3} spacing={2} justify="center">
        <Progress
          value={((index + 1) / items.length) * 100}
          size="xs"
          colorScheme="purple"
          borderRadius="full"
          flex={1}
          maxW="200px"
        />
        <Button size="xs" variant="outline" colorScheme="purple" onClick={(e) => { e.stopPropagation(); next(); }}>
          Next →
        </Button>
      </HStack>
    </Box>
  );
}
