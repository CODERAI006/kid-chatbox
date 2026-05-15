/**
 * QuizLoading - Skeleton loading screen with live timer for AI question generation.
 * Shows animated skeleton question cards, elapsed seconds, and cycling stage messages.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Skeleton,
} from '@/shared/design-system';

interface QuizLoadingProps {
  loadingType?: 'generating' | 'loading-test' | 'loading-results' | 'checking-answers';
  batchProgress?: { current: number; total: number } | null;
  onCancelGeneration?: () => void;
  /** Unix ms timestamp of when generation started — drives the live elapsed timer */
  generationStartedAt?: number;
}

const GEN_STAGES = [
  { icon: '🧠', message: 'Thinking up questions…' },
  { icon: '📚', message: 'Picking the best topics…' },
  { icon: '✨', message: 'Crafting answer choices…' },
  { icon: '🔍', message: 'Checking for quality…' },
  { icon: '🎯', message: 'Finishing up your quiz…' },
];

type OtherStage = { icon: string; message: string; sub: string };
const OTHER_STAGES: Record<string, OtherStage[]> = {
  'loading-test': [
    { icon: '📋', message: 'Loading your scheduled test…', sub: 'Fetching test details' },
    { icon: '⏳', message: 'Preparing questions…', sub: 'Getting everything ready' },
  ],
  'loading-results': [
    { icon: '🔍', message: 'Checking your answers…', sub: 'Be patient — thanks for your effort!' },
    { icon: '📊', message: 'Calculating results…', sub: 'Processing your answers' },
    { icon: '✅', message: 'Finalising…', sub: 'Almost done!' },
  ],
  'checking-answers': [
    { icon: '📝', message: 'Checking your answers…', sub: 'Comparing with answer key' },
    { icon: '✅', message: 'Validating results…', sub: 'Saving to your history' },
    { icon: '🎯', message: 'Results ready!', sub: 'Preparing your score…' },
  ],
};

/** A shimmering skeleton card that looks like a question with 4 options */
const SkeletonQuestionCard = ({ opacity = 1, delay = 0 }: { opacity?: number; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.45, ease: 'easeOut' }}
    style={{ width: '100%' }}
  >
    <Box
      borderRadius="xl"
      borderWidth="1px"
      borderColor="blue.100"
      bg="white"
      p={{ base: 3, md: 4 }}
      boxShadow="sm"
      width="100%"
      style={{ opacity }}
    >
      <Skeleton height="16px" mb={3} borderRadius="md" />
      <Skeleton height="13px" width="62%" mb={4} borderRadius="md" />
      <VStack spacing={2} align="stretch">
        {([72, 55, 80, 50] as const).map((w, i) => (
          <HStack key={i} spacing={3}>
            <Skeleton height="12px" width="12px" borderRadius="full" flexShrink={0} />
            <Skeleton height="12px" width={`${w}%`} borderRadius="md" />
          </HStack>
        ))}
      </VStack>
    </Box>
  </motion.div>
);

const formatElapsed = (s: number) =>
  s < 60 ? `${s}s elapsed` : `${Math.floor(s / 60)}m ${s % 60}s elapsed`;

