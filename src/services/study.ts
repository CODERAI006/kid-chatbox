/**
 * Study mode: lessons via backend AI proxy.
 */

import { QuizConfig } from '@/types/quiz';
import { User } from '@/types';
import { aiApi, studyApi } from '@/services/api';
import { buildStudyLessonPrompt } from '@/services/studyPrompt';
import { normalizeFlashcardList } from '@/utils/flashcardNormalize';

export interface PracticeQuestion {
  question: string;
  answer: string;
  hint?: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface KeyTerm {
  term: string;
  definition: string;
}

export interface VideoRecommendation {
  title: string;
  description: string;
  searchTopic: string;
}

export interface LessonIntroduction {
  text: string;
  imageKeyword: string;
  imageCaption?: string;
}

export interface StudyGalleryImage {
  url: string;
  label: string;
  keyword: string;
}

export interface Lesson {
  title: string;
  whyLearnThis?: string;
  quickSummary?: string;
  /** Plain intro text (legacy) or structured intro with image keyword */
  introduction: string | LessonIntroduction;
  explanation: string[];
  keyPoints: string[];
  examples: string[];
  summary: string;
  realLifeAnalogy?: string;
  keyTerms?: KeyTerm[];
  didYouKnow?: string[];
  commonMistakes?: string[];
  examNotes?: string[];
  thinkingQuestions?: string[];
  oneMinuteRevision?: string[];
  askAiTeacherPrompts?: string[];
  practiceQuestions?: PracticeQuestion[];
  imageKeywords?: string[];
  /** Ollama Cloud hero image for introduction */
  introImageUrl?: string | null;
  /** Ollama Cloud gallery images */
  galleryImages?: StudyGalleryImage[];
  funFacts?: string[];
  visualLearningSuggestions?: string[];
  visualLearningDescription?: string[];
  audioNarrationScript?: string;
  videoRecommendations?: VideoRecommendation[];
  flashcards?: Flashcard[];
  revisionNotes?: string[];
}

export interface StudyLessonOptions {
  lessonStyle?: string;
  lessonDepth?: string;
  contentFocus?: string[];
  examStyle?: string;
  gradeLevel?: string;
}

function getUserProfile(): { grade?: string; age?: number; name?: string } {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return { grade: user.grade, age: user.age, name: user.name };
    }
  } catch {
    /* profile optional */
  }
  return {};
}

function normalizeIntroduction(raw: unknown): LessonIntroduction {
  if (raw && typeof raw === 'object' && 'text' in raw) {
    const o = raw as LessonIntroduction;
    return {
      text: String(o.text || '').trim(),
      imageKeyword: String(o.imageKeyword || 'classroom learning').trim(),
      imageCaption: o.imageCaption ? String(o.imageCaption).trim() : undefined,
    };
  }
  const text = String(raw || '').trim();
  return {
    text,
    imageKeyword: 'students learning classroom',
    imageCaption: undefined,
  };
}

function normalizeStringList(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map(String).filter(Boolean) : [];
}

function normalizeKeyTerms(raw: unknown): KeyTerm[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (item && typeof item === 'object' && 'term' in item) {
        const o = item as KeyTerm;
        return { term: String(o.term || '').trim(), definition: String(o.definition || '').trim() };
      }
      return null;
    })
    .filter((t): t is KeyTerm => Boolean(t?.term));
}

