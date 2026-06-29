/**
 * Structured card types for the Conversational Learning Workspace.
 */

export type LearningCardType =
  | 'hook'
  | 'explanation'
  | 'text'
  | 'diagram'
  | 'image'
  | 'interactive'
  | 'video'
  | 'audio'
  | 'example'
  | 'quiz'
  | 'flashcard'
  | 'askDeeper'
  | 'progress'
  | 'timeline'
  | 'comparison'
  | 'code'
  | 'formula';

export interface LearningHotspot {
  id: string;
  label: string;
  detail: string;
}

export interface LearningQuizOption {
  id: string;
  label: string;
}

export interface LearningWorkspaceCard {
  type: LearningCardType;
  title?: string;
  body?: string;
  bullets?: string[];
  readMore?: string;
  imageUrl?: string;
  imageAlt?: string;
  hotspots?: LearningHotspot[];
  videoUrl?: string;
  videoLabel?: string;
  audioText?: string;
  exampleEmoji?: string;
  question?: string;
  options?: LearningQuizOption[];
  correctOptionId?: string;
  correctFeedback?: string;
  wrongFeedback?: string;
  front?: string;
  back?: string;
  flashcards?: Array<{ front: string; back: string }>;
  prompts?: string[];
  progressPercent?: number;
  progressLabel?: string;
  timeline?: Array<{ label: string; detail: string }>;
  comparison?: { leftTitle: string; leftBody: string; rightTitle: string; rightBody: string };
  code?: string;
  language?: string;
  formula?: string;
  formulaExplanation?: string;
}

export interface LearningWorkspaceResponse {
  topic: string;
  progressPercent?: number;
  cards: LearningWorkspaceCard[];
}

export type LearningQuickAction = 'learn' | 'visualize' | 'watch' | 'quiz' | 'flashcards';

export type LearningStudyFormat =
  | 'learn'
  | 'detail'
  | 'flashcards'
  | 'quiz'
  | 'chat'
  | 'conversation'
  | 'studyplan'
  | 'studyplan-lesson';

export interface StudyFormatOptions {
  quizCount?: number;
}

export type LearningBotMode = 'workspace' | 'chat';

export interface LearningFormatOption {
  key: LearningStudyFormat;
  emoji: string;
  label: string;
  hint: string;
  mode: LearningBotMode;
}

/** Shown when starting a new chat — pick format first, then enter topic. */
export const STUDY_FORMAT_OPTIONS: LearningFormatOption[] = [
  { key: 'learn', emoji: '📖', label: 'Quick explanation', hint: 'Hook + short summary', mode: 'workspace' },
  { key: 'detail', emoji: '📚', label: 'Detailed lesson', hint: 'Full lesson, facts & key points', mode: 'workspace' },
  { key: 'flashcards', emoji: '⚡', label: 'Flashcards', hint: '20+ swipe cards', mode: 'workspace' },
  { key: 'quiz', emoji: '🎮', label: 'Quiz me', hint: 'Choose how many questions', mode: 'workspace' },
  { key: 'chat', emoji: '💬', label: 'Just chat', hint: 'Natural conversation', mode: 'chat' },
  { key: 'conversation', emoji: '🎙️', label: 'Voice conversation', hint: 'Talk & listen with Guru', mode: 'chat' },
  { key: 'studyplan', emoji: '📅', label: 'Plan my studies', hint: 'Exam prep schedule', mode: 'workspace' },
];

export const QUICK_ACTION_PROMPTS: Record<LearningQuickAction, string> = {
  learn: 'Give me a quick, kid-friendly explanation with a hook and simple summary.',
  visualize: 'Show an interactive diagram with labeled hotspots I can tap to learn more.',
  watch: 'Include a short video suggestion and an audio summary I can read aloud.',
  quiz: 'Give me a quick challenge quiz with instant feedback on my answer.',
  flashcards:
    'Create at least 20 interactive flashcards (front/back) covering this topic: terms, definitions, facts, and review questions. Return JSON with a flashcard card containing 20+ pairs.',
};

/** Builds the first user message after format + topic are chosen. */
export function buildStudyTopicPrompt(
  format: LearningStudyFormat,
  topic: string,
  options?: StudyFormatOptions
): string {
  const t = topic.trim();
  const quizCount = options?.quizCount ?? 10;

  const prompts: Record<LearningStudyFormat, string> = {
    learn: `Explain "${t}" using ONLY a hook card and a short explanation card. No flashcards or quiz.`,
    detail:
      `Teach "${t}" as a complete premium learning module (32-section curriculum). Return cards: ` +
      '(1) hook with learning objectives, difficulty, time estimate, ' +
      '(2) explanation with story hook in body and full lesson in readMore, ' +
      '(3) text "Why learn this?", (4) text "Quick summary" bullets, ' +
      '(5) text "Memory tricks", (6) comparison card if relevant, ' +
      '(7) text "Key facts", (8) text "Common misconceptions", ' +
      '(9) text "Points to remember", (10) text "Real-world connections". ' +
      'Engaging, child-friendly, curriculum-aligned. No placeholders.',
    flashcards:
      `Create ONLY flashcards about "${t}" — one flashcard card with at least 20 question/answer pairs. Each front must end with ?.`,
    quiz:
      `Quiz me on "${t}". Return exactly ${quizCount} separate quiz cards (type "quiz"). ` +
      'Each card: one question, 3-4 options, correctOptionId, correctFeedback, wrongFeedback. ' +
      'Optional: one brief hook card. No flashcards or long lesson cards.',
    chat: `Let's talk about "${t}". I may ask follow-up questions — answer naturally.`,
    conversation:
      `Let's have a friendly voice conversation about "${t}". ` +
      'Keep each reply short (2-4 sentences) so they are easy to listen to. ' +
      'Be warm, soft-spoken, and encouraging like a caring tutor.',
    studyplan: `Plan my exam prep for "${t}".`,
    'studyplan-lesson': `Teach "${t}" as a fun scheduled exam-prep lesson with facts, tips, and Q&A.`,
  };
  return prompts[format];
}

export function formatOptionLabel(format: LearningStudyFormat | null): string | null {
  if (!format) return null;
  return STUDY_FORMAT_OPTIONS.find((o) => o.key === format)?.label ?? null;
}
