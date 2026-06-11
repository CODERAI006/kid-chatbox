/**
 * Full-screen reader for AI-cleaned education stories.
 */
import { useEffect } from 'react';
import { FaTimes, FaLightbulb, FaExternalLinkAlt, FaCheckCircle } from 'react-icons/fa';
import type { EducationArticle, EducationCategory } from '@/types/educationNews';
import { CATEGORY_COLORS } from '@/types/educationNews';

interface Props {
  article: EducationArticle;
  category?: EducationCategory;
  onClose: () => void;
}

export default function EducationArticleReader({ article, category, onClose }: Props) {
  const gradient = CATEGORY_COLORS[category?.color || 'blue'] || CATEGORY_COLORS.blue;
  const paragraphs = article.formattedParagraphs?.length
    ? article.formattedParagraphs
    : [article.kidSummary || article.summary || article.description].filter(Boolean);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50" role="dialog" aria-modal="true" aria-label={article.title}>
      <header className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-white border-b shadow-sm">
        <div className="min-w-0">
          {category && (
            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wide">
              {category.icon} {category.label}
            </p>
          )}
          <h2 className="text-sm md:text-base font-bold text-gray-900 truncate">{article.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600"
          aria-label="Close reader"
        >
          <FaTimes className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className={`relative h-44 md:h-56 bg-gradient-to-br ${gradient}`}>
          {article.urlToImage && (
            <img
              src={article.urlToImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
            <p className="text-white/70 text-xs">{article.source.name}</p>
            <h1 className="text-xl md:text-2xl font-extrabold text-white leading-snug mt-1">{article.title}</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {article.kidSummary && (
            <p className="text-base md:text-lg text-gray-700 leading-relaxed font-medium border-l-4 border-blue-500 pl-4">
              {article.kidSummary}
            </p>
          )}

          {article.keyPoints && article.keyPoints.length > 0 && (
            <section className="bg-white rounded-2xl border p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FaCheckCircle className="text-emerald-500 w-4 h-4" /> Key points
              </h3>
              <ul className="space-y-2">
                {article.keyPoints.map((point) => (
                  <li key={point} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
                    <span className="text-emerald-500 font-bold">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="bg-white rounded-2xl border p-4 md:p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900">The story</h3>
            {paragraphs.map((para, i) => (
              <p key={i} className="text-sm md:text-base text-gray-700 leading-relaxed">{para}</p>
            ))}
          </section>

          {article.funFact && (
            <section className="flex gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <FaLightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase text-amber-700 mb-1">Did you know?</p>
                <p className="text-sm text-amber-900 leading-relaxed">{article.funFact}</p>
              </div>
            </section>
          )}

          {article.relatedTopics && article.relatedTopics.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-4">
              {article.relatedTopics.map((t) => (
                <span key={t} className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded-full">{t}</span>
              ))}
            </div>
          )}

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-gray-500 hover:text-blue-600 border rounded-xl bg-white"
          >
            View original source <FaExternalLinkAlt className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
