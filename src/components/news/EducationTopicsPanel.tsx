import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  HStack,
  Input,
  Skeleton,
  Text,
  VStack,
} from '@/shared/design-system';
import { publicApi } from '@/services/api';
import { QuizSectionLabel } from '@/components/quiz/quizFormUi';
import EducationNewsListItem from './EducationNewsListItem';
import EducationCategoryPicker from './EducationCategoryPicker';
import NewsPagination from './NewsPagination';
import type {
  EducationCategory,
  EducationArticle,
  EducationNewsCategoryId,
} from '@/types/educationNews';

const PAGE_SIZE = 8;

function formatCacheLabel(date?: string) {
  if (!date) return "Today's edition";
  try {
    return new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return "Today's edition";
  }
}

export default function EducationTopicsPanel() {
  const [categories, setCategories] = useState<EducationCategory[]>([]);
  const [activeId, setActiveId] = useState<EducationNewsCategoryId>('science');
  const [articles, setArticles] = useState<EducationArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [activeCategory, setActiveCategory] = useState<EducationCategory | null>(null);
  const [search, setSearch] = useState('');
  const [cachedDate, setCachedDate] = useState<string>();
  const [fromCache, setFromCache] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    publicApi.getEducationNewsTopics().then((res) => {
      if (res.success && res.categories.length) {
        setCategories(res.categories);
        setActiveId(res.categories[0].id);
      }
    });
  }, []);

  const fetchArticles = useCallback(async (
    categoryId: EducationNewsCategoryId,
    pageNum: number,
    { forceRefresh = false } = {},
  ) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    if (forceRefresh) setSearch('');

    try {
      const res = await publicApi.getEducationNewsByCategory({
        category: categoryId,
        page: pageNum,
        pageSize: PAGE_SIZE,
        forceRefresh,
      });
      if (res.success) {
        setArticles(res.articles);
        setTotalResults(res.totalResults);
        setActiveCategory(res.category);
        setPage(pageNum);
        setCachedDate(res.cachedDate);
        setFromCache(res.fromCache ?? true);
      } else {
        setError(res.message || 'Could not load stories for this topic.');
      }
    } catch {
      setError('Unable to reach the news service. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (activeId) fetchArticles(activeId, 1);
  }, [activeId, fetchArticles]);

  const cat = activeCategory || categories.find((c) => c.id === activeId);

  const openReader = useCallback(
    (article: EducationArticle) => {
      navigate(
        `/education-news/read/${encodeURIComponent(article.id)}?category=${activeId}`,
        { state: { article, category: cat ?? undefined } },
      );
    },
    [navigate, activeId, cat],
  );
  const totalPages = Math.ceil(totalResults / PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.kidSummary || a.description).toLowerCase().includes(q),
    );
  }, [articles, search]);

  return (
    <VStack align="stretch" spacing={{ base: 4, md: 5 }} w="100%" minW={0}>
      <Box
        p={{ base: 3, md: 5 }}
        borderRadius={{ base: 'xl', md: '2xl' }}
        bgGradient="linear(to-br, blue.500, blue.600, cyan.500)"
        color="white"
        boxShadow="md"
      >
        <VStack align="stretch" spacing={3}>
          <Box>
            <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="extrabold">
              Stories for curious learners
            </Text>
            <Text fontSize={{ base: '2xs', sm: 'xs', md: 'sm' }} color="blue.50" mt={1}>
              AI-curated from trusted feeds — science, history, geography &amp; more.
            </Text>
          </Box>
          <HStack flexWrap="wrap" gap={2} justify="space-between" align={{ base: 'stretch', sm: 'center' }}>
            <HStack
              spacing={2}
              bg="whiteAlpha.200"
              borderRadius="lg"
              px={3}
              py={1.5}
              fontSize={{ base: '2xs', sm: 'xs' }}
              fontWeight="semibold"
            >
              <Text aria-hidden>📅</Text>
              <Text>{formatCacheLabel(cachedDate)}</Text>
              {fromCache && !refreshing && <Text opacity={0.85}>· saved edition</Text>}
            </HStack>
            <Button
              size="sm"
              bg="whiteAlpha.250"
              color="white"
              _hover={{ bg: 'whiteAlpha.400' }}
              leftIcon={<Text aria-hidden>🔄</Text>}
              onClick={() => fetchArticles(activeId, page, { forceRefresh: true })}
              isLoading={refreshing}
              loadingText="Refreshing"
              flexShrink={0}
            >
              Refresh stories
            </Button>
          </HStack>
        </VStack>
      </Box>

      <EducationCategoryPicker
        categories={categories}
        activeId={activeId}
        onSelect={(id) => { setActiveId(id); setPage(1); }}
      />

      {cat && (
        <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.500">
          {cat.icon} <Text as="span" fontWeight="semibold" color="gray.700">{cat.label}</Text>
          {' — '}{cat.description}
        </Text>
      )}

      {!loading && articles.length > 0 && (
        <Box minW={0}>
          <QuizSectionLabel>Search stories</QuizSectionLabel>
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or topic…"
            size="sm"
            bg="white"
            borderRadius="lg"
          />
        </Box>
      )}

      {loading && !refreshing ? (
        <VStack spacing={3} align="stretch">
          <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.500" textAlign="center">
            Loading stories…
          </Text>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height="112px" borderRadius="xl" />
          ))}
        </VStack>
      ) : error && articles.length === 0 ? (
        <Box textAlign="center" py={10} bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200">
          <Text fontSize={{ base: 'xl', md: '2xl' }} mb={2} aria-hidden>⚠️</Text>
          <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.600" mb={4} px={4}>{error}</Text>
          <Button size="sm" colorScheme="blue" leftIcon={<Text aria-hidden>🔄</Text>} onClick={() => fetchArticles(activeId, 1)}>
            Try again
          </Button>
        </Box>
      ) : filtered.length === 0 ? (
        <Text textAlign="center" fontSize={{ base: 'sm', md: 'md' }} color="gray.500" py={8}>
          {search ? 'No stories match your search.' : 'No stories yet — tap Refresh stories.'}
        </Text>
      ) : (
        <>
          <VStack align="stretch" spacing={{ base: 3, md: 4 }} role="feed" aria-label="Education news stories">
            {filtered.map((article, index) => (
              <EducationNewsListItem
                key={article.id}
                article={article}
                category={cat || undefined}
                variant={!search && page === 1 && index === 0 ? 'hero' : 'row'}
                onRead={openReader}
              />
            ))}
          </VStack>

          {!search && totalPages > 1 && (
            <NewsPagination
              page={page}
              totalPages={totalPages}
              totalResults={totalResults}
              pageSize={PAGE_SIZE}
              loading={loading || refreshing}
              onPageChange={(p) => {
                fetchArticles(activeId, p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </>
      )}
    </VStack>
  );
}
