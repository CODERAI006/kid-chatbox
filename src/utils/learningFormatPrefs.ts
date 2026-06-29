/**
 * Persist quiz / study setup choices (exam style, counts, etc.) in localStorage.
 */

import { authApi } from '@/services/api';
import { QUIZ_CONSTANTS } from '@/constants/quiz';

const QUIZ_PREFS_KEY = 'kidchatbox:quiz-setup-prefs';
const STUDY_PREFS_KEY = 'kidchatbox:study-setup-prefs';

export interface QuizSetupPrefs {
  examStyle?: string;
  questionType?: string;
  questionCount?: number;
  timeLimit?: number;
}

export interface StudySetupPrefs {
  examStyle?: string;
  lessonStyle?: string;
  lessonDepth?: string;
  difficulty?: string;
  contentFocus?: string[];
}

export function getProfileGradeLevel(): string | undefined {
  try {
    const { user } = authApi.getCurrentUser();
    const grade = (user as { grade?: string | null })?.grade;
    return grade?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function loadQuizSetupPrefs(): QuizSetupPrefs {
  try {
    const raw = localStorage.getItem(QUIZ_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as QuizSetupPrefs;
    return {
      examStyle: typeof parsed.examStyle === 'string' ? parsed.examStyle : undefined,
      questionType: typeof parsed.questionType === 'string' ? parsed.questionType : undefined,
      questionCount:
        typeof parsed.questionCount === 'number' && parsed.questionCount > 0
          ? parsed.questionCount
          : undefined,
      timeLimit:
        typeof parsed.timeLimit === 'number' && parsed.timeLimit > 0
          ? parsed.timeLimit
          : undefined,
    };
  } catch {
    return {};
  }
}

export function saveQuizSetupPrefs(prefs: QuizSetupPrefs): void {
  try {
    localStorage.setItem(QUIZ_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadStudySetupPrefs(): StudySetupPrefs {
  try {
    const raw = localStorage.getItem(STUDY_PREFS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StudySetupPrefs;
  } catch {
    return {};
  }
}

export function saveStudySetupPrefs(prefs: StudySetupPrefs): void {
  try {
    localStorage.setItem(STUDY_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function defaultQuizQuestionCount(): number {
  return loadQuizSetupPrefs().questionCount ?? QUIZ_CONSTANTS.DEFAULT_QUESTIONS;
}

export function defaultQuizTimeLimit(): number {
  return loadQuizSetupPrefs().timeLimit ?? 10;
}
