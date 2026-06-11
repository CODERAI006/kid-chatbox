/**
 * QuizLibraryTab — student-facing browse-and-take view for library quizzes.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  SimpleGrid,
  Select,
  Input,
  Spinner,
  Alert,
  AlertIcon,
  AlertDescription,
  useToast,
} from '@/shared/design-system';
import { quizApi } from '@/services/api';
import { QuizLibraryCard, type QuizLibraryCardQuiz } from './quizLibrary/QuizLibraryCard';
import {
  filterByOwnership,
  SOURCE_COLOR,
  SOURCE_LABEL,
  type LibraryFilter,
  type QuizGenerationSource,
} from './quizLibrary/quizLibraryStyles';

type NavState = { libraryRefresh?: number; highlightQuizId?: string } | null;

function quizMatchesSearch(quiz: QuizLibraryCardQuiz, term: string): boolean {
  const t = term.toLowerCase();
  const title = quiz.name.replace(/^AI Quiz:\s*/i, '').toLowerCase();
  if (title.includes(t)) return true;
  if ((quiz.subject || '').toLowerCase().includes(t)) return true;
  return (quiz.subtopics || []).some((st) => st.toLowerCase().includes(t));
}

const LEGEND_SOURCES: QuizGenerationSource[] = ['mine', 'peer', 'admin', 'other'];

export const QuizLibraryTab: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const navState = location.state as NavState;
  const highlightQuizId = navState?.highlightQuizId;

  const [quizzes, setQuizzes] = useState<QuizLibraryCardQuiz[]>([]);
  const [filtered, setFiltered] = useState<QuizLibraryCardQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [ownershipFilter, setOwnershipFilter] = useState<LibraryFilter>('all');

  const [search, setSearch] = useState('');
  const [difficulty, setDiff] = useState('');
  const [subject, setSubject] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await quizApi.getLibraryQuizzes();
      setQuizzes((res.quizzes ?? []) as QuizLibraryCardQuiz[]);
    } catch {
      toast({ title: 'Failed to load Quiz Library', status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [location.key, navState?.libraryRefresh, load]);

  const counts = useMemo(() => {
    const mine = quizzes.filter(
      (q: QuizLibraryCardQuiz) => q.generation_source === 'mine' || q.is_mine
    ).length;
    const peer = quizzes.filter((q: QuizLibraryCardQuiz) => q.generation_source === 'peer').length;
    return { mine, peer, all: quizzes.length };
  }, [quizzes]);

  useEffect(() => {
    let out = filterByOwnership(quizzes, ownershipFilter);
    if (search.trim()) out = out.filter((q) => quizMatchesSearch(q, search.trim()));
    if (difficulty) out = out.filter((q) => q.difficulty === difficulty);
    if (subject) out = out.filter((q) => (q.subject || '').toLowerCase().includes(subject.toLowerCase()));
    setFiltered(out);
  }, [quizzes, search, difficulty, subject, ownershipFilter]);

  const handleStart = async (quiz: QuizLibraryCardQuiz) => {
    setStarting(quiz.id);
    try {
      const res = await quizApi.startQuizAttempt(quiz.id);
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
        <Text mt={4} color="gray.500">
          Loading Quiz Library…
        </Text>
      </Box>
    );
  }

  return (
    <VStack spacing={5} align="stretch" p={4}>
      <HStack spacing={2} flexWrap="wrap">
        {LEGEND_SOURCES.map((src) => (
          <Badge key={src} colorScheme={SOURCE_COLOR[src]} borderRadius="full" fontSize="xs">
            {SOURCE_LABEL[src]}
          </Badge>
        ))}
      </HStack>

      <HStack spacing={0} flexWrap="wrap" borderWidth="1px" borderRadius="md" overflow="hidden" w="fit-content">
        <Button
          size="sm"
          variant={ownershipFilter === 'all' ? 'solid' : 'ghost'}
          colorScheme={ownershipFilter === 'all' ? 'blue' : 'gray'}
          borderRadius={0}
          onClick={() => setOwnershipFilter('all')}
        >
          All ({counts.all})
        </Button>
        <Button
          size="sm"
          variant={ownershipFilter === 'mine' ? 'solid' : 'ghost'}
          colorScheme={ownershipFilter === 'mine' ? 'blue' : 'gray'}
          borderRadius={0}
          onClick={() => setOwnershipFilter('mine')}
        >
          My quizzes ({counts.mine})
        </Button>
        <Button
          size="sm"
          variant={ownershipFilter === 'peer' ? 'solid' : 'ghost'}
          colorScheme={ownershipFilter === 'peer' ? 'teal' : 'gray'}
          borderRadius={0}
          onClick={() => setOwnershipFilter('peer')}
        >
          Same grade — others ({counts.peer})
        </Button>
      </HStack>

      <HStack spacing={3} flexWrap="wrap">
        <Input
          placeholder="Search by name, subject, or subtopic…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxW="260px"
          size="sm"
          borderRadius="xl"
        />
        <Select
          placeholder="All difficulties"
          value={difficulty}
          onChange={(e) => setDiff(e.target.value)}
          maxW="180px"
          size="sm"
          borderRadius="xl"
        >
          {['Basic', 'Easy', 'Medium', 'Intermediate', 'Hard', 'Advanced', 'Expert'].map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Filter by subject…"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxW="180px"
          size="sm"
          borderRadius="xl"
        />
        {(search || difficulty || subject) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearch('');
              setDiff('');
              setSubject('');
            }}
          >
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
        {filtered.map((quiz) => (
          <QuizLibraryCard
            key={quiz.id}
            quiz={quiz}
            isHighlighted={highlightQuizId === quiz.id}
            isStarting={starting === quiz.id}
            onStart={handleStart}
          />
        ))}
      </SimpleGrid>
    </VStack>
  );
};
