/**
 * Interactive AI wait screen — progress, timer, vocab/expressions.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Button, HStack, Progress, Skeleton, Text, VStack,
} from '@/shared/design-system';
import { getAiWaitStages, type AiWaitMode } from '@/constants/aiWaitStages';
import { WaitEngagementCards } from '@/components/shared/WaitEngagementCards';

export interface AiGenerationWaitExperienceProps {
  mode: AiWaitMode;
  title?: string;
  subtitle?: string;
  gradeLabel?: string;
  generationStartedAt?: number;
  batchProgress?: { current: number; total: number } | null;
  onCancel?: () => void;
  /** Quiz-style question skeletons vs study lesson skeletons */
  variant?: 'quiz' | 'study';
}

const formatElapsed = (s: number) =>
  s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

function LessonSkeleton() {
  return (
    <VStack spacing={3} align="stretch" w="100%">
      <Skeleton height="18px" width="70%" borderRadius="md" />
      <Skeleton height="12px" width="90%" borderRadius="md" />
      <Skeleton height="12px" width="85%" borderRadius="md" />
      <Skeleton height="80px" borderRadius="lg" />
      <HStack spacing={2}>
        <Skeleton flex={1} height="48px" borderRadius="md" />
        <Skeleton flex={1} height="48px" borderRadius="md" />
      </HStack>
    </VStack>
  );
}

function QuestionSkeleton({ opacity = 1 }: { opacity?: number }) {
  return (
    <Box opacity={opacity} borderRadius="xl" borderWidth="1px" borderColor="blue.100" bg="white" p={4}>
      <Skeleton height="14px" mb={3} borderRadius="md" />
      <Skeleton height="12px" width="60%" mb={3} borderRadius="md" />
      <VStack spacing={2} align="stretch">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height="12px" width={`${55 + i * 8}%`} borderRadius="md" />
        ))}
      </VStack>
    </Box>
  );
}

export function AiGenerationWaitExperience({
  mode,
  title,
  subtitle,
  gradeLabel,
  generationStartedAt,
  batchProgress,
  onCancel,
  variant,
}: AiGenerationWaitExperienceProps) {
  const stages = getAiWaitStages(mode);
  const [stageIdx, setStageIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const skeletonVariant = variant ?? (mode === 'study' ? 'study' : 'quiz');
  const defaultTitle = mode === 'study' ? 'Creating your lesson…' : 'Building your quiz…';

  useEffect(() => {
    const t = setInterval(() => setStageIdx((p) => (p + 1) % stages.length), 2800);
    return () => clearInterval(t);
  }, [stages.length]);

  useEffect(() => {
    if (!generationStartedAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - generationStartedAt) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [generationStartedAt]);

  const stage = stages[stageIdx % stages.length];
  const pace = mode === 'study' ? 0.35 : 0.55;
  const batchBoost = batchProgress
    ? (batchProgress.current / batchProgress.total) * 40
    : 0;
  const timeProgress = generationStartedAt
    ? Math.min(88, 12 + elapsed * pace + batchBoost)
    : 20 + stageIdx * 8;

  return (
    <Box
      py={{ base: 6, md: 8 }}
      px={{ base: 4, md: 6 }}
      w="100%"
      maxW="640px"
      mx="auto"
    >
      <VStack spacing={6} align="stretch">
        <VStack spacing={2} align="center" textAlign="center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Text fontSize="4xl" aria-hidden>{stage.icon}</Text>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={stageIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28 }}
            >
              <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="blue.700">
                {title || defaultTitle}
              </Text>
              <Text fontSize="sm" color="gray.600" mt={1}>
                {subtitle || stage.message}
              </Text>
              {stage.hint && (
                <Text fontSize="xs" color="gray.400" mt={0.5}>{stage.hint}</Text>
              )}
            </motion.div>
          </AnimatePresence>

          <Box w="100%" maxW="400px" mt={2}>
            <Progress
              value={timeProgress}
              size="sm"
              colorScheme="blue"
              borderRadius="full"
              hasStripe
              isAnimated
            />
            <HStack justify="space-between" mt={1}>
              <Text fontSize="xs" color="gray.500">
                {generationStartedAt ? `${formatElapsed(elapsed)} elapsed` : 'Working…'}
              </Text>
              {batchProgress && batchProgress.total > 1 && (
                <Text fontSize="xs" color="blue.600" fontWeight="semibold">
                  Step {batchProgress.current}/{batchProgress.total}
                </Text>
              )}
            </HStack>
          </Box>
        </VStack>

        <WaitEngagementCards gradeLabel={gradeLabel} />

        <Box opacity={0.7}>
          {skeletonVariant === 'study' ? (
            <LessonSkeleton />
          ) : (
            <VStack spacing={3}>
              <QuestionSkeleton />
              <QuestionSkeleton opacity={0.5} />
            </VStack>
          )}
        </Box>

        <Text fontSize="xs" color="gray.400" textAlign="center">
          Large lessons can take 2–5 minutes — explore the cards above while the AI works!
        </Text>

        {onCancel && (
          <Box textAlign="center">
            <Button size="sm" variant="ghost" colorScheme="gray" onClick={onCancel}>
              Cancel
            </Button>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
