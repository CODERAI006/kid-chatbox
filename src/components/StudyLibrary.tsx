/**
 * Study Library Component
 * Browse and search existing study materials created by other users
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Input,
  Button,
  Select,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  InputGroup,
  InputLeftElement,
  IconButton,
  Divider,
} from '@/shared/design-system';
import { motion } from 'framer-motion';
import { studyApi, authApi } from '@/services/api';
import { SUBJECTS } from '@/constants/quiz';
import { PullToRefresh } from './PullToRefresh';
import { ListLoadMoreFooter } from '@/components/shared/ListLoadMoreFooter';
import { useCompactListView } from '@/hooks/useCompactListView';
import NewsPagination from './news/NewsPagination';

interface StudySession {
  id: string;
  topic: string;
  lesson_title: string;
  subject: string;
  difficulty?: string;
  age?: number;
  language: string;
  lesson_summary: string;
  created_by_name: string;
  view_count: number;
  timestamp: string;
  // Admin content properties
  content_source?: 'admin_content';
  contentType?: 'ppt' | 'pdf' | 'text' | 'image' | 'doc';
  grade?: string;
  is_general?: boolean;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  textContent?: string;
}

const PAGE_SIZE = 20;

/**
 * Study Library component
 */
export const StudyLibrary: React.FC = () => {
  const navigate = useNavigate();
  const isCompactListView = useCompactListView();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    subject: '',
    age: '',
    difficulty: '',
    language: '',
    sortBy: 'timestamp',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const { user } = authApi.getCurrentUser();
  const userGrade = (user as { grade?: string } | undefined)?.grade;

  const loadStudyLibrary = useCallback(async (pageNum: number, { append = false } = {}) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      const data = await studyApi.getStudyLibrary({
        search: searchQuery || undefined,
        subject: filters.subject || undefined,
        age: filters.age ? parseInt(filters.age) : undefined,
        difficulty: filters.difficulty || undefined,
        language: filters.language || undefined,
        limit: PAGE_SIZE,
        offset: (pageNum - 1) * PAGE_SIZE,
        sortBy: filters.sortBy as 'timestamp' | 'popularity',
      });

      if (data?.sessions) {
        const nextSessions = data.sessions as StudySession[];
        setSessions((prev) => (append ? [...prev, ...nextSessions] : nextSessions));
        setTotalPages(data.pagination?.pages || 1);
        setTotalResults(data.pagination?.total || nextSessions.length);
      } else {
        setSessions([]);
        setTotalPages(1);
        setTotalResults(0);
      }
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load study library. Please try again later.';
      setError(errorMessage);
      console.error('Study library load error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, searchQuery]);

  useEffect(() => {
    const append = isCompactListView && page > 1;
    loadStudyLibrary(page, { append });
  }, [filters, page, isCompactListView, loadStudyLibrary]);

  useEffect(() => {
    // Client-side fuzzy search using Fuse.js
    if (searchQuery.trim()) {
      const fuse = new Fuse(sessions, {
        keys: ['topic', 'lesson_title', 'subject', 'lesson_summary'],
        threshold: 0.3, // Lower = more strict matching
        includeScore: true,
      });

      const results = fuse.search(searchQuery);
      setFilteredSessions(results.map((result) => result.item));
    } else {
      setFilteredSessions(sessions);
    }
  }, [searchQuery, sessions]);

  const hasMore = page < totalPages;

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    setPage((p) => p + 1);
  }, [hasMore, loading, loadingMore]);

  const handleRefresh = async () => {
    setPage(1);
    await loadStudyLibrary(1, { append: false });
  };

  const handleViewStudy = (sessionId: string) => {
    navigate(`/study-library/${sessionId}`);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPage(1); // Reset to first page on filter change
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'green';
      case 'medium':
        return 'yellow';
      case 'hard':
        return 'red';
      default:
        return 'gray';
    }
  };

  if (loading && sessions.length === 0) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading study library...</Text>
      </Box>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <Box p={6}>
      <VStack spacing={6} align="stretch">
        <Heading size="lg" color="blue.600">
          📚 Study Library
        </Heading>
        <Text color="gray.600">
          Browse study materials for your grade and subject, plus general resources from your teachers
        </Text>
        {userGrade && (
          <Badge colorScheme="blue" alignSelf="flex-start">
            Showing content for: {userGrade}
          </Badge>
        )}

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Search and Filters */}
        <Card>
          <CardBody>
            <VStack spacing={4}>
              {/* Search Bar */}
              <InputGroup size="lg">
                <InputLeftElement pointerEvents="none">
                  <Text fontSize="xl">🔍</Text>
                </InputLeftElement>
                <Input
                  placeholder="Search by topic, title, or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <IconButton
                    aria-label="Clear search"
                    icon={<Text>✕</Text>}
                    onClick={() => setSearchQuery('')}
                    variant="ghost"
                    position="absolute"
                    right={2}
                  />
                )}
              </InputGroup>

              {/* Filters */}
              <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4} w="100%">
                <Select
                  placeholder="Subject"
                  value={filters.subject}
                  onChange={(e) => handleFilterChange('subject', e.target.value)}
                >
                  <option value="">All Subjects</option>
                  {Object.values(SUBJECTS).map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </Select>

                <Select
                  placeholder="Age"
                  value={filters.age}
                  onChange={(e) => handleFilterChange('age', e.target.value)}
                >
                  <option value="">All Ages</option>
                  <option value="6">6 years</option>
                  <option value="7">7 years</option>
                  <option value="8">8 years</option>
                  <option value="9">9 years</option>
                  <option value="10">10 years</option>
                  <option value="11">11 years</option>
                  <option value="12">12 years</option>
                  <option value="13">13 years</option>
                  <option value="14">14 years</option>
                </Select>

                <Select
                  placeholder="Difficulty"
                  value={filters.difficulty}
                  onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                >
                  <option value="">All Levels</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>

                <Select
                  placeholder="Language"
                  value={filters.language}
                  onChange={(e) => handleFilterChange('language', e.target.value)}
                >
                  <option value="">All Languages</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Hinglish">Hinglish</option>
                </Select>

                <Select
                  placeholder="Sort By"
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                >
                  <option value="timestamp">Newest First</option>
                  <option value="popularity">Most Popular</option>
                </Select>
              </SimpleGrid>

              {/* Clear Filters */}
              {(filters.subject ||
                filters.age ||
                filters.difficulty ||
                filters.language ||
                searchQuery) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setFilters({
                      subject: '',
                      age: '',
                      difficulty: '',
                      language: '',
                      sortBy: 'timestamp',
                    });
                    setSearchQuery('');
                    setPage(1);
                  }}
                >
                  Clear All Filters
                </Button>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Results Count */}
        <HStack justify="space-between">
          <Text color="gray.600">
            {filteredSessions.length > 0
              ? `Found ${filteredSessions.length} study material${filteredSessions.length > 1 ? 's' : ''}`
              : 'No study materials found'}
          </Text>
        </HStack>

        {/* Study Materials Grid */}
        {filteredSessions.length > 0 ? (
          <>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {filteredSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card
                    cursor="pointer"
                    h="100%"
                    onClick={() => handleViewStudy(session.id)}
                    _hover={{ shadow: 'lg', borderColor: 'blue.300' }}
                    borderWidth="2px"
                    borderColor="transparent"
                    transition="all 0.2s"
                  >
                    <CardHeader>
                      <VStack align="start" spacing={2}>
                        <Heading size="sm" noOfLines={2}>
                          {session.lesson_title}
                        </Heading>
                        <HStack>
                          <Badge colorScheme="blue">
                            {session.is_general ? 'General' : session.subject || 'Study'}
                          </Badge>
                          {session.grade && (
                            <Badge colorScheme="cyan">{session.grade}</Badge>
                          )}
                          {session.content_source === 'admin_content' && (
                            <Badge
                              colorScheme={
                                session.contentType === 'pdf'
                                  ? 'red'
                                  : session.contentType === 'image'
                                    ? 'purple'
                                    : session.contentType === 'doc'
                                      ? 'orange'
                                      : session.contentType === 'ppt'
                                        ? 'blue'
                                        : 'green'
                              }
                            >
                              {session.contentType?.toUpperCase() || 'TEXT'}
                            </Badge>
                          )}
                          {session.difficulty && (
                            <Badge colorScheme={getDifficultyColor(session.difficulty)}>
                              {session.difficulty}
                            </Badge>
                          )}
                          {session.age && <Badge>{session.age} years</Badge>}
                        </HStack>
                      </VStack>
                    </CardHeader>
                    <CardBody>
                      <VStack align="start" spacing={2}>
                        <Text fontSize="sm" color="gray.600" noOfLines={3}>
                          {session.lesson_summary || session.topic}
                        </Text>
                        <Divider />
                        <HStack justify="space-between" w="100%" fontSize="xs" color="gray.500">
                          <Text>By: {session.created_by_name}</Text>
                          <Text>👁️ {session.view_count || 0} views</Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.400">
                          {new Date(session.timestamp).toLocaleDateString()}
                        </Text>
                      </VStack>
                    </CardBody>
                  </Card>
                </motion.div>
              ))}
            </SimpleGrid>

            {/* Pagination — desktop only; mobile/tablet use infinite scroll */}
            {totalPages > 1 && isCompactListView && (
              <ListLoadMoreFooter
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={loadMore}
                observeKey={filteredSessions.length}
                loadMoreLabel={`Load ${PAGE_SIZE} more`}
                endLabel={`You've seen all ${totalResults} study materials.`}
                spinnerColor="blue.400"
              />
            )}

            {totalPages > 1 && !isCompactListView && (
              <NewsPagination
                page={page}
                totalPages={totalPages}
                totalResults={totalResults}
                pageSize={PAGE_SIZE}
                loading={loading}
                itemLabel="materials"
                onPageChange={(p) => {
                  setPage(p);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </>
        ) : (
          <Card>
            <CardBody textAlign="center" py={10}>
              <Text fontSize="xl" mb={2}>
                📭
              </Text>
              <Text color="gray.600">
                No study materials found. Try adjusting your filters or create a new study session.
              </Text>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Box>
    </PullToRefresh>
  );
};

