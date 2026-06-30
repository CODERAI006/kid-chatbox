/** Stage messages shown while AI generates study lessons or quizzes. */

export type AiWaitMode = 'study' | 'quiz';

export interface AiWaitStage {
  icon: string;
  message: string;
  hint?: string;
}

export const STUDY_WAIT_STAGES: AiWaitStage[] = [
  { icon: '📖', message: 'Writing your story introduction…', hint: 'A fun hook to pull you in' },
  { icon: '🧩', message: 'Building concepts and examples…', hint: 'Making ideas easy to remember' },
  { icon: '🃏', message: 'Creating flashcards…', hint: 'Quick revision cards for you' },
  { icon: '📝', message: 'Adding practice questions…', hint: 'So you can test yourself' },
  { icon: '🎯', message: 'Polishing your lesson…', hint: 'Almost ready!' },
];

export const QUIZ_WAIT_STAGES: AiWaitStage[] = [
  { icon: '🧠', message: 'Thinking up questions…', hint: 'Picking the best topics' },
  { icon: '📚', message: 'Crafting answer choices…', hint: 'Tricky but fair options' },
  { icon: '✨', message: 'Writing explanations…', hint: 'Learn from every answer' },
  { icon: '🖼️', message: 'Adding illustrations…', hint: 'For visual learners' },
  { icon: '🎯', message: 'Finishing your quiz…', hint: 'Get set to play!' },
];

export function getAiWaitStages(mode: AiWaitMode): AiWaitStage[] {
  return mode === 'study' ? STUDY_WAIT_STAGES : QUIZ_WAIT_STAGES;
}
