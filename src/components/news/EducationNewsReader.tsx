import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Box, Spinner, Text, VStack, Button } from '@/shared/design-system';
import { publicApi } from '@/services/api';
import EducationNewsInAppBrowser from './EducationNewsInAppBrowser';
import type {
  EducationArticle,
  EducationCategory,
  EducationNewsCategoryId,
} from '@/types/educationNews';
import { ALL_NEWS_CATEGORY } from '@/types/educationNews';

type ReaderLocationState = {
  article?: EducationArticle;
  category?: EducationCategory;
};

export default function EducationNewsReader() {
  const { articleId } = useParams<{ articleId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const categoryParam = searchParams.get('category') as EducationNewsCategoryId | null;
  const state = (location.state as ReaderLocationState | null) ?? {};

  const [article, setArticle] = useState<EducationArticle | null>(state.article ?? null);
  const [category, setCategory] = useState<EducationCategory | undefined>(state.category);
  const [loading, setLoading] = useState(!state.article);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.article || !articleId || !categoryParam) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    publicApi.getEducationArticle(articleId, categoryParam).then((res) => {
      if (cancelled) return;
      if (res.success && res.article) {
        setArticle(res.article);
      } else {
        setError(res.message || 'Story not found');
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [articleId, categoryParam, state.article]);

  useEffect(() => {
    if (category || !categoryParam) return;
    if (categoryParam === 'all') {
      setCategory(ALL_NEWS_CATEGORY);
      return;
    }
    publicApi.getEducationNewsTopics().then((res) => {
      if (res.success) {
        const match = res.categories.find((c) => c.id === categoryParam);
        if (match) setCategory(match);
      }
    });
  }, [category, categoryParam]);

  const goBack = () => navigate('/education-news');

  if (loading) {
    return (
      <VStack py={20} spacing={3}>
        <Spinner size="lg" color="blue.500" />
        <Text color="gray.600" fontSize="sm">
          Opening story…
        </Text>
      </VStack>
    );
  }

  if (error || !article) {
    return (
      <Box textAlign="center" py={16} px={4}>
        <Text fontSize="2xl" mb={2} aria-hidden>
          📰
        </Text>
        <Text color="gray.600" mb={4}>
          {error || 'Story not found'}
        </Text>
        <Button size="sm" colorScheme="blue" onClick={goBack}>
          Back to Education News
        </Button>
      </Box>
    );
  }

  return (
    <EducationNewsInAppBrowser article={article} category={category} onClose={goBack} />
  );
}
