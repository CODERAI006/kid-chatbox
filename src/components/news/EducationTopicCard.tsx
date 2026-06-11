import { FaBookOpen, FaLightbulb } from 'react-icons/fa';
import type { EducationArticle, EducationCategory } from '@/types/educationNews';
import { CATEGORY_COLORS } from '@/types/educationNews';

interface Props {
  article: EducationArticle;
  category?: EducationCategory;
  variant?: 'featured' | 'card';
  onRead?: (article: EducationArticle) => void;
}

function timeAgo(dateString: string): string {
  const diff = (Date.now() - new Date(dateString).getTime()) / 3600000;
  if (diff < 1) return 'Just now';
  if (diff < 24) return `${Math.floor(diff)}h ago`;
  if (diff < 168) return `${Math.floor(diff / 24)}d ago`;
  return new Date(dateString).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function FunFact({ text }: { text: string }) {
  return (
    <div className="flex gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
      <FaLightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" aria-hidden />
      <div>
        <p className="text-[10px] font-bold uppercase text-amber-700 mb-0.5">Did you know?</p>
        <p className="text-xs text-amber-900 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function ReadButton({ onClick, large }: { onClick: () => void; large?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        large
          ? 'mt-auto inline-flex items-center justify-center gap-2 w-fit px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors'
          : 'text-xs text-white bg-blue-600 hover:bg-blue-700 font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ml-auto'
      }
    >
      <FaBookOpen className={large ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      Read story
    </button>
  );
}

export default function EducationTopicCard({ article, category, variant = 'card', onRead }: Props) {
  const gradient = CATEGORY_COLORS[category?.color || 'blue'] || CATEGORY_COLORS.blue;
  const summary = article.kidSummary || article.summary || article.description;
  const topics = article.relatedTopics?.length
    ? article.relatedTopics
    : category?.topics?.slice(0, 3) || [];

  const openReader = () => onRead?.(article);

  if (variant === 'featured') {
    return (
      <article className="grid md:grid-cols-5 gap-0 bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden mb-6">
        <div className={`relative md:col-span-2 min-h-[220px] md:min-h-[280px] bg-gradient-to-br ${gradient}`}>
          {article.urlToImage && (
            <img
              src={article.urlToImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/30" />
          {category && (
            <span className="absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full bg-white/90 text-gray-800 shadow">
              {category.icon} {category.label}
            </span>
          )}
        </div>
        <div className="md:col-span-3 p-5 md:p-6 flex flex-col gap-3">
          <p className="text-[11px] text-gray-400 font-medium">
            {article.source.name} · {timeAgo(article.publishedAt)}
            {article.readTimeMinutes ? ` · ${article.readTimeMinutes} min read` : ''}
          </p>
          <h3 className="text-lg md:text-xl font-extrabold text-gray-900 leading-snug">{article.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{summary}</p>
          {article.funFact && <FunFact text={article.funFact} />}
          {topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {topics.map((t) => (
                <span key={t} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{t}</span>
              ))}
            </div>
          )}
          {onRead && <ReadButton onClick={openReader} large />}
        </div>
      </article>
    );
  }

  return (
    <article className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg overflow-hidden transition-all duration-200 hover:-translate-y-0.5 h-full">
      <button
        type="button"
        onClick={openReader}
        disabled={!onRead}
        className="text-left flex flex-col flex-1 disabled:cursor-default"
      >
        <div className={`relative aspect-[16/9] bg-gradient-to-br ${gradient} overflow-hidden`}>
          {article.urlToImage && (
            <img
              src={article.urlToImage}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <span className="text-white/80 text-[10px] font-semibold uppercase tracking-wide">
              {article.source.name} · {timeAgo(article.publishedAt)}
            </span>
            <h3 className="text-white font-bold text-sm md:text-base leading-snug line-clamp-2 mt-1">
              {article.title}
            </h3>
          </div>
        </div>
        <div className="p-4 flex flex-col flex-1 gap-3">
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{summary}</p>
          {article.keyPoints && article.keyPoints.length > 0 && (
            <p className="text-[11px] text-emerald-700 font-medium">
              {article.keyPoints.length} key points inside
            </p>
          )}
        </div>
      </button>
      <div className="px-4 pb-4 flex items-center justify-between border-t border-gray-50 pt-2 mx-4 mb-4">
        {article.readTimeMinutes && (
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <FaBookOpen className="w-3 h-3" /> {article.readTimeMinutes} min
          </span>
        )}
        {onRead && <ReadButton onClick={openReader} />}
      </div>
    </article>
  );
}
