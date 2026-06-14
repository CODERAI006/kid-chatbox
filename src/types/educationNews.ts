/**
 * Education news types — topic categories with scraped + AI-enriched articles.
 */

export type EducationNewsCategoryId =
  | 'science'
  | 'history'
  | 'geography'
  | 'current_affairs'
  | 'technology'
  | 'sports'
  | 'environment'
  | 'arts_culture'
  | 'general_knowledge'
  | 'all';

export interface EducationCategory {
  id: EducationNewsCategoryId;
  label: string;
  icon: string;
  color: string;
  description: string;
  topics: string[];
  exampleQuestions: string[];
}

export interface EducationQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  hint?: string;
}

export interface EducationArticle {
  id: string;
  category: EducationNewsCategoryId;
  title: string;
  description: string;
  summary: string;
  kidSummary?: string;
  funFact?: string | null;
  funFacts?: string[];
  quizQuestions?: EducationQuizQuestion[];
  relatedTopics?: string[];
  formattedParagraphs?: string[];
  keyPoints?: string[];
  difficultyLevel?: string;
  ageGroup?: string;
  learningObjectives?: string[];
  url: string;
  urlToImage: string | null;
  source: { id: string | null; name: string };
  author: string;
  publishedAt: string;
  readTimeMinutes?: number;
  content?: string | null;
}

export interface EducationTopicsResponse {
  success: boolean;
  categories: EducationCategory[];
  updatedAt: string;
}

export interface EducationNewsResponse {
  success: boolean;
  category: EducationCategory;
  articles: EducationArticle[];
  totalResults: number;
  page: number;
  pageSize: number;
  cachedDate?: string;
  fromCache?: boolean;
  updatedAt?: string;
  message?: string;
}

export interface EducationArticleResponse {
  success: boolean;
  article?: EducationArticle;
  cachedDate?: string;
  message?: string;
}

export const CATEGORY_COLORS: Record<string, string> = {
  blue: 'from-blue-500 to-cyan-600',
  amber: 'from-amber-500 to-orange-600',
  emerald: 'from-emerald-500 to-teal-600',
  rose: 'from-rose-500 to-pink-600',
  purple: 'from-purple-500 to-indigo-600',
  cyan: 'from-cyan-500 to-blue-600',
  orange: 'from-orange-500 to-amber-600',
  teal: 'from-teal-500 to-green-600',
  indigo: 'from-indigo-500 to-purple-600',
};

export const CATEGORY_RING: Record<string, string> = {
  blue: 'ring-blue-200 border-blue-100',
  amber: 'ring-amber-200 border-amber-100',
  emerald: 'ring-emerald-200 border-emerald-100',
  rose: 'ring-rose-200 border-rose-100',
  purple: 'ring-purple-200 border-purple-100',
  cyan: 'ring-cyan-200 border-cyan-100',
  orange: 'ring-orange-200 border-orange-100',
  teal: 'ring-teal-200 border-teal-100',
  indigo: 'ring-indigo-200 border-indigo-100',
};
