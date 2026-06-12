/**
 * Compact CTA card shown after quiz completion to open feedback.
 */

import { motion } from 'framer-motion';
import { Box, HStack, VStack, Text, Button, Card, CardBody } from '@/shared/design-system';
import { openAppFeedback } from './feedbackEvents';

interface FeedbackPromptCardProps {
  quizSubject?: string;
  quizScore?: number;
  quizTotal?: number;
  delay?: number;
}

export const FeedbackPromptCard: React.FC<FeedbackPromptCardProps> = ({
  quizSubject,
  quizScore,
  quizTotal,
  delay = 1.4,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.45, type: 'spring', stiffness: 120 }}
    style={{ width: '100%' }}
  >
    <Card
      borderRadius="2xl"
      overflow="hidden"
      boxShadow="lg"
      bgGradient="linear(135deg, purple.50 0%, blue.50 100%)"
      borderWidth="1px"
      borderColor="purple.100"
    >
      <CardBody py={5}>
        <HStack spacing={4} align="center" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
          <motion.div
            animate={{ rotate: [0, 6, -6, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            style={{ fontSize: '2.5rem' }}
          >
            💬
          </motion.div>
          <VStack align="start" spacing={1} flex={1} minW={0}>
            <Text fontWeight="bold" color="purple.800">
              Got ideas for better learning?
            </Text>
            <Text fontSize="sm" color="gray.600">
              Vote for new features — games, streaks, voice help, and more
            </Text>
          </VStack>
          <Box>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Button
                colorScheme="purple"
                size="md"
                borderRadius="xl"
                onClick={() =>
                  openAppFeedback({
                    source: 'quiz_results',
                    quizSubject,
                    quizScore,
                    quizTotal,
                  })
                }
              >
                Share feedback
              </Button>
            </motion.div>
          </Box>
        </HStack>
      </CardBody>
    </Card>
  </motion.div>
);
