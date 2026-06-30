/**
 * Study mode: lessons via backend AI proxy.
 */

import { QuizConfig } from '@/types/quiz';
import { User } from '@/types';
import axios from 'axios';
import { aiApi, getErrorMessage } from '@/services/api';
import { isAiServiceUnreachable } from '@/services/openai';
import { buildStudyLessonPrompt } from '@/services/studyPrompt';
import { normalizeFlashcardList } from '@/utils/flashcardNormalize';
import {
  validateStudyInputs,
  validateLessonIntro,
  padLessonIntro,
  STUDY_PROMPT_LIMITS,
} from '@/utils/studyPromptLimits';
import type { StudyModuleExtensions } from './studyLessonTypes';
import type { StudyInteractiveSection } from '@/types/studyInteractive';
import {
  getSectionByType,
  isInteractiveLesson,
  normalizeInteractiveSections,
} from './studyInteractiveNormalize';
import {
  normalizeActivities,
  normalizeAiTutorQa,
  normalizeCaseStudies,
  normalizeComparisons,
  normalizeConcepts,
  normalizeExamPrep,
  normalizeFillBlanks,
  normalizeGamified,
  normalizeHotQuestions,
  normalizeLearningLevels,
  normalizeLessonHeader,
  normalizeMatchPairs,
  normalizeMcqs,
  normalizeMisconceptions,
  normalizeProjectWork,
  normalizeQuickSummary,
  normalizeRealWorldConnections,
  normalizeTrueFalse,
  normalizePracticeList,
} from './studyLessonNormalize';

export type {
  LessonHeader,
  ConceptBlock,
  RealWorldConnections,
  ComparisonTable,
  Misconception,
  ExamQuestionSet,
  McqQuestion,
  StudyActivity,
  ProjectWork,
  GamifiedChallenges,
  HotQuestions,
  AiTutorQa,
  LearningLevels,
} from './studyLessonTypes';

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
  easyExample?: string;
}

export interface VideoRecommendation {
  title: string;
  description: string;
  searchTopic: string;
}

export interface LessonIntroduction {
  text: string;
  imageKeyword: string;
  /** Full photorealistic scene for Ollama image model — generated from lesson content */
  imagePrompt?: string;
  imageCaption?: string;
}

export interface StudyImageGalleryItem {
  keyword: string;
  label?: string;
  imagePrompt?: string;
}

export interface StudyGalleryImage {
  url: string;
  label: string;
  keyword: string;
}

export type { StudyInteractiveSection } from '@/types/studyInteractive';

export interface Lesson extends StudyModuleExtensions {
  title: string;
  /** Visual-first 18-section interactive layout (new format). */
  sections?: StudyInteractiveSection[];
  whyLearnThis?: string;
  quickSummary?: string;
  memoryTricks?: string[];
  shortAnswer?: PracticeQuestion[];
  longAnswer?: PracticeQuestion[];
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
  imageGallery?: StudyImageGalleryItem[];
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
      imagePrompt: o.imagePrompt ? String(o.imagePrompt).trim() : undefined,
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

function normalizeImageGallery(raw: unknown): StudyImageGalleryItem[] {
  if (!Array.isArray(raw)) return [];
  const out: StudyImageGalleryItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as StudyImageGalleryItem;
    const keyword = String(o.keyword || o.label || '').trim();
    if (!keyword && !o.imagePrompt) continue;
    out.push({
      keyword: keyword || 'gallery scene',
      label: o.label ? String(o.label).trim() : keyword || undefined,
      imagePrompt: o.imagePrompt ? String(o.imagePrompt).trim() : undefined,
    });
  }
  return out;
}

function normalizeKeyTerms(raw: unknown): KeyTerm[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (item && typeof item === 'object' && 'term' in item) {
        const o = item as KeyTerm;
        return {
          term: String(o.term || '').trim(),
          definition: String(o.definition || '').trim(),
          easyExample: o.easyExample ? String(o.easyExample).trim() : undefined,
        };
      }
      return null;
    })
    .filter((t) => Boolean(t?.term)) as KeyTerm[];
}

function extractFlashcardsFromSections(sections: StudyInteractiveSection[]) {
  const fc = getSectionByType(sections, 'flashcards');
  const cards = Array.isArray(fc?.content?.cards) ? fc!.content.cards : [];
  return normalizeFlashcardList(cards);
}

