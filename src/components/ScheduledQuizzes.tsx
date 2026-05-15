/**
 * ScheduledQuizzes – User-facing component
 * Shows auto-generated quizzes that are currently live.
 */

import { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Heading, Badge, Button, Spinner,
  SimpleGrid, useColorModeValue, useToast,
} from '@/shared/design-system';
import { motion } from 'framer-motion';

interface GeneratedQuiz {
  id: string;
  quiz_title: string;
  topics: string[];
  questions: unknown[];
  difficulty: string;
  question_count: number;
  visibility_start_time: string;
  visibility_end_time: string | null;
  status: string;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy: 'green', Medium: 'yellow', Hard: 'red', Mixed: 'purple',
};

export const ScheduledQuizzes: React.FC<{ onStartQuiz?: (quiz: GeneratedQuiz) => void }> = ({ onStartQuiz }) => {
  const [quizzes, setQuizzes] = useState<GeneratedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('blue.100', 'blue.700');

  useEffect(() => {
    const fetchActive = async () => {
      try {
        const r = await fetch('/api/quiz-scheduler/active', {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
        });
        const d = await r.json();
        if (d.success) setQuizzes(d.data);
      } catch {
        toast({ title: 'Could not load scheduled quizzes', status: 'error', duration: 3000 });
      } finally {
        setLoading(false);
      }
    };
    fetchActive();
  }, [toast]);

  if (loading) return <Spinner size="md" />;
  if (quizzes.length === 0) return null;

  return (
    <Box mb={6}>
      <Heading size="sm" mb={3} color="blue.500">
        ⏰ Live Scheduled Quizzes
      </Heading>
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
        {quizzes.map((q) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Box
              bg={cardBg}
              border="1px"
              borderColor={borderColor}
              rounded="xl"
              p={4}
              shadow="md"
            >
              <VStack align="start" spacing={2}>
                <Badge colorScheme="blue" fontSize="xs">AUTO-GENERATED</Badge>
                <Text fontWeight="bold" fontSize="sm" noOfLines={2}>{q.quiz_title}</Text>
                <HStack flexWrap="wrap" spacing={1}>
                  {(Array.isArray(q.topics) ? q.topics : []).slice(0, 3).map((t) => (
                    <Badge key={t} colorScheme="gray" variant="subtle" fontSize="xs">{t}</Badge>
                  ))}
                </HStack>
                <HStack spacing={2} fontSize="xs" color="gray.500">
                  <Badge colorScheme={DIFFICULTY_COLOR[q.difficulty] || 'gray'}>{q.difficulty}</Badge>
                  <Text>{q.question_count} questions</Text>
                </HStack>
                {q.visibility_end_time && (
                  <Text fontSize="xs" color="orange.500">
                    Ends: {new Date(q.visibility_end_time).toLocaleTimeString()}
                  </Text>
                )}
                <Button
                  size="sm"
                  colorScheme="blue"
                  w="full"
                  mt={1}
                  onClick={() => onStartQuiz?.(q)}
                  isDisabled={!onStartQuiz}
                >
                  Start Quiz →
                </Button>
              </VStack>
            </Box>
          </motion.div>
        ))}
      </SimpleGrid>
    </Box>
  );
};
