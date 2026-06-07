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
  | 'visualize'
  | 'watch'
  | 'quiz'
  | 'chat';

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
  { key: 'detail', emoji: '📚', label: 'Detailed lesson', hint: 'Summary + read more', mode: 'workspace' },
  { key: 'flashcards', emoji: '⚡', label: 'Flashcards', hint: '20+ question cards', mode: 'workspace' },
  { key: 'visualize', emoji: '🖼', label: 'Diagram', hint: 'Interactive hotspots', mode: 'workspace' },
  { key: 'watch', emoji: '🎥', label: 'Video & audio', hint: 'Watch + listen', mode: 'workspace' },
  { key: 'quiz', emoji: '🎮', label: 'Quiz me', hint: 'Quick challenge', mode: 'workspace' },
  { key: 'chat', emoji: '💬', label: 'Just chat', hint: 'Natural conversation', mode: 'chat' },
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
export function buildStudyTopicPrompt(format: LearningStudyFormat, topic: string): string {
  const t = topic.trim();
  const prompts: Record<LearningStudyFormat, string> = {
    learn: `Explain "${t}" in a kid-friendly way with a hook card and a short summary.`,
    detail: `Teach "${t}" with an explanation card: short body plus readMore (3-6 detailed paragraphs with examples). Include flashcards too.`,
    flashcards: `Create at least 20 flashcards about "${t}". Each front must be a question ending with ?. Include a brief hook card.`,
    visualize: `Explain "${t}" with an interactive diagram (hotspots) and a short explanation.`,
    watch: `Help me learn "${t}" with a video suggestion, audio summary, and brief explanation.`,
    quiz: `Teach "${t}" briefly then give me a quiz card with instant feedback.`,
    chat: `Let's talk about "${t}". I may ask follow-up questions — answer naturally.`,
  };
  return prompts[format];
}