function extractMcqsFromSections(sections: StudyInteractiveSection[]) {
  const quiz = getSectionByType(sections, 'quick-quiz');
  const questions = Array.isArray(quiz?.content?.questions) ? quiz!.content.questions : [];
  return questions
    .map((q) => {
      const item = q as Record<string, unknown>;
      const question = String(item.question || '').trim();
      const options = Array.isArray(item.options) ? item.options.map(String) : [];
      if (!question || options.length < 2) return null;
      return {
        question,
        options,
        correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : 0,
        explanation: String(item.explanation || '').trim(),
      };
    })
    .filter(Boolean) as import('./studyLessonTypes').McqQuestion[];
}

function hydrateLegacyFromSections(lesson: Lesson): void {
  if (!lesson.sections?.length) return;

  const hero = getSectionByType(lesson.sections, 'hero');
  const remember = getSectionByType(lesson.sections, 'remember-this');
  const askAi = getSectionByType(lesson.sections, 'ask-ai');
  const concepts = getSectionByType(lesson.sections, 'concept-cards');

  if (hero?.content?.description) {
    lesson.introduction = {
      text: String(hero.content.description),
      imageKeyword: String(hero.content.topicName || lesson.title),
    };
  }

  if (!lesson.flashcards?.length) {
    lesson.flashcards = extractFlashcardsFromSections(lesson.sections);
  }
  if (!lesson.mcqs?.length) {
    lesson.mcqs = extractMcqsFromSections(lesson.sections);
  }
  if (!lesson.whyLearnThis && hero?.content?.description) {
    lesson.whyLearnThis = String(hero.content.description);
  }
  if (!lesson.oneMinuteRevision?.length && Array.isArray(remember?.content?.bullets)) {
    lesson.oneMinuteRevision = remember.content.bullets.map(String);
  }
  if (!lesson.askAiTeacherPrompts?.length && Array.isArray(askAi?.content?.suggestedQuestions)) {
    lesson.askAiTeacherPrompts = askAi.content.suggestedQuestions.map(String);
  }
  if (!lesson.concepts?.length && Array.isArray(concepts?.content?.cards)) {
    lesson.concepts = concepts.content.cards.map((c) => {
      const card = c as Record<string, unknown>;
      return {
        name: String(card.title || ''),
        definition: String(card.definition || ''),
        explanation: Array.isArray(card.steps)
          ? (card.steps as Array<{ detail?: string }>).map((s) => s.detail || '').join(' ')
          : '',
        example: String(card.example || ''),
        commonMistake: card.commonMistake ? String(card.commonMistake) : undefined,
        checkQuestion: (card.practice as { question?: string })?.question,
      };
    }).filter((c) => c.name);
  }
}

