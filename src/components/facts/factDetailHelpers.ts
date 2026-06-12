import type { DailyFact, DailyFactDetailContent } from '@/types/dailyFacts';

export function getFactDetailContent(fact: DailyFact): DailyFactDetailContent {
  return {
    explanation: fact.explanation || fact.fact,
    reasoning:
      fact.reasoning ||
      'Teachers and scientists check facts using books, experiments, and trusted records before sharing them with students.',
    didYouKnow: fact.didYouKnow || `There is always more to learn about ${fact.title.toLowerCase()}!`,
    realLifeLink:
      fact.realLifeLink ||
      'Look for examples of this in your textbook, classroom discussions, or when you explore the world around you.',
  };
}
