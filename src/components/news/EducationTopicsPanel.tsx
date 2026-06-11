import { useState, useEffect, useCallback, useMemo } from 'react';
import { FaSyncAlt, FaExclamationCircle, FaSearch, FaTimes, FaGraduationCap, FaCalendarCheck } from 'react-icons/fa';
import { publicApi } from '@/services/api';
import EducationTopicCard from './EducationTopicCard';
import EducationCategoryPicker from './EducationCategoryPicker';
import EducationArticleReader from './EducationArticleReader';
import NewsPagination from './NewsPagination';
import type {
  EducationCategory,
  EducationArticle,
  EducationNewsCategoryId,
} from '@/types/educationNews';

const PAGE_SIZE = 7;

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 animate-pulse rounded-xl ${className}`} />;
}

function formatCacheLabel(date?: string) {
  if (!date) return "Today's edition";
  try {
    return `Saved for ${new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric',
    })}`;
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
  const [readerArticle, setReaderArticle] = useState<EducationArticle | null>(null);

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

  const openReader = useCallback(async (article: EducationArticle) => {
    if (article.formattedParagraphs?.length) {
      setReaderArticle(article);
      return;
    }
    const res = await publicApi.getEducationArticle(article.id, activeId);
    if (res.success && res.article) setReaderArticle(res.article);
    else setReaderArticle(article);
  }, [activeId]);

  const cat = activeCategory || categories.find((c) => c.id === activeId);
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

  const [featured, ...rest] = filtered;

  return (
    <div className="space-y-6">
      {readerArticle && (
        <EducationArticleReader
          article={readerArticle}
          category={cat || undefined}
          onClose={() => setReaderArticle(null)}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800">
        <FaCalendarCheck className="w-4 h-4 flex-shrink-0" aria-hidden />
        <span>
          <strong>{formatCacheLabel(cachedDate)}</strong>
          {' — '}
          Stories are read &amp; cleaned by AI once per day, then saved. No re-fetch until tomorrow.
        </span>
      </div>

      <EducationCategoryPicker
        categories={categories}
        activeId={activeId}
        onSelect={(id) => { setActiveId(id); setPage(1); }}
      />

      {cat && (
        <section className="p-4 md:p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                Step 2 · Explore {cat.label}
              </p>
              <h2 className="text-lg md:text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <span aria-hidden>{cat.icon}</span> What you&apos;ll learn
              </h2>
              <ul className="mt-3 grid sm:grid-cols-2 gap-1.5">
                {cat.topics.map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-gray-600">
                    <FaGraduationCap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => fetchArticles(activeId, page, { forceRefresh: true })}
              disabled={refreshing}
              title="Only needed if you want fresh stories before tomorrow"
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border rounded-xl text-gray-600 hover:border-amber-300 hover:text-amber-800 disabled:opacity-50 self-start"
            >
              <FaSyncAlt className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Rebuilding…' : 'Force refresh'}
            </button>
          </div>
        </section>
      )}

      {!loading && articles.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Step 3 · Read &amp; learn
          </p>
          <div className="bg-white rounded-xl border px-4 py-2.5 flex items-center gap-3 mb-4">
            <FaSearch className="w-4 h-4 text-gray-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search in ${cat?.label || 'this topic'}…`}
              className="flex-1 text-sm bg-transparent outline-none"
              aria-label="Search stories"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-gray-400 hover:text-red-500" aria-label="Clear search">
                <FaTimes className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {!search && totalResults > 0 && (
            <p className="text-xs text-gray-400 mb-3">
              {totalResults} stories · page {page} of {totalPages || 1}
              {fromCache && !refreshing ? ' · loaded from saved cache' : ''}
            </p>
          )}
        </div>
      )}

      {loading && !refreshing ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 text-center py-2">
            {refreshing
              ? 'AI is reading pages, removing junk, and saving today\'s edition…'
              : articles.length === 0
                ? 'First load today: AI reads each page, removes ads & junk, then saves for the day…'
                : 'Loading saved stories…'}
          </p>
          <Skeleton className="h-64 rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-56" />)}
          </div>
        </div>
      ) : error && articles.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border">
          <FaExclamationCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
          <p className="text-gray-600 mb-3">{error}</p>
          <button
            type="button"
            onClick={() => fetchArticles(activeId, 1)}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
          >
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-12 bg-white rounded-2xl border">
          {search ? 'No stories match your search.' : 'No stories yet — tap Force refresh.'}
        </p>
      ) : (
        <>
          {!search && featured && (
            <EducationTopicCard
              article={featured}
              category={cat || undefined}
              variant="featured"
              onRead={openReader}
            />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {(search ? filtered : rest).map((a) => (
              <EducationTopicCard key={a.id} article={a} category={cat || undefined} onRead={openReader} />
            ))}
          </div>
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
    </div>
  );
}
