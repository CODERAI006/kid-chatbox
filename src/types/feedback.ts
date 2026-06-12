import { FEEDBACK_SOURCES } from '@/constants/feedback';

export type FeedbackSource = (typeof FEEDBACK_SOURCES)[number];

export interface FeedbackContext {
  source: FeedbackSource;
  quizSubject?: string;
  quizScore?: number;
  quizTotal?: number;
}

export interface SubmitFeedbackPayload {
  rating: number;
  featureWishes: string[];
  message?: string;
  source: FeedbackSource;
  quizSubject?: string;
  quizScore?: number;
  quizTotal?: number;
}

export interface SubmitFeedbackResponse {
  success: boolean;
  message: string;
  id?: number;
}

export interface AdminFeedbackItem {
  id: number;
  rating: number;
  featureWishes: string[];
  message: string | null;
  source: FeedbackSource | string;
  quizSubject: string | null;
  quizScore: number | null;
  quizTotal: number | null;
  createdAt: string;
  studentName: string;
  studentEmail: string;
  grade: string | null;
}

export interface AdminFeedbackAnalytics {
  success: boolean;
  days: number;
  grade: string | null;
  summary: { total: number; avgRating: number; thisWeek: number };
  ratingDistribution: Array<{ rating: number; count: number }>;
  bySource: Array<{ source: string; count: number }>;
  byGrade: Array<{ grade: string; count: number; avgRating: number }>;
  overTime: Array<{ date: string; count: number; avgRating: number }>;
  featureWishes: Array<{ wish: string; count: number }>;
}
