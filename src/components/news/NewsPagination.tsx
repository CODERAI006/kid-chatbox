interface NewsPaginationProps {
  page: number;
  totalPages: number;
  totalResults: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

/** Build the page numbers array with ellipsis placeholders (-1). */
function buildPages(current: number, total: number): (number | -1)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | -1)[] = [1];

  if (current > 3) pages.push(-1);

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push(-1);

  pages.push(total);
  return pages;
}

export default function NewsPagination({
  page,
  totalPages,
  totalResults,
  pageSize,
  loading,
  onPageChange,
}: NewsPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPages(page, totalPages);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalResults);

  return (
    <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-5 md:p-6">
      {/* Results summary */}
      <p className="text-center text-sm text-gray-500 mb-5">
        Showing{' '}
        <span className="font-bold text-blue-600">{from.toLocaleString()}</span>
        {' – '}
        <span className="font-bold text-blue-600">{to.toLocaleString()}</span>
        {' of '}
        <span className="font-bold text-purple-600">{totalResults.toLocaleString()}</span>
        {' articles'}
      </p>

      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || loading}
          className="px-4 py-2 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Previous page"
        >
          ← Prev
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === -1 ? (
            <span key={`ellipsis-${i}`} className="px-2 py-2 text-gray-400 select-none text-sm">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              disabled={loading}
              aria-current={p === page ? 'page' : undefined}
              className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                p === page
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md shadow-blue-200 scale-110'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105 disabled:opacity-40'
              }`}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || loading}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Next page"
        >
          Next →
        </button>
      </div>

      {/* Page indicator */}
      <p className="text-center text-xs text-gray-400 mt-4">
        Page {page} of {totalPages.toLocaleString()}
      </p>
    </div>
  );
}
