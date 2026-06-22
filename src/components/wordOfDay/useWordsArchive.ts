import { useCallback, useEffect, useRef, useState } from 'react';
import { publicApi } from '@/services/api';
import { WORDS_ARCHIVE_PAGE_SIZE, type ArchivedWordItem } from '@/types/wordOfDay';

interface Options {
  gradeLabel: string;
  untilDate: string;
  editionDate: string | null;
  enabled: boolean;
}

export function useWordsArchive({ gradeLabel, untilDate, editionDate, enabled }: Options) {
  const [items, setItems] = useState<ArchivedWordItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setTotal(0);
    setHasMore(false);
    setError(null);
  }, []);

  const loadPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await publicApi.getWordsArchive(gradeLabel, {
          page: pageNum,
          limit: WORDS_ARCHIVE_PAGE_SIZE,
          untilDate,
          editionDate: editionDate || undefined,
        });

        if (!res.success) {
          setError(res.message || 'Could not load saved words.');
          if (!append) setItems([]);
          return;
        }

        setTotal(res.total);
        setHasMore(res.hasMore);
        setPage(pageNum);
        setItems((prev) => (append ? [...prev, ...res.items] : res.items));
      } catch {
        setError('Could not load saved words. Check your connection.');
        if (!append) setItems([]);
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [gradeLabel, untilDate, editionDate],
  );

  useEffect(() => {
    if (!enabled) {
      reset();
      return;
    }
    reset();
    loadPage(1, false);
  }, [enabled, gradeLabel, untilDate, editionDate, loadPage, reset]);

  const loadMore = useCallback(() => {
    if (!enabled || !hasMore || loadingRef.current) return;
    loadPage(page + 1, true);
  }, [enabled, hasMore, loadPage, page]);

  return { items, total, hasMore, loading, loadingMore, error, loadMore, reload: () => loadPage(1, false) };
}
