/**
 * Serialize / restore full Study Mode lessons for DB persistence.
 */
import type { Lesson } from '@/services/study';
import type { StudyHistoryItem } from '@/types/api';
import { QuizConfig } from '@/types/quiz';

/** Strip generated image URLs before saving — text sections only. */
export function lessonToPersist(lesson: Lesson): Record<string, unknown> {
  const {
    introImageUrl: _intro,
    galleryImages: _gallery,
    ...rest
  } = lesson;
  return JSON.parse(JSON.stringify(rest));
}

function parseJsonField<T>(raw: unknown): T | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  return raw as T;
}

/** Restore a Lesson from stored JSON or legacy flat session fields. */
export function lessonFromStored(session: StudyHistoryItem): Lesson | null {
  const content = parseJsonField<Record<string, unknown>>(session.lesson_content);
  if (content && typeof content.title === 'string') {
    return {
      ...(content as unknown as Lesson),
      introImageUrl: null,
      galleryImages: [],
    };
  }
  if (!session.lesson_title || !session.lesson_introduction) return null;
  return {
    title: session.lesson_title,
    introduction: session.lesson_introduction,
    explanation: session.lesson_explanation || [],
    keyPoints: session.lesson_key_points || [],
    examples: session.lesson_examples || [],
    summary: session.lesson_summary || '',
    introImageUrl: null,
    galleryImages: [],
  };
}

export function historySessionToConfig(session: StudyHistoryItem): QuizConfig {
  return {
    age: session.age,
    language: session.language as QuizConfig['language'],
    subject: session.subject as QuizConfig['subject'],
    subtopics: [session.topic],
    questionCount: 15,
    difficulty: session.difficulty as QuizConfig['difficulty'],
  };
}

export function hasFullLessonContent(session: StudyHistoryItem): boolean {
  const content = parseJsonField<Record<string, unknown>>(session.lesson_content);
  return Boolean(content && typeof content.title === 'string');
}