export const QuizLoading: React.FC<QuizLoadingProps> = ({
  loadingType = 'generating',
  batchProgress,
  onCancelGeneration,
  generationStartedAt,
}) => {
  const [stageIdx, setStageIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Cycle stage messages — faster for answer-checking (no AI wait)
  useEffect(() => {
    const len =
      loadingType === 'generating'
        ? GEN_STAGES.length
        : (OTHER_STAGES[loadingType] ?? OTHER_STAGES['loading-results']).length;
    const intervalMs = loadingType === 'checking-answers' ? 1200 : 2500;
    const t = setInterval(() => setStageIdx((p) => (p + 1) % len), intervalMs);
    return () => clearInterval(t);
  }, [loadingType]);

  // Live elapsed-seconds counter driven by caller's start timestamp
  useEffect(() => {
    if (!generationStartedAt) return;
    const update = () => setElapsed(Math.floor((Date.now() - generationStartedAt) / 1000));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [generationStartedAt]);

  /* ── Generating skeleton screen ─────────────────────────────────────── */
  if (loadingType === 'generating') {
    const stage = GEN_STAGES[stageIdx % GEN_STAGES.length];
    return (
      <Box
        display="flex"
        justifyContent="center"
        pt={{ base: 8, md: 10 }}
        pb={6}
        px={{ base: 4, md: 6 }}
        width="100%"
        minHeight="480px"
      >
        <VStack spacing={5} align="stretch" width="100%" maxWidth="520px">
          {/* Header: icon + message + timer */}
          <VStack spacing={2} align="center" mb={1}>
            <motion.div
              animate={{ scale: [1, 1.14, 1], rotate: [0, 8, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`icon-${stageIdx}`}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.28 }}
                >
                  <Text fontSize="5xl" role="img" aria-label="Loading icon" textAlign="center">
                    {stage.icon}
                  </Text>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`msg-${stageIdx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32 }}
              >
                <Text
                  fontSize={{ base: 'lg', md: 'xl' }}
                  fontWeight="bold"
                  color="blue.700"
                  textAlign="center"
                >
                  {stage.message}
                </Text>
              </motion.div>
            </AnimatePresence>

            {/* Live timer */}
            <HStack spacing={1} opacity={generationStartedAt ? 1 : 0}>
              <Text fontSize="sm" color="gray.400">⏱</Text>
              <Text
                fontSize="sm"
                color="gray.600"
                sx={{ fontVariantNumeric: 'tabular-nums' }}
                letterSpacing="0.02em"
              >
                {formatElapsed(elapsed)}
              </Text>
            </HStack>

            <Text fontSize="xs" color="gray.600" textAlign="center" px={2} maxW="28rem" lineHeight="short">
              On a VPS with Ollama, question generation can take several minutes. Keep this tab open.
              {elapsed >= 45 && (
                <Text as="span" display="block" mt={2} color="orange.700" fontWeight="medium">
                  If you get “Gateway timeout” (504), your web server closed the connection early — the
                  quiz may still be building on the server; raise nginx timeouts for /api or try fewer
                  questions.
                </Text>
              )}
            </Text>

            {/* Batch progress pill */}
            {batchProgress && batchProgress.total > 1 && (
              <Box
                bg="blue.50"
                borderRadius="full"
                px={3}
                py={1}
                borderWidth="1px"
                borderColor="blue.200"
              >
                <Text fontSize="xs" color="blue.600" fontWeight="semibold" letterSpacing="wide">
                  STEP {batchProgress.current} OF {batchProgress.total}
                </Text>
              </Box>
            )}
          </VStack>

          {/* Skeleton question cards — staggered opacity gives a "building" feel */}
          {([1, 0.55, 0.25] as const).map((opacity, i) => (
            <SkeletonQuestionCard key={i} opacity={opacity} delay={i * 0.13} />
          ))}

          {/* Pulsing dots */}
          <HStack justify="center" spacing={2} pt={1}>
            {[0, 0.22, 0.44].map((delay, i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.55, 1], opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 1.1, repeat: Infinity, delay, ease: 'easeInOut' }}
              >
                <Box w="8px" h="8px" borderRadius="full" bg="blue.400" />
              </motion.div>
            ))}
          </HStack>

          {/* Cancel button */}
          {onCancelGeneration && (
            <Box textAlign="center" pt={1}>
              <Button
                variant="outline"
                colorScheme="gray"
                size="sm"
                onClick={onCancelGeneration}
              >
                Cancel generation
              </Button>
            </Box>
          )}
        </VStack>
      </Box>
    );
  }

  /* ── Loading-test / loading-results ─────────────────────────────────── */
  const stages = OTHER_STAGES[loadingType] ?? OTHER_STAGES['loading-results'];
  const stage = stages[stageIdx % stages.length];
  return (
    <Box
      padding={{ base: 4, md: 6 }}
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="400px"
      width="100%"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{ textAlign: 'center' }}
      >
        <VStack spacing={6} align="center">
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Text fontSize="6xl" role="img" aria-label="Loading icon">
              {stage.icon}
            </Text>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={stageIdx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <VStack spacing={2}>
                <Text fontSize="xl" fontWeight="bold" color="blue.600" textAlign="center">
                  {stage.message}
                </Text>
                <Text fontSize="sm" color="gray.500" fontStyle="italic" textAlign="center">
                  {stage.sub}
                </Text>
              </VStack>
            </motion.div>
          </AnimatePresence>

          <HStack spacing={2}>
            {stages.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: stageIdx === i ? [1, 1.3, 1] : 1,
                  opacity: stageIdx === i ? 1 : 0.35,
                }}
                transition={{ duration: 0.4 }}
              >
                <Box
                  w={stageIdx === i ? '12px' : '8px'}
                  h={stageIdx === i ? '12px' : '8px'}
                  borderRadius="full"
                  bg={stageIdx === i ? 'blue.500' : 'gray.300'}
                />
              </motion.div>
            ))}
          </HStack>
        </VStack>
      </motion.div>
    </Box>
  );
};
