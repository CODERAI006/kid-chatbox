import type { DailyFact, DailyFactDetailContent } from '@/types/dailyFacts';
import { resolveFactCategorySlug } from '@/utils/factCategoryUi';

const REASONING_DEFAULT =
  'Trusted books, teachers, and experts check facts carefully before students learn them.';

const REAL_LIFE_DEFAULT =
  'Ask your teacher where you might see this idea in class or at home.';

function hasStoredDetail(fact: DailyFact): boolean {
  return Boolean(
    fact.explanation?.trim()
    && fact.reasoning?.trim()
    && fact.explanation !== fact.fact,
  );
}

export function getFactDetailContent(fact: DailyFact): DailyFactDetailContent {
  if (hasStoredDetail(fact)) {
    return {
      explanation: fact.explanation!,
      reasoning: fact.reasoning || REASONING_DEFAULT,
      didYouKnow: fact.didYouKnow || `Learning about "${fact.title}" makes quizzes more fun!`,
      realLifeLink: fact.realLifeLink || REAL_LIFE_DEFAULT,
    };
  }

  const slug = resolveFactCategorySlug(fact);
  const categoryLabel = slug.replace(/_/g, ' ');
  const topicPart = fact.topic ? ` — especially ${fact.topic}` : '';

  return {
    explanation: `${fact.fact}\n\nIn short: this fact teaches us something important about ${fact.title.toLowerCase()} in ${categoryLabel}${topicPart}.`,
    reasoning: REASONING_DEFAULT,
    didYouKnow: `The ${categoryLabel} topic often appears in school quizzes and GK rounds!`,
    realLifeLink: REAL_LIFE_DEFAULT,
  };
}
