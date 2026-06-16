/** Facts & Fun — per-class facts per day, saved in DB. */

import type { WordComplexity } from '@/types/wordOfDay';

export interface DailyFactsGradeSetting {
  grade: string;
  complexity: WordComplexity;
  enabled: boolean;
  updatedAt?: string | null;
}

export interface FactCategory {
  slug: string;
  label: string;
  emoji: string;
  topics?: string[];
}

/** @deprecated legacy subject ids — use category slug */
export type FactSubjectId =
  | 'science'
  | 'geography'
  | 'history'
  | 'current_affairs'
  | 'general_knowledge'
  | 'nature'
  | 'india'
  | 'sports'
  | 'math'
  | string;

export interface FactSubject {
  id: FactSubjectId;
  label: string;
  emoji: string;
}

export interface RelatedFact {
  title: string;
  fact: string;
}

export interface DailyFact {
  id: string;
  category: string;
  topic?: string;
  /** Legacy field — same as category slug when present */
  subject?: string;
  emoji: string;
  title: string;
  fact: string;
  explanation?: string;
  reasoning?: string;
  didYouKnow?: string;
  realLifeLink?: string;
  moreFacts?: RelatedFact[];
}

export interface DailyFactDetailContent {
  explanation: string;
  reasoning: string;
  didYouKnow: string;
  realLifeLink: string;
}

export interface DailyFactDetailResponse {
  success: boolean;
  date: string;
  grade: string;
  fact?: DailyFact;
  detail?: DailyFactDetailContent;
  cached?: boolean;
  source?: 'ollama';
  message?: string;
}

export interface DailyFactsResponse {
  success: boolean;
  date: string;
  grade: string;
  facts: DailyFact[];
  categories?: FactCategory[];
  /** @deprecated use categories */
  subjects?: FactSubject[];
  factCount?: number;
  cached?: boolean;
  source?: 'ollama';
  message?: string;
}

export interface DailyFactsDatesResponse {
  success: boolean;
  grade: string;
  dates: string[];
}

export interface ArchivedFactItem {
  editionDate: string;
  fact: DailyFact;
}

export interface DailyFactsArchiveResponse {
  success: boolean;
  grade: string;
  untilDate: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  items: ArchivedFactItem[];
  categories?: FactCategory[];
  /** @deprecated use categories */
  subjects?: FactSubject[];
  message?: string;
}

export const FACTS_ARCHIVE_PAGE_SIZE = 20;

export const SUBJECT_COLORS: Record<string, string> = {
  science: 'bg-blue-50 text-blue-800 border-blue-100',
  geography: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  history: 'bg-amber-50 text-amber-800 border-amber-100',
  current_affairs: 'bg-rose-50 text-rose-800 border-rose-100',
  general_knowledge: 'bg-purple-50 text-purple-800 border-purple-100',
  nature: 'bg-green-50 text-green-800 border-green-100',
  india: 'bg-orange-50 text-orange-800 border-orange-100',
  sports: 'bg-cyan-50 text-cyan-800 border-cyan-100',
  math: 'bg-indigo-50 text-indigo-800 border-indigo-100',
};
