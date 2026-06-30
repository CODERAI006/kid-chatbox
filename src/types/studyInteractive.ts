/** Visual-first interactive study page types (18-section design). */

export type StudyVisualType =
  | 'flowchart'
  | 'mindmap'
  | 'timeline'
  | 'comparison'
  | 'infographic'
  | 'decision-tree'
  | 'process'
  | 'cycle'
  | 'tree'
  | 'icon-grid'
  | 'diagram'
  | 'table';

export interface StudyVisualNode {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  highlight?: boolean;
}

export interface StudyVisualConnection {
  from: string;
  to: string;
  label?: string;
}

export interface StudyVisualAnimation {
  step: number;
  action: 'highlight' | 'reveal' | 'pulse' | 'connect';
  targetIds: string[];
  label?: string;
}

export interface StudyVisualSpec {
  type: StudyVisualType;
  title?: string;
  nodes?: StudyVisualNode[];
  connections?: StudyVisualConnection[];
  labels?: string[];
  icons?: string[];
  colors?: Record<string, string>;
  animation?: StudyVisualAnimation[];
  headers?: string[];
  rows?: string[][];
}

export type StudySectionType =
  | 'hero'
  | 'why-learn'
  | 'big-picture'
  | 'roadmap'
  | 'concept-cards'
  | 'infographics'
  | 'memory-aids'
  | 'learning-steps'
  | 'real-life'
  | 'common-mistakes'
  | 'remember-this'
  | 'cheat-sheet'
  | 'flashcards'
  | 'quick-quiz'
  | 'knowledge-check'
  | 'ask-ai'
  | 'final-revision'
  | 'celebration';

export interface WhyLearnCard {
  icon: string;
  title: string;
  sentence: string;
}

export interface RoadmapStep {
  label: string;
  completed: boolean;
  icon?: string;
}

export interface ConceptStep {
  step: number;
  title: string;
  detail: string;
}

export interface ConceptCard {
  title: string;
  definition: string;
  visual?: StudyVisualSpec;
  steps: ConceptStep[];
  example: string;
  practice: { question: string; hint?: string; answer?: string };
  commonMistake: string;
  memoryTrick: string;
  quickRecap: string;
}

export interface MemoryAid {
  title: string;
  visual: StudyVisualSpec;
  remember: string;
}

export interface LearningStepAnimation {
  label: string;
  description: string;
}

export interface RealLifeCard {
  category: string;
  icon: string;
  sentence: string;
}

export interface MistakeCard {
  mistake: string;
  why: string;
  fix: string;
}

export interface CheatSheetItem {
  label: string;
  value: string;
}

export interface QuickQuizQuestion {
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  whyWrong?: string[];
}

export interface KnowledgeCheckItem {
  kind: 'true-false' | 'fill-blank' | 'match' | 'sequence' | 'label';
  prompt: string;
  answer: string | boolean;
  options?: string[];
  pairs?: Array<{ left: string; right: string }>;
  sequence?: string[];
  labels?: string[];
}

export interface CelebrationContent {
  progressPercent: number;
  xp: number;
  stars: number;
  achievement: string;
  nextTopic: string;
}

export interface StudyInteractiveSection {
  id: string;
  title: string;
  type: StudySectionType;
  order: number;
  icon: string;
  content: Record<string, unknown>;
  visual?: StudyVisualSpec;
  interactions?: Record<string, unknown>;
  learningObjective: string;
}

export interface StudyInteractiveLesson {
  title: string;
  sections: StudyInteractiveSection[];
}
