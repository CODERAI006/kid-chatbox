/**
 * QuizLibraryTab — student-facing browse-and-take view for library quizzes.
 * Quizzes are marked "in_library" by admins and are available on-demand here.
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  Button,
  SimpleGrid,
  Card,
  CardBody,
  Select,
  Input,
  Spinner,
  Alert,
  AlertIcon,
  AlertDescription,
  useToast,
} from '@/shared/design-system';
import { quizApi } from '@/services/api';

interface LibraryQuiz {
  id: string;
  name: string;
  description?: string;
  difficulty: string;
  grade_level?: string;
  subject?: string;
  number_of_questions: number;
  passing_percentage: number;
  time_limit?: number;
  created_at: string;
}

const DIFF_COLOR: Record<string, string> = {
  Basic: 'green', Easy: 'green',
  Medium: 'yellow', Intermediate: 'yellow',
  Hard: 'orange', Advanced: 'orange',
  Expert: 'red',
};

export const QuizLibraryTab: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [quizzes, setQuizzes] = useState<LibraryQuiz[]>([]);
  const [filtered, setFiltered] = useState<LibraryQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  const [search, setSearch]     = useState('');
  const [difficulty, setDiff]   = useState('');
  const [subject, setSubject]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await quizApi.getLibraryQuizzes();
      setQuizzes(res.quizzes ?? []);
    } catch {
      toast({ title: 'Failed to load Quiz Library', status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [location.key, load]);

  // Client-side filtering
  useEffect(() => {
    let out = quizzes;
    if (search.trim())
      out = out.filter(q => q.name.toLowerCase().includes(search.toLowerCase()) ||
        (q.subject || '').toLowerCase().includes(search.toLowerCase()));
    if (difficulty) out = out.filter(q => q.difficulty === difficulty);
    if (subject)    out = out.filter(q => (q.subject || '').toLowerCase().includes(subject.toLowerCase()));
    setFiltered(out);
  }, [quizzes, search, difficulty, subject]);

  const handleStart = async (quiz: LibraryQuiz) => {
    setStarting(quiz.id);
    try {
      const res = await quizApi.startQuizAttempt(quiz.id);
      // Navigate to scheduled test session page, reusing the attempt
      navigate(`/quiz/attempt/${res.attempt.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not start quiz. Please try again.';
      toast({ title: 'Failed to start quiz', description: msg, status: 'error', duration: 4000 });
    } finally {
      setStarting(null);
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" py={16}>
        <Spinner size="xl" color="blue.500" />
        <Text mt={4} color="gray.500">Loading Quiz Library…</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={5} align="stretch" p={4}>
      {/* Filters */}
      <HStack spacing={3} flexWrap="wrap">
        <Input
          placeholder="Search by name or subject…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          maxW="260px"
          size="sm"
          borderRadius="xl"
        />
        <Select
          placeholder="All difficulties"
          value={difficulty}
          onChange={e => setDiff(e.target.value)}
          maxW="180px"
          size="sm"
          borderRadius="xl"
        >
          {['Basic', 'Easy', 'Medium', 'Intermediate', 'Hard', 'Advanced', 'Expert'].map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
        <Input
          placeholder="Filter by subject…"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          maxW="180px"
          size="sm"
          borderRadius="xl"
        />
        {(search || difficulty || subject) && (
          <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setDiff(''); setSubject(''); }}>
            Clear
          </Button>
        )}
      </HStack>

      {filtered.length === 0 && (
        <Alert status="info" borderRadius="lg">
          <AlertIcon />
          <AlertDescription>
            {quizzes.length === 0
              ? 'No quizzes have been published to the library yet. Check back soon!'
              : 'No quizzes match your filters.'}
          </AlertDescription>
        </Alert>
      )}

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
        {filtered.map(quiz => (
          <Card key={quiz.id} borderRadius="xl" boxShadow="sm" _hover={{ boxShadow: 'md' }} transition="box-shadow 0.15s">
            <CardBody>
              <VStack align="stretch" spacing={3}>
                <Box>
                  <Heading size="sm" noOfLines={2} mb={1}>{quiz.name}</Heading>
                  {quiz.description && (
                    <Text fontSize="xs" color="gray.500" noOfLines={2}>{quiz.description}</Text>
                  )}
                </Box>

                <HStack spacing={2} flexWrap="wrap">
                  <Badge colorScheme={DIFF_COLOR[quiz.difficulty] || 'gray'} borderRadius="full" fontSize="xs">
                    {quiz.difficulty}
                  </Badge>
                  {quiz.subject && (
                    <Badge colorScheme="teal" borderRadius="full" fontSize="xs">{quiz.subject}</Badge>
                  )}
                  {quiz.grade_level && (
                    <Badge colorScheme="cyan" borderRadius="full" fontSize="xs">{quiz.grade_level}</Badge>
                  )}
                </HStack>

                <SimpleGrid columns={3} spacing={2} fontSize="xs" color="gray.600">
                  <Box textAlign="center">
                    <Text fontWeight="bold" fontSize="md">{quiz.number_of_questions}</Text>
                    <Text>Questions</Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontWeight="bold" fontSize="md">{quiz.passing_percentage}%</Text>
                    <Text>Pass mark</Text>
                  </Box>
                  <Box textAlign="center">
                    <Text fontWeight="bold" fontSize="md">
                      {quiz.time_limit ? `${quiz.time_limit}m` : '∞'}
                    </Text>
                    <Text>Time</Text>
                  </Box>
                </SimpleGrid>

                <Button
                  colorScheme="blue"
                  size="sm"
                  borderRadius="xl"
                  isLoading={starting === quiz.id}
                  loadingText="Starting…"
                  onClick={() => handleStart(quiz)}
                >
                  🚀 Start Quiz
                </Button>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    </VStack>
  );
};
