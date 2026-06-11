import type { EducationCategory, EducationNewsCategoryId } from '@/types/educationNews';
import { CATEGORY_COLORS, CATEGORY_RING } from '@/types/educationNews';

interface Props {
  categories: EducationCategory[];
  activeId: EducationNewsCategoryId;
  onSelect: (id: EducationNewsCategoryId) => void;
}

export default function EducationCategoryPicker({ categories, activeId, onSelect }: Props) {
  return (
    <section aria-label="Choose a learning topic">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
        Step 1 · Pick a topic
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin">
        {categories.map((c) => {
          const active = c.id === activeId;
          const ring = CATEGORY_RING[c.color] || CATEGORY_RING.blue;
          const grad = CATEGORY_COLORS[c.color] || CATEGORY_COLORS.blue;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              aria-pressed={active}
              className={`snap-start flex-shrink-0 w-[140px] sm:w-[160px] text-left p-4 rounded-2xl border-2 transition-all ${
                active
                  ? `ring-2 ${ring} border-transparent bg-white shadow-lg scale-[1.02]`
                  : 'border-gray-100 bg-white/80 hover:border-gray-200 hover:shadow-md'
              }`}
            >
              <span className="text-3xl block mb-2" aria-hidden>{c.icon}</span>
              <p className={`text-sm font-bold leading-tight ${active ? 'text-gray-900' : 'text-gray-700'}`}>
                {c.label}
              </p>
              <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-snug">{c.description}</p>
              {active && (
                <div className={`h-1 w-full mt-3 rounded-full bg-gradient-to-r ${grad}`} />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