function normalizeLesson(raw: Record<string, unknown>, topic: string): Lesson {
  const sections = normalizeInteractiveSections(raw.sections);
  const isInteractive = isInteractiveLesson(raw) && sections.length > 0;

  const intro = normalizeIntroduction(
    isInteractive
      ? { text: String(getSectionByType(sections, 'hero')?.content?.description || topic), imageKeyword: topic }
      : raw.introduction,
  );
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

  const misconceptions = normalizeMisconceptions(raw.misconceptions);
  const legacyMistakes = normalizeStringList(raw.commonMistakes);

  const lesson: Lesson = {
    sections: sections.length ? sections : undefined,
    lessonHeader: normalizeLessonHeader(raw.lessonHeader),
    title: String(raw.title || getSectionByType(sections, 'hero')?.content?.topicName || topic),
    whyLearnThis: raw.whyLearnThis ? String(raw.whyLearnThis).trim() : undefined,
    quickSummary: normalizeQuickSummary(raw.quickSummary),
    concepts: normalizeConcepts(raw.concepts),
    realWorldConnections: normalizeRealWorldConnections(raw.realWorldConnections),
    memoryTricks: normalizeStringList(raw.memoryTricks),
    comparisons: normalizeComparisons(raw.comparisons),
    misconceptions: misconceptions.length ? misconceptions : undefined,
    examPrep: normalizeExamPrep(raw.examPrep),
    mcqs: normalizeMcqs(raw.mcqs),
    trueFalse: normalizeTrueFalse(raw.trueFalse),
    fillBlanks: normalizeFillBlanks(raw.fillBlanks),
    matchFollowing: normalizeMatchPairs(raw.matchFollowing),
    shortAnswer: normalizePracticeList(raw.shortAnswer),
    longAnswer: normalizePracticeList(raw.longAnswer),
    caseStudies: normalizeCaseStudies(raw.caseStudies),
    activities: normalizeActivities(raw.activities),
    projectWork: normalizeProjectWork(raw.projectWork),
    gamifiedChallenges: normalizeGamified(raw.gamifiedChallenges),
    hotQuestions: normalizeHotQuestions(raw.hotQuestions),
    aiTutorQa: normalizeAiTutorQa(raw.aiTutorQa),
    discussionPrompts: normalizeStringList(raw.discussionPrompts),
    learningLevels: normalizeLearningLevels(raw.learningLevels),
    learningOutcomes: normalizeStringList(raw.learningOutcomes),
    introduction: intro,
    explanation,
    keyPoints,
    examples,
    summary: String(raw.summary || ''),
    realLifeAnalogy: raw.realLifeAnalogy ? String(raw.realLifeAnalogy).trim() : undefined,
    keyTerms: normalizeKeyTerms(raw.keyTerms),
    didYouKnow: normalizeStringList(raw.didYouKnow),
    commonMistakes: legacyMistakes.length
      ? legacyMistakes
      : misconceptions.map((m) => `❌ ${m.wrong} ✅ ${m.correct}`),
    examNotes: normalizeStringList(raw.examNotes),
    thinkingQuestions: normalizeStringList(raw.thinkingQuestions),
    oneMinuteRevision: oneMin.length ? oneMin : revisionNotes,
    askAiTeacherPrompts: (() => {
      const prompts = normalizeStringList(raw.askAiTeacherPrompts);
      if (prompts.length) return prompts;
      return normalizeAiTutorQa(raw.aiTutorQa).map((q) => q.question);
    })(),
    practiceQuestions: quizQuestions,
    imageKeywords: normalizeStringList(raw.imageKeywords),
    imageGallery: normalizeImageGallery(raw.imageGallery),
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

  if (lesson.sections?.length) {
    hydrateLegacyFromSections(lesson);
    const hero = getSectionByType(lesson.sections, 'hero');
    if (hero && !lesson.lessonHeader) {
      lesson.lessonHeader = {
        topicName: String(hero.content.topicName || topic),
        subject: String(hero.content.subject || ''),
        grade: String(hero.content.grade || ''),
        difficultyLevel: String(hero.content.difficulty || ''),
        estimatedLearningTime: String(hero.content.estimatedTime || ''),
      };
    }
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

export function getIntroductionImagePrompt(intro: Lesson['introduction']): string | undefined {
  return typeof intro === 'string' ? undefined : intro.imagePrompt;
}

function applyIntroPadding(lesson: Lesson, topic: string): void {
  const introText = getIntroductionText(lesson.introduction);
  const padded = padLessonIntro(introText, {
    whyLearnThis: lesson.whyLearnThis,
    summary: lesson.summary,
    keyPoints: lesson.keyPoints,
  }, topic);

  if (padded === introText) return;

  if (typeof lesson.introduction === 'string') {
    lesson.introduction = padded;
  } else {
    lesson.introduction = { ...lesson.introduction, text: padded };
  }
}

function assertInteractiveLessonQuality(lesson: Lesson): void {
  const sections = lesson.sections ?? [];
  if (sections.length < STUDY_PROMPT_LIMITS.minSections) {
    throw new Error(
      `Not enough sections (${sections.length}/${STUDY_PROMPT_LIMITS.minSections}). Please try again.`,
    );
  }
  const concepts = getSectionByType(sections, 'concept-cards');
  const conceptCount = Array.isArray(concepts?.content?.cards) ? concepts!.content.cards.length : 0;
  if (conceptCount < STUDY_PROMPT_LIMITS.minConceptCards) {
    throw new Error(
      `Not enough concept cards (${conceptCount}/${STUDY_PROMPT_LIMITS.minConceptCards}). Please try again.`,
    );
  }
  if ((lesson.flashcards?.length ?? 0) < STUDY_PROMPT_LIMITS.minFlashcards) {
    throw new Error(
      `Not enough flashcards (${lesson.flashcards?.length ?? 0}/${STUDY_PROMPT_LIMITS.minFlashcards}). Please try again.`,
    );
  }
  const quiz = getSectionByType(sections, 'quick-quiz');
  const quizCount = Array.isArray(quiz?.content?.questions) ? quiz!.content.questions.length : 0;
  if (quizCount < STUDY_PROMPT_LIMITS.minQuickQuiz) {
    throw new Error(
      `Not enough quiz questions (${quizCount}/${STUDY_PROMPT_LIMITS.minQuickQuiz}). Please try again.`,
    );
  }
}

function assertLessonQuality(lesson: Lesson, topic: string): void {
  if (!lesson.title) {
    throw new Error('Invalid lesson structure received');
  }

  if (lesson.sections?.length) {
    assertInteractiveLessonQuality(lesson);
    if (!lesson.summary) {
      const remember = getSectionByType(lesson.sections, 'remember-this');
      lesson.summary = Array.isArray(remember?.content?.bullets)
        ? remember!.content.bullets.slice(0, 3).map(String).join(' ')
        : `Great job learning about ${topic}!`;
    }
    return;
  }

  if (!getIntroductionText(lesson.introduction) || !lesson.summary) {
    throw new Error('Invalid lesson structure received');
  }

  applyIntroPadding(lesson, topic);

  const introError = validateLessonIntro(getIntroductionText(lesson.introduction));
  if (introError) {
    throw new Error(introError);
  }

  if ((lesson.flashcards?.length ?? 0) < STUDY_PROMPT_LIMITS.minFlashcards) {
    throw new Error(
      `Not enough flashcards (${lesson.flashcards?.length ?? 0}/${STUDY_PROMPT_LIMITS.minFlashcards}). Please try again.`,
    );
  }
}

function isRetryableLessonError(err: unknown): boolean {
  if (axios.isAxiosError(err) || isAiServiceUnreachable(err)) return false;
  if (err instanceof SyntaxError) return true;
  if (err instanceof Error) {
    return (
      err.message.includes('too short') ||
      err.message.includes('Not enough') ||
      err.message.includes('Invalid lesson structure') ||
      err.message.includes('empty message')
    );
  }
  return false;
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

  const inputCheck = validateStudyInputs({
    topic,
    subject: config.subject,
    instructions: config.instructions,
  });
  if (!inputCheck.ok) {
    throw new Error(inputCheck.message);
  }

  const basePrompt = buildStudyLessonPrompt(config, kidName, classLevel, examStyle, studyOptions);
  let lastError: unknown;

  for (let attempt = 0; attempt < STUDY_PROMPT_LIMITS.maxLessonAttempts; attempt++) {
    const retryHint =
      attempt === 0
        ? undefined
        : `Previous response failed validation. Return all 18 sections in sections array. Include at least ${STUDY_PROMPT_LIMITS.minConceptCards} concept cards, ${STUDY_PROMPT_LIMITS.minFlashcards} flashcards, ${STUDY_PROMPT_LIMITS.minQuickQuiz} quiz questions. Every section needs visual with nodes. Return complete valid JSON only.`;

    try {
      const { content } = await aiApi.chat({
        messages: [
          {
            role: 'system',
            content:
              'You are an expert instructional designer and UX designer for K-12 learning. ' +
              'Return ONLY valid JSON for the 18-section visual-first interactive study page. No markdown fences.',
          },
          {
            role: 'user',
            content: retryHint ? `${basePrompt}\n\n${retryHint}` : basePrompt,
          },
        ],
        temperature: attempt === 0 ? 0.65 : 0.55,
        num_predict: STUDY_PROMPT_LIMITS.maxNumPredict,
        timeoutMs: 600_000,
      });

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      const parsed = JSON.parse(jsonString) as Record<string, unknown>;
      const lesson = normalizeLesson(parsed, topic);

      assertLessonQuality(lesson, topic);

      lesson.introImageUrl = null;
      lesson.galleryImages = [];

      return lesson;
    } catch (error) {
      lastError = error;
      if (!isRetryableLessonError(error) || attempt >= STUDY_PROMPT_LIMITS.maxLessonAttempts - 1) {
        break;
      }
      console.warn(`[Study] Lesson attempt ${attempt + 1} failed, retrying…`, error);
    }
  }

  const error = lastError;
  if (axios.isAxiosError(error) || isAiServiceUnreachable(error)) {
    throw new Error(getErrorMessage(error));
  }
  if (error instanceof SyntaxError) {
    throw new Error('Failed to parse lesson. Please try again.');
  }
  if (error instanceof Error) throw error;
  throw new Error('Unknown error occurred while generating lesson');
}
