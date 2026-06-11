/**
 * Type definitions for quiz-related data structures
 */

import { LANGUAGES, SUBJECTS, DIFFICULTY_LEVELS } from '@/constants/quiz';

export type Language = typeof LANGUAGES[keyof typeof LANGUAGES];
export type Subject = typeof SUBJECTS[keyof typeof SUBJECTS];
export type Difficulty = typeof DIFFICULTY_LEVELS[keyof typeof DIFFICULTY_LEVELS];

export interface QuizConfig {
  age: number;
  language: Language;
  subject: Subject;
  subtopics: string[];
  questionCount: number;
  difficulty: Difficulty;
  instructions?: string; // Optional custom instructions for AI question generation
  timeLimit?: number; // Optional time limit in minutes
  gradeLevel?: string; // Optional class/grade level
  sampleQuestion?: string; // Optional sample question or pattern
  examStyle?: string; // Optional exam style (CBSE, NCERT, Olympiad, Competitive)
  competitiveTrack?: string; // e.g. engineering, mbbs — when examStyle is Competitive
}

export interface Question {
  number: number;
  question: string;
  /** Illustration URL when the question was generated with an image */
  imageUrl?: string | null;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface WrongAnswer {
  questionNumber: number;
  question: string;
  childAnswer: 'A' | 'B' | 'C' | 'D';
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface AnswerResult {
  questionNumber: number;
  question: string;
  childAnswer: 'A' | 'B' | 'C' | 'D' | null;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  isCorrect: boolean;
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

export interface QuizState {
  config: QuizConfig | null;
  currentQuestionIndex: number;
  questions: Question[];
  answers: Map<number, 'A' | 'B' | 'C' | 'D'>;
  isCompleted: boolean;
  wrongAnswers: WrongAnswer[];
  score: number;
}

export type QuizPhase =
  | 'greeting'
  | 'age'
  | 'language'
  | 'subject'
  | 'subtopic'
  | 'quiz'
  | 'results';