function normalizeLesson(raw: Record<string, unknown>, topic: string): Lesson {
  const intro = normalizeIntroduction(raw.introduction);
  const explanation = normalizeStringList(raw.explanation);
  const keyPoints = normalizeStringList(raw.keyPoints);
  const examples = normalizeStringList(raw.examples);
  const quizQuestions = Array.isArray(raw.quizQuestions)
    ? (raw.quizQuestions as PracticeQuestion[])
    : Array.isArray(raw.practiceQuestions)
      ? (raw.practiceQuestions as PracticeQuestion[])
      : [];

  const visualDesc = normalizeStringList(raw.visualLearningDescription);
  const visualLegacy = normalizeStringList(raw.visualLearningSuggestions);
  const oneMin = normalizeStringList(raw.oneMinuteRevision);
  const revisionNotes = normalizeStringList(raw.revisionNotes);

  const lesson: Lesson = {
    title: String(raw.title || topic),
    whyLearnThis: raw.whyLearnThis ? String(raw.whyLearnThis).trim() : undefined,
    quickSummary: raw.quickSummary ? String(raw.quickSummary).trim() : undefined,
    introduction: intro,
    explanation,
    keyPoints,
    examples,
    summary: String(raw.summary || ''),
    realLifeAnalogy: raw.realLifeAnalogy ? String(raw.realLifeAnalogy).trim() : undefined,
    keyTerms: normalizeKeyTerms(raw.keyTerms),
    didYouKnow: normalizeStringList(raw.didYouKnow),
    commonMistakes: normalizeStringList(raw.commonMistakes),
    examNotes: normalizeStringList(raw.examNotes),
    thinkingQuestions: normalizeStringList(raw.thinkingQuestions),
    oneMinuteRevision: oneMin.length ? oneMin : revisionNotes,
    askAiTeacherPrompts: normalizeStringList(raw.askAiTeacherPrompts),
    practiceQuestions: quizQuestions,
    imageKeywords: normalizeStringList(raw.imageKeywords),
    funFacts: normalizeStringList(raw.funFacts),
    visualLearningDescription: visualDesc.length ? visualDesc : visualLegacy,
    visualLearningSuggestions: visualLegacy.length ? visualLegacy : visualDesc,
    audioNarrationScript: raw.audioNarrationScript ? String(raw.audioNarrationScript) : undefined,
    videoRecommendations: Array.isArray(raw.videoRecommendations)
      ? (raw.videoRecommendations as VideoRecommendation[])
      : [],
    flashcards: normalizeFlashcardList(raw.flashcards),
    revisionNotes,
  };

  if (!lesson.whyLearnThis && intro.text) {
    lesson.whyLearnThis = intro.text.split('\n\n')[0]?.trim();
  }
  if (!lesson.quickSummary && lesson.summary) {
    lesson.quickSummary = lesson.summary.slice(0, 400);
  }

  if (keyPoints.length < 20) {
    for (let i = keyPoints.length; i < 20; i++) {
      keyPoints.push(`Important idea about ${topic}`);
    }
  } else if (keyPoints.length > 20) {
    lesson.keyPoints = keyPoints.slice(0, 20);
  }

  if (!(lesson.imageKeywords?.length) && intro.imageKeyword) {
    lesson.imageKeywords = [intro.imageKeyword];
  }

  return lesson;
}

/** Get intro text regardless of legacy string or structured format. */
export function getIntroductionText(intro: Lesson['introduction']): string {
  return typeof intro === 'string' ? intro : intro.text;
}

export function getIntroductionImageKeyword(intro: Lesson['introduction']): string {
  return typeof intro === 'string' ? 'students learning classroom' : intro.imageKeyword;
}

export function getIntroductionCaption(intro: Lesson['introduction']): string | undefined {
  return typeof intro === 'string' ? undefined : intro.imageCaption;
}

export async function generateLesson(
  config: QuizConfig,
  userProfile?: User | null,
  studyOptions?: StudyLessonOptions,
): Promise<Lesson> {
  const profile = userProfile || getUserProfile();
  const grade =
    studyOptions?.gradeLevel ||
    profile.grade ||
    `Class ${Math.floor((config.age || 8) / 2) + 1}`;
  const classLevel = grade.includes('Class') ? grade : `Class ${grade}`;
  const examStyle = studyOptions?.examStyle || config.examStyle || 'CBSE';
  const kidName = (userProfile as User)?.name || profile.name || 'friend';
  const topic =
    config.subtopics.length === 1 ? config.subtopics[0] : config.subtopics.join(', ');

  const prompt = buildStudyLessonPrompt(config, kidName, classLevel, examStyle, studyOptions);

  try {
    const { content } = await aiApi.chat({
      messages: [
        {
          role: 'system',
          content:
            'You are an expert CBSE teacher and instructional designer. Return ONLY valid JSON. No markdown fences.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.65,
      num_predict: 8192,
    });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : content;
    const parsed = JSON.parse(jsonString) as Record<string, unknown>;
    const lesson = normalizeLesson(parsed, topic);

    if (!lesson.title || !getIntroductionText(lesson.introduction) || !lesson.summary) {
      throw new Error('Invalid lesson structure received');
    }

    try {
      const images = await studyApi.enrichLessonImages({
        subject: config.subject,
        topic,
        introductionImageKeyword: getIntroductionImageKeyword(lesson.introduction),
        imageKeywords: lesson.imageKeywords,
      });
      lesson.introImageUrl = images.introImageUrl;
      lesson.galleryImages = images.galleryImages || [];
    } catch (imgErr) {
      console.warn('[Study] Ollama Cloud images skipped:', imgErr);
      lesson.introImageUrl = null;
      lesson.galleryImages = [];
    }

    return lesson;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse lesson. Please try again.');
    }
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred while generating lesson');
  }
}
