/**
 * Multi-step animated feedback form — rating, feature wishes, optional note.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Textarea,
  Progress,
  SimpleGrid,
  useToast,
} from '@/shared/design-system';
import { FEATURE_WISHES, RATING_EMOJIS } from '@/constants/feedback';
import { feedbackApi } from '@/services/api';
import type { FeedbackContext } from '@/types/feedback';

const STEPS = ['rate', 'features', 'note', 'done'] as const;
type Step = (typeof STEPS)[number];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};

interface LearningFeedbackFormProps {
  context?: FeedbackContext;
  onClose?: () => void;
}

export const LearningFeedbackForm: React.FC<LearningFeedbackFormProps> = ({
  context,
  onClose,
}) => {
  const toast = useToast();
  const [step, setStep] = useState<Step>('rate');
  const [direction, setDirection] = useState(1);
  const [rating, setRating] = useState(0);
  const [wishes, setWishes] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const goNext = useCallback(() => {
    setDirection(1);
    if (step === 'rate') setStep('features');
    else if (step === 'features') setStep('note');
  }, [step]);

  const goBack = useCallback(() => {
    setDirection(-1);
    if (step === 'features') setStep('rate');
    else if (step === 'note') setStep('features');
  }, [step]);

  const toggleWish = (id: string) => {
    setWishes((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      toast({ title: 'Pick a rating first', status: 'warning', duration: 2500 });
      return;
    }
    setSubmitting(true);
    try {
      await feedbackApi.submit({
        rating,
        featureWishes: wishes,
        message: message.trim() || undefined,
        source: context?.source ?? 'global',
        quizSubject: context?.quizSubject,
        quizScore: context?.quizScore,
        quizTotal: context?.quizTotal,
      });
      setDirection(1);
      setStep('done');
    } catch (err) {
      toast({
        title: 'Could not send feedback',
        description: err instanceof Error ? err.message : 'Please try again',
        status: 'error',
        duration: 4000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const headline =
    context?.source === 'quiz_results'
      ? 'How was this quiz experience?'
      : 'Help us build better learning tools';

  return (
    <VStack spacing={5} align="stretch" minH="320px">
      <Box>
        <Progress
          value={progress}
          size="sm"
          borderRadius="full"
          colorScheme="purple"
          bg="purple.50"
        />
        <Text fontSize="xs" color="gray.500" mt={2} textAlign="center">
          Step {Math.min(stepIndex + 1, 3)} of 3
        </Text>
      </Box>

      <AnimatePresence mode="wait" custom={direction}>
        {step === 'rate' && (
          <motion.div
            key="rate"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <VStack spacing={4}>
              <Heading size="md" textAlign="center" color="purple.700">
                {headline}
              </Heading>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                Tap how you feel about the app so far
              </Text>
              <HStack spacing={2} justify="center" flexWrap="wrap" pt={2}>
                {RATING_EMOJIS.map((emoji, i) => {
                  const value = i + 1;
                  const selected = rating === value;
                  return (
                    <motion.button
                      key={emoji}
                      type="button"
                      aria-label={`Rate ${value} out of 5`}
                      onClick={() => setRating(value)}
                      whileHover={{ scale: 1.12, y: -4 }}
                      whileTap={{ scale: 0.92 }}
                      animate={{
                        scale: selected ? 1.18 : 1,
                        filter: selected ? 'none' : 'grayscale(30%)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                      style={{
                        fontSize: selected ? '2.4rem' : '2rem',
                        background: selected ? '#EDE9FE' : 'transparent',
                        border: selected ? '2px solid #7C3AED' : '2px solid transparent',
                        borderRadius: '16px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                      }}
                    >
                      {emoji}
                    </motion.button>
                  );
                })}
              </HStack>
            </VStack>
          </motion.div>
        )}

        {step === 'features' && (
          <motion.div
            key="features"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <VStack spacing={3} align="stretch">
              <Heading size="md" textAlign="center" color="purple.700">
                What should we add next?
              </Heading>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                Pick any features that would help you learn better
              </Text>
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2} pt={1}>
                {FEATURE_WISHES.map((item, index) => {
                  const active = wishes.includes(item.id);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Button
                        w="100%"
                        justifyContent="flex-start"
                        leftIcon={<Text fontSize="lg">{item.icon}</Text>}
                        variant={active ? 'solid' : 'outline'}
                        colorScheme={active ? 'purple' : 'gray'}
                        size="sm"
                        onClick={() => toggleWish(item.id)}
                        borderRadius="xl"
                      >
                        {item.label}
                      </Button>
                    </motion.div>
                  );
                })}
              </SimpleGrid>
            </VStack>
          </motion.div>
        )}

        {step === 'note' && (
          <motion.div
            key="note"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <VStack spacing={3} align="stretch">
              <Heading size="md" textAlign="center" color="purple.700">
                Anything else?
              </Heading>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                Share ideas, bugs, or what you loved — optional
              </Text>
              <Textarea
                placeholder="e.g. I want harder maths puzzles with hints..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                borderRadius="xl"
                resize="vertical"
                maxLength={2000}
              />
            </VStack>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <VStack spacing={4} py={6}>
              <motion.div
                animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6 }}
                style={{ fontSize: '3.5rem' }}
              >
                🎉
              </motion.div>
              <Heading size="md" color="green.600" textAlign="center">
                Thank you!
              </Heading>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                Your ideas shape what we build next for learners like you.
              </Text>
              <Button colorScheme="purple" onClick={onClose} borderRadius="xl">
                Done
              </Button>
            </VStack>
          </motion.div>
        )}
      </AnimatePresence>

      {step !== 'done' && (
        <HStack justify="space-between" pt={2}>
          <Button
            variant="ghost"
            onClick={step === 'rate' ? onClose : goBack}
            isDisabled={submitting}
          >
            {step === 'rate' ? 'Cancel' : 'Back'}
          </Button>
          {step === 'note' ? (
            <Button
              colorScheme="purple"
              onClick={() => void handleSubmit()}
              isLoading={submitting}
              loadingText="Sending..."
              borderRadius="xl"
            >
              Send feedback
            </Button>
          ) : (
            <Button
              colorScheme="purple"
              onClick={goNext}
              isDisabled={step === 'rate' && rating < 1}
              borderRadius="xl"
            >
              Continue
            </Button>
          )}
        </HStack>
      )}
    </VStack>
  );
};
