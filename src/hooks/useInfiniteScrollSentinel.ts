import { useEffect, useRef } from 'react';

interface Options {
  enabled: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
  /** Re-attach when list length changes so the sentinel stays at the bottom. */
  observeKey?: number;
}

export function useInfiniteScrollSentinel({
  enabled,
  onLoadMore,
  rootMargin = '200px',
  observeKey = 0,
}: Options) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, onLoadMore, rootMargin, observeKey]);

  return sentinelRef;
}
