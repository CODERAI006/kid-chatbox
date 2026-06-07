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

export const QUICK_ACTION_PROMPTS: Record<LearningQuickAction, string> = {
  learn: 'Give me a quick, kid-friendly explanation with a hook and simple summary.',
  visualize: 'Show an interactive diagram with labeled hotspots I can tap to learn more.',
  watch: 'Include a short video suggestion and an audio summary I can read aloud.',
  quiz: 'Give me a quick challenge quiz with instant feedback on my answer.',
  flashcards:
    'Create at least 20 interactive flashcards (front/back) covering this topic: terms, definitions, facts, and review questions. Return JSON with a flashcard card containing 20+ pairs.',
};
