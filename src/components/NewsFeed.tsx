import { useState, useEffect, useCallback } from 'react';
import { FaNewspaper, FaSearch, FaTimes, FaSyncAlt, FaExclamationCircle } from 'react-icons/fa';
import { publicApi } from '@/services/api';
import NewsCard from './news/NewsCard';
import NewsPagination from './news/NewsPagination';

interface NewsArticle {
  source: { id: string | null; name: string };
  author: string;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

const PAGE_SIZE = 10;

// ── Skeleton ──────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 animate-pulse rounded-xl ${className}`} />;
}

function LoadingGrid() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Skeleton className="h-10 w-64 mb-6" />
      <Skeleton className="h-10 w-full mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Skeleton className="md:col-span-2 h-96 rounded-2xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[180px] rounded-xl" />
          <Skeleton className="h-[180px] rounded-xl" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function NewsFeed() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNews = useCallback(async (pageNum: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await publicApi.getEducationNews({ page: pageNum, pageSize: PAGE_SIZE });
      if (res.success) {
        setArticles(res.articles);
        setTotalResults(res.totalResults);
        setPage(pageNum);
      } else {
        setError('Failed to load articles. Please try again.');
      }
    } catch {
      setError('Unable to reach the news service. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNews(1); }, [fetchNews]);

  const handlePageChange = (newPage: number) => {
    fetchNews(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalResults / PAGE_SIZE);
  const filtered = searchQuery.trim()
    ? articles.filter((a) => {
        const q = searchQuery.toLowerCase();
        return a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.source.name.toLowerCase().includes(q);
      })
    : articles;

  if (loading && !refreshing) return <LoadingGrid />;

  if (error && articles.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white rounded-3xl shadow-xl p-10">
          <FaExclamationCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">Could Not Load News</h3>
          <p className="text-gray-500 mb-6 text-sm">{error}</p>
          <button
            onClick={() => fetchNews(1)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Slice articles for editorial layout
  const [featured, sec1, sec2, ...gridArticles] = filtered;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">

      {/* ── Breaking news ticker ──────────────────────────────────────── */}
      {articles.length > 0 && (
        <div className="bg-red-600 text-white text-xs font-semibold flex items-center overflow-hidden" style={{ height: 36 }}>
          <span className="flex-shrink-0 bg-red-800 px-4 py-2 uppercase tracking-widest whitespace-nowrap h-full flex items-center">
            🔴 Breaking
          </span>
          <div className="overflow-hidden flex-1 relative h-full">
            <div
              className="whitespace-nowrap absolute top-0 left-0 h-full flex items-center pl-4 gap-12"
              style={{ animation: 'tickerScroll 45s linear infinite' }}
            >
              {[...articles.slice(0, 6), ...articles.slice(0, 6)].map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                   className="hover:underline opacity-90 hover:opacity-100 whitespace-nowrap">
                  ● {a.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-md">
              <FaNewspaper className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-blue-700">
                Education News
              </h1>
              <p className="text-xs text-gray-400">
                {totalResults > 0 ? `${totalResults.toLocaleString()} articles found` : 'Latest updates from education'}
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchNews(page, true)}
            disabled={refreshing}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 shadow-sm disabled:opacity-50 transition-all"
          >
            <FaSyncAlt className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* ── Search ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-2.5 mb-6 flex items-center gap-3">
          <FaSearch className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles by title or source…"
            className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
          {searchQuery && (
            <>
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                <FaTimes className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* ── Empty state ─────────────────────────────────────────────── */}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center border border-gray-100">
            <FaNewspaper className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <h3 className="text-base font-bold text-gray-700 mb-2">No Articles Found</h3>
            <p className="text-gray-400 text-sm mb-4">
              {searchQuery ? `No results for "${searchQuery}".` : 'No articles available right now.'}
            </p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="px-5 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600">Clear</button>
            )}
          </div>
        )}

        {/* ── Editorial grid ───────────────────────────────────────────── */}
        {filtered.length > 0 && (
          <>
            {/* Row 1: Featured + 2 secondary side cards */}
            {!searchQuery && featured && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                <div className="md:col-span-2">
                  <NewsCard article={featured} variant="featured" />
                </div>
                <div className="flex flex-col gap-4">
                  {sec1 && <div className="flex-1"><NewsCard article={sec1} variant="secondary" /></div>}
                  {sec2 && <div className="flex-1"><NewsCard article={sec2} variant="secondary" /></div>}
                </div>
              </div>
            )}

            {/* Divider label */}
            {!searchQuery && gridArticles.length > 0 && (
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">More Stories</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )}

            {/* Uniform 3-col grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
              {(searchQuery ? filtered : gridArticles).map((article, i) => (
                <NewsCard key={`${article.url}-${i}`} article={article} variant="card" />
              ))}
            </div>
          </>
        )}

        {/* ── Pagination ───────────────────────────────────────────────── */}
        {!searchQuery && (
          <NewsPagination
            page={page}
            totalPages={totalPages}
            totalResults={totalResults}
            pageSize={PAGE_SIZE}
            loading={loading || refreshing}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
