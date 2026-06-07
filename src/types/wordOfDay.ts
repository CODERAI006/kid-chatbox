/**
 * Word of the Day types
 */

export type WordComplexity = 'basic' | 'intermediate' | 'advanced';

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
  detailedExplanation?: string;
  realWorldExamples?: string[];
  schoolExample?: string;
  dailyLifeExample?: string;
}

export interface DailyPhrase {
  phrase: string;
  meaning: string;
  example: string;
  context: 'school' | 'daily';
}

export interface WordOfDayResponse {
  success: boolean;
  date: string;
  grade: string;
  complexity: WordComplexity;
  /** Three words for the daily list view */
  words: WordEntry[];
  /** Single enriched word on the detail page */
  word?: WordEntry;
  phrases: DailyPhrase[];
}

export interface WordOfDayGradeSetting {
  grade: string;
  complexity: WordComplexity;
  enabled: boolean;
  updatedAt?: string | null;
}
