/**
 * API request/response type definitions
 */

import { AnswerResult } from './quiz';

export interface QuizResultRequest {
  user_id: string;
  timestamp: string;
  subject: string;
  subtopic: string;
  age: number;
  language: string;
  answers: AnswerResult[];
  correct_count: number;
  wrong_count: number;
  explanation_of_mistakes: string;
  time_taken: number;
  score_percentage: number;
  isLibraryQuiz?: boolean; // Optional flag to indicate if quiz is from library
}

export interface QuizResultResponse {
  id: string;
  success: boolean;
  message: string;
}

export interface AnalyticsData {
  total_quizzes: number;
  per_subject_accuracy: Record<string, number>;
  per_subtopic_accuracy: Record<string, number>;
  time_spent_studying: number;
  improvement_trend: number[];
  last_three_scores: Array<{
    score: number;
    subject: string;
    date: string;
  }>;
  recent_activities: Array<{
    type: 'quiz' | 'study';
    title: string;
    subtitle: string;
    date: string;
    score?: number;
  }>;
  strengths: string[];
  weaknesses: string[];
  recommended_topics: string[];
}

export interface RecommendedTopicsResponse {
  topics: Array<{
    subject: string;
    subtopic: string;
    reason: string;
  }>;
}

/**
 * Quiz history item from backend
 */
export interface QuizHistoryItem {
  id: string;
  timestamp: string;
  subject: string;
  subtopic: string;
  age: number;
  language: string;
  correct_count: number;
  wrong_count: number;
  time_taken: number;
  score_percentage: number;
  explanation_of_mistakes: string;
  answers: AnswerResult[];
}

/**
 * Quiz history response from backend
 */
export interface QuizHistoryResponse {
  success: boolean;
  results: QuizHistoryItem[];
}

/**
 * Study session request
 */
export interface StudySessionRequest {
  user_id: string;
  timestamp: string;
  subject: string;
  topic: string;
  age: number;
  language: string;
  difficulty: string;
  lesson_title: string;
  lesson_introduction: string;
  lesson_explanation: string[];
  lesson_key_points: string[];
  lesson_examples: string[];
  lesson_summary: string;
}

/**
 * Study session response
 */
export interface StudySessionResponse {
  id: string;
  success: boolean;
  message: string;
}

/**
 * Study history item from backend
 */
export interface StudyHistoryItem {
  id: string;
  timestamp: string;
  subject: string;
  topic: string;
  age: number;
  language: string;
  difficulty: string;
  lesson_title: string;
  lesson_introduction: string;
  lesson_explanation: string[];
  lesson_key_points: string[];
  lesson_examples: string[];
  lesson_summary: string;
}

/**
 * Study history response from backend
 */
export interface StudyHistoryResponse {
  success: boolean;
  sessions: StudyHistoryItem[];
}

