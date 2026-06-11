import type { DailyFact, FactSubject } from '@/types/dailyFacts';
import { SUBJECT_COLORS } from '@/types/dailyFacts';

interface Props {
  fact: DailyFact;
  subjectMeta?: FactSubject;
  index: number;
}

export default function FactCard({ fact, subjectMeta, index }: Props) {
  const badge = SUBJECT_COLORS[fact.subject] || SUBJECT_COLORS.general_knowledge;
  const label = subjectMeta?.label || fact.subject.replace(/_/g, ' ');

  return (
    <article className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
        <span className="text-2xl" aria-hidden>{fact.emoji}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${badge}`}>
          {label}
        </span>
      </div>
      <div className="px-4 pb-4 flex-1 flex flex-col gap-2">
        <p className="text-[10px] font-semibold text-gray-400">Fact #{index + 1}</p>
        <h3 className="text-base font-extrabold text-gray-900 leading-snug">{fact.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed flex-1">{fact.fact}</p>
      </div>
    </article>
  );
}
