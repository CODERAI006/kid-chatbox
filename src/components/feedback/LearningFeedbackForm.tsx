/**
 * Single-page feedback form — rating, feature wishes, and optional note together.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Textarea,
  SimpleGrid,
  Divider,
  useToast,
} from '@/shared/design-system';
import { FEATURE_WISHES, RATING_EMOJIS } from '@/constants/feedback';
import { feedbackApi } from '@/services/api';
import type { FeedbackContext } from '@/types/feedback';

interface LearningFeedbackFormProps {
  context?: FeedbackContext;
  onClose?: () => void;
}

export const LearningFeedbackForm: React.FC<LearningFeedbackFormProps> = ({
  context,
  onClose,
}) => {
  const toast = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [wishes, setWishes] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const headline =
    context?.source === 'quiz_results'
      ? 'How was this quiz experience?'
      : 'Help us build better learning tools';

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
      setSubmitted(true);
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

  if (submitted) {
    return (
      <VStack spacing={4} py={6}>
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <VStack spacing={4}>
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
      </VStack>
    );
  }

  return (
    <VStack spacing={5} align="stretch">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <VStack spacing={5} align="stretch">
            <VStack spacing={3}>
              <Heading size="md" textAlign="center" color="purple.700">
                {headline}
              </Heading>
              <Text fontSize="sm" color="gray.600" textAlign="center">
                Tap how you feel about the app so far
              </Text>
              <HStack spacing={2} justify="center" flexWrap="wrap">
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

            <Divider />

            <VStack spacing={3} align="stretch">
              <Heading size="sm" color="purple.700">
                What should we add next?
              </Heading>
              <Text fontSize="sm" color="gray.600">
                Pick any features that would help you learn better
              </Text>
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
                {FEATURE_WISHES.map((item) => {
                  const active = wishes.includes(item.id);
                  return (
                    <Button
                      key={item.id}
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
                  );
                })}
              </SimpleGrid>
            </VStack>

            <Divider />

            <VStack spacing={3} align="stretch">
              <Heading size="sm" color="purple.700">
                Anything else?
              </Heading>
              <Text fontSize="sm" color="gray.600">
                Share ideas, bugs, or what you loved — optional
              </Text>
              <Textarea
                placeholder="e.g. I want harder maths puzzles with hints..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                borderRadius="xl"
                resize="vertical"
                maxLength={2000}
              />
            </VStack>
          </VStack>
        </motion.div>
      </AnimatePresence>

      <HStack justify="space-between" pt={1}>
        <Button variant="ghost" onClick={onClose} isDisabled={submitting}>
          Cancel
        </Button>
        <Button
          colorScheme="purple"
          onClick={() => void handleSubmit()}
          isLoading={submitting}
          loadingText="Sending..."
          isDisabled={rating < 1}
          borderRadius="xl"
        >
          Send feedback
        </Button>
      </HStack>
    </VStack>
  );
};
