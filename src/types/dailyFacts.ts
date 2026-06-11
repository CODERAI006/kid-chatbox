/** Facts & Fun — 10 class-based facts per day, saved in DB. */

export type FactSubjectId =
  | 'science'
  | 'geography'
  | 'history'
  | 'current_affairs'
  | 'general_knowledge'
  | 'nature'
  | 'india'
  | 'sports'
  | 'math';

export interface FactSubject {
  id: FactSubjectId;
  label: string;
  emoji: string;
}

export interface DailyFact {
  id: string;
  subject: FactSubjectId;
  emoji: string;
  title: string;
  fact: string;
}

export interface DailyFactsResponse {
  success: boolean;
  date: string;
  grade: string;
  facts: DailyFact[];
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
