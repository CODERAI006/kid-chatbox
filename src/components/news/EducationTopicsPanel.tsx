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
import { ListLoadMoreFooter } from '@/components/shared/ListLoadMoreFooter';
import { useCompactListView } from '@/hooks/useCompactListView';
import EducationNewsListItem from './EducationNewsListItem';
import EducationCategoryPicker from './EducationCategoryPicker';
import NewsPagination from './NewsPagination';
import type {
  EducationCategory,
  EducationArticle,
  EducationNewsCategoryId,
} from '@/types/educationNews';
import {
  ALL_NEWS_CATEGORY,
  EDUCATION_NEWS_MOBILE_PAGE_SIZE,
  EDUCATION_NEWS_WEB_PAGE_SIZE,
} from '@/types/educationNews';

function dedupeArticles(items: EducationArticle[]): EducationArticle[] {
  const seen = new Set<string>();
  return items.filter((article) => {
    const key = article.id || article.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function EducationTopicsPanel() {
  const isCompactListView = useCompactListView();
  const pageSize = isCompactListView ? EDUCATION_NEWS_MOBILE_PAGE_SIZE : EDUCATION_NEWS_WEB_PAGE_SIZE;
  const [categories, setCategories] = useState<EducationCategory[]>([]);
  const [activeId, setActiveId] = useState<EducationNewsCategoryId>('all');
  const [articles, setArticles] = useState<EducationArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [activeCategory, setActiveCategory] = useState<EducationCategory | null>(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    publicApi.getEducationNewsTopics().then((res) => {
      if (res.success && res.categories.length) {
        setCategories(res.categories);
      }
    });
  }, []);

  const fetchArticles = useCallback(async (
    categoryId: EducationNewsCategoryId,
    pageNum: number,
    { forceRefresh = false, append = false } = {},
  ) => {
    if (forceRefresh) setRefreshing(true);
    else if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    if (forceRefresh) setSearch('');

    try {
      const res = await publicApi.getEducationNewsByCategory({
        category: categoryId,
        page: pageNum,
        pageSize,
        forceRefresh,
      });
      if (res.success) {
        setArticles((prev) => dedupeArticles(append ? [...prev, ...res.articles] : res.articles));
        setTotalResults(res.totalResults);
        setActiveCategory(res.category);
        setPage(pageNum);
      } else {
        setError(res.message || 'Could not load stories for this topic.');
      }
    } catch {
      setError('Unable to reach the news service. Check your connection.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [pageSize]);

  useEffect(() => {
    if (activeId) fetchArticles(activeId, 1);
  }, [activeId, fetchArticles, isCompactListView]);

  const cat = activeCategory || categories.find((c) => c.id === activeId) || (activeId === 'all' ? ALL_NEWS_CATEGORY : undefined);

  const categoryById = useMemo(() => {
    const map = new Map<EducationNewsCategoryId, EducationCategory>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const articleCategory = useCallback(
    (article: EducationArticle) => {
      if (activeId !== 'all') return cat ?? undefined;
      return categoryById.get(article.category) ?? undefined;
    },
    [activeId, cat, categoryById],
  );

  const openReader = useCallback(
    (article: EducationArticle) => {
      const readerCategory = activeId === 'all'
        ? categoryById.get(article.category)
        : cat;
      const readerCategoryId = activeId === 'all' ? article.category : activeId;
      navigate(
        `/education-news/read/${encodeURIComponent(article.id)}?category=${readerCategoryId}`,
        { state: { article, category: readerCategory ?? undefined } },
      );
    },
    [navigate, activeId, cat, categoryById],
  );
  const totalPages = Math.ceil(totalResults / pageSize);
  const hasMore = !search && page < totalPages;

  const loadMore = useCallback(() => {
    if (loading || loadingMore || refreshing || !hasMore) return;
    fetchArticles(activeId, page + 1, { append: true });
  }, [activeId, fetchArticles, hasMore, loading, loadingMore, page, refreshing]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.kidSummary || a.description).toLowerCase().includes(q),
    );
  }, [articles, search]);

  const pickerCategories = useMemo(
    () => [ALL_NEWS_CATEGORY, ...categories],
    [categories],
  );

  return (
    <VStack align="stretch" spacing={{ base: 4, md: 5 }} w="100%" minW={0}>
      <Box
        p={{ base: 3, md: 4 }}
        borderRadius={{ base: 'xl', md: '2xl' }}
        bgGradient="linear(to-br, blue.500, blue.600, cyan.500)"
        color="white"
        boxShadow="md"
      >
        <HStack justify="space-between" align="center" spacing={3}>
          <Box flex={1} minW={0}>
            <Text fontSize={{ base: 'sm', md: 'md' }} fontWeight="extrabold">
              Stories for curious learners
            </Text>
            <Text fontSize={{ base: '2xs', sm: 'xs' }} color="blue.50" mt={0.5} noOfLines={1}>
              {activeId === 'all' && totalResults > 0
                ? `${totalResults} stories from every topic — tap any story to read in-app.`
                : 'Pick a topic below — tap any story to read in-app.'}
            </Text>
          </Box>
          <Button
            size="sm"
            bg="whiteAlpha.250"
            color="white"
            _hover={{ bg: 'whiteAlpha.400' }}
            aria-label="Refresh stories"
            onClick={() => fetchArticles(activeId, 1, { forceRefresh: true })}
            isLoading={refreshing}
            flexShrink={0}
            minW="auto"
            px={3}
          >
            🔄
          </Button>
        </HStack>
      </Box>

      <EducationCategoryPicker
        categories={pickerCategories}
        activeId={activeId}
        onSelect={(id) => { setActiveId(id); setPage(1); }}
      />

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
                category={articleCategory(article)}
                variant={!search && page === 1 && index === 0 ? 'hero' : 'row'}
                onRead={openReader}
              />
            ))}
          </VStack>

          {!search && totalPages > 1 && isCompactListView && (
            <ListLoadMoreFooter
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
              observeKey={filtered.length}
              loadMoreLabel={`Load ${pageSize} more stories`}
              endLabel={`You've read all ${totalResults} stories.`}
              spinnerColor="blue.400"
            />
          )}

          {!search && totalPages > 1 && !isCompactListView && (
            <NewsPagination
              page={page}
              totalPages={totalPages}
              totalResults={totalResults}
              pageSize={pageSize}
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
