/**
 * Sidebar daily learning — words, expressions, and facts on AI Study / Quiz pages.
 */

import { WordOfTheDay } from '@/components/WordOfTheDay';

interface AiModeDailyLearningProps {
  grade?: string;
}

export function AiModeDailyLearning({ grade }: AiModeDailyLearningProps) {
  return <WordOfTheDay grade={grade} variant="dashboard" />;
}
