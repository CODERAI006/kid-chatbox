import { FaNewspaper, FaExternalLinkAlt } from 'react-icons/fa';

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

export interface NewsCardProps {
  article: NewsArticle;
  variant?: 'featured' | 'secondary' | 'card';
}

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const diff = (Date.now() - new Date(dateString).getTime()) / 3600000;
  if (diff < 1) return 'Just now';
  if (diff < 24) return `${Math.floor(diff)}h ago`;
  if (diff < 48) return 'Yesterday';
  if (diff < 168) return `${Math.floor(diff / 24)}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const ACCENTS = [
  { bg: 'bg-blue-600',   text: 'text-blue-600',   light: 'bg-blue-50'   },
  { bg: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50' },
  { bg: 'bg-emerald-600',text: 'text-emerald-600',light: 'bg-emerald-50'},
  { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50' },
  { bg: 'bg-rose-600',   text: 'text-rose-600',   light: 'bg-rose-50'   },
  { bg: 'bg-teal-600',   text: 'text-teal-600',   light: 'bg-teal-50'   },
  { bg: 'bg-indigo-600', text: 'text-indigo-600', light: 'bg-indigo-50' },
];

function accent(name: string) {
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return ACCENTS[h % ACCENTS.length];
}

function isNew(publishedAt: string): boolean {
  return (Date.now() - new Date(publishedAt).getTime()) / 3600000 < 8;
}

// ── Featured Card ──────────────────────────────────────────────────────────
// Large hero with full-bleed image and text overlay
function FeaturedCard({ article }: { article: NewsArticle }) {
  const ac = accent(article.source.name);
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block rounded-2xl overflow-hidden bg-gray-900 shadow-xl hover:shadow-2xl transition-all duration-300 h-full"
      style={{ minHeight: 320 }}
    >
      {/* Background image */}
      {article.urlToImage ? (
        <img
          src={article.urlToImage}
          alt={article.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-65 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-purple-800" />
      )}
      {/* Strong gradient overlay so text is always readable */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.1) 100%)' }} />
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className={`${ac.bg} text-white text-[11px] font-bold px-3 py-1 rounded-full`}>{article.source.name}</span>
          {isNew(article.publishedAt) && (
            <span className="bg-red-500 text-white text-[11px] font-bold px-3 py-1 rounded-full animate-pulse">🔴 Live</span>
          )}
          <span className="text-white/50 text-[11px] ml-1">{timeAgo(article.publishedAt)}</span>
        </div>
        <h2 className="text-lg md:text-2xl font-extrabold text-white leading-snug mb-2 line-clamp-3 group-hover:text-blue-200 transition-colors">
          {article.title}
        </h2>
        <p className="text-white/65 text-xs md:text-sm line-clamp-2 mb-3 hidden sm:block">{article.description}</p>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-blue-300 font-bold group-hover:text-white transition-colors">
          Read Full Story <FaExternalLinkAlt className="w-2.5 h-2.5" />
        </span>
      </div>
    </a>
  );
}

// ── Secondary Card ─────────────────────────────────────────────────────────
// Medium card used in the side column — horizontal layout
function SecondaryCard({ article }: { article: NewsArticle }) {
  const ac = accent(article.source.name);
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 bg-white rounded-xl border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md p-3 transition-all duration-200 h-full"
    >
      <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
        {article.urlToImage ? (
          <img
            src={article.urlToImage}
            alt={article.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><FaNewspaper className="w-6 h-6 text-gray-300" /></div>
        )}
      </div>
      <div className="flex flex-col justify-between min-w-0 flex-1">
        <div>
          <span className={`${ac.text} ${ac.light} text-[10px] font-bold px-2 py-0.5 rounded-full`}>{article.source.name}</span>
          <h3 className="text-xs font-bold text-gray-900 line-clamp-3 group-hover:text-blue-600 transition-colors mt-1 leading-snug">
            {article.title}
          </h3>
        </div>
        <span className="text-[10px] text-gray-400">{timeAgo(article.publishedAt)}</span>
      </div>
    </a>
  );
}

// ── Grid Card ──────────────────────────────────────────────────────────────
// Standard grid card — image top, content below
export default function NewsCard({ article, variant = 'card' }: NewsCardProps) {
  if (variant === 'featured') return <FeaturedCard article={article} />;
  if (variant === 'secondary') return <SecondaryCard article={article} />;

  const ac = accent(article.source.name);
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-white rounded-2xl border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {article.urlToImage ? (
          <img
            src={article.urlToImage}
            alt={article.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FaNewspaper className="w-10 h-10 text-gray-300" />
          </div>
        )}
        {isNew(article.publishedAt) && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">NEW</span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className={`${ac.text} ${ac.light} text-[10px] font-bold px-2.5 py-1 rounded-full truncate max-w-[60%]`}>{article.source.name}</span>
          <span className="text-[10px] text-gray-400 ml-auto whitespace-nowrap">{timeAgo(article.publishedAt)}</span>
        </div>
        <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors flex-1 mb-2">
          {article.title}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{article.description}</p>
        <div className="pt-2 border-t border-gray-50 flex items-center justify-end">
          <span className="text-xs text-blue-500 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
            Read More <FaExternalLinkAlt className="w-2.5 h-2.5" />
          </span>
        </div>
      </div>
    </a>
  );
}
