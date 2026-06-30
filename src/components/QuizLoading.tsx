/**
 * QuizLoading - Skeleton loading screen with live timer for AI question generation.
 * Generating mode uses shared interactive wait experience (vocab + expressions).
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  VStack,
  HStack,
  Text,
} from '@/shared/design-system';
import { AiGenerationWaitExperience } from '@/components/shared/AiGenerationWaitExperience';

interface QuizLoadingProps {
  loadingType?: 'generating' | 'loading-test' | 'loading-results' | 'checking-answers';
  batchProgress?: { current: number; total: number } | null;
  onCancelGeneration?: () => void;
  generationStartedAt?: number;
  gradeLabel?: string;
}

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

export const QuizLoading: React.FC<QuizLoadingProps> = ({
  loadingType = 'generating',
  batchProgress,
  onCancelGeneration,
  generationStartedAt,
  gradeLabel,
}) => {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    if (loadingType === 'generating') return;
    const stages = OTHER_STAGES[loadingType] ?? OTHER_STAGES['loading-results'];
    const intervalMs = loadingType === 'checking-answers' ? 1200 : 2500;
    const t = setInterval(() => setStageIdx((p) => (p + 1) % stages.length), intervalMs);
    return () => clearInterval(t);
  }, [loadingType]);

  if (loadingType === 'generating') {
    return (
      <AiGenerationWaitExperience
        mode="quiz"
        gradeLabel={gradeLabel}
        generationStartedAt={generationStartedAt}
        batchProgress={batchProgress}
        onCancel={onCancelGeneration}
        variant="quiz"
      />
    );
  }

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
