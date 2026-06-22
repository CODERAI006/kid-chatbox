/**
 * Word of the Day types
 */

export type WordComplexity = 'basic' | 'intermediate' | 'advanced' | 'expert';

export interface WordQuiz {
  question: string;
  options: string[];
  answer: string;
}

export interface WordMeaning {
  partOfSpeech: string;
  definitions: Array<{ definition: string; example: string | null }>;
  synonyms: string[];
  antonyms: string[];
}

export interface WordEntry {
  word: string;
  phonetic: string;
  audioUrl: string | null;
  meanings: WordMeaning[];
  /** Kid-friendly one-line meaning */
  simpleMeaning?: string;
  detailedExplanation?: string;
  realWorldExamples?: string[];
  schoolExample?: string;
  dailyLifeExample?: string;
  communicationTip?: string;
  funChallenge?: string;
  quiz?: WordQuiz;
}

export interface DailyTheme {
  key: string;
  label: string;
  description: string;
}

export interface DailyPhrase {
  id?: string;
  phrase: string;
  meaning: string;
  example: string;
  context: 'school' | 'daily';
}

export interface ArchivedPhraseItem {
  editionDate: string;
  phrase: DailyPhrase;
}

export interface DailyPhrasesDatesResponse {
  success: boolean;
  grade: string;
  dates: string[];
}

export interface DailyPhrasesArchiveResponse {
  success: boolean;
  grade: string;
  untilDate: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  items: ArchivedPhraseItem[];
  message?: string;
}

export const EXPRESSIONS_ARCHIVE_PAGE_SIZE = 20;
export const WORDS_ARCHIVE_PAGE_SIZE = 24;

export interface ArchivedWordItem {
  editionDate: string;
  wordOrd: number;
  word: WordEntry;
}

export interface DailyWordsArchiveResponse {
  success: boolean;
  grade: string;
  untilDate: string;
  editionDate: string | null;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  items: ArchivedWordItem[];
  message?: string;
}

export interface WordOfDayResponse {
  success: boolean;
  date: string;
  grade: string;
  complexity: WordComplexity;
  theme?: DailyTheme | null;
  words: WordEntry[];
  word?: WordEntry;
  phrases: DailyPhrase[];
}

export interface WordOfDayGradeSetting {
  grade: string;
  complexity: WordComplexity;
  enabled: boolean;
  updatedAt?: string | null;
}

export interface WordOfDayConfig {
  weeklyThemesEnabled: boolean;
  showQuiz: boolean;
  showFunChallenge: boolean;
  updatedAt?: string | null;
}

export interface WeeklyThemeInfo {
  day: number;
  key: string;
  label: string;
  description: string;
  examples: string[];
}

export interface GradeCategoryInfo {
  tier: string;
  focus: string;
}

