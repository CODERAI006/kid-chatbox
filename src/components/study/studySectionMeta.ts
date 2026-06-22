/** Section nav metadata for the 32-part study lesson layout. */
export interface StudySectionMeta {
  id: string;
  label: string;
  emoji: string;
}

export const STUDY_LESSON_SECTIONS: StudySectionMeta[] = [
  { id: 'topic-header', label: 'Topic', emoji: '📚' },
  { id: 'learning-objectives', label: 'Goals', emoji: '🎯' },
  { id: 'why-learn', label: 'Why Learn', emoji: '💡' },
  { id: 'quick-summary', label: 'Summary', emoji: '⚡' },
  { id: 'detailed-explanation', label: 'Explain', emoji: '📖' },
  { id: 'concepts', label: 'Concepts', emoji: '🧩' },
  { id: 'visual-learning', label: 'Visual', emoji: '🎨' },
  { id: 'real-world-connections', label: 'World', emoji: '🌏' },
  { id: 'memory-tricks', label: 'Memory', emoji: '🧠' },
  { id: 'comparisons', label: 'Compare', emoji: '🔀' },
  { id: 'key-terms', label: 'Terms', emoji: '📝' },
  { id: 'fun-facts', label: 'Fun Facts', emoji: '🌟' },
  { id: 'did-you-know', label: 'Did You Know', emoji: '🤔' },
  { id: 'misconceptions', label: 'Myths', emoji: '💡' },
  { id: 'exam-prep', label: 'Exam', emoji: '📋' },
  { id: 'mcqs', label: 'MCQ', emoji: '📝' },
  { id: 'questions-answers', label: 'Q & A', emoji: '✏️' },
  { id: 'thinking-questions', label: 'Think', emoji: '🧠' },
  { id: 'activities', label: 'Activities', emoji: '🔬' },
  { id: 'flashcards', label: 'Cards', emoji: '🃏' },
  { id: 'one-minute-revision', label: '1-Min Rev', emoji: '⏱️' },
  { id: 'hot-questions', label: 'HOT', emoji: '🚀' },
  { id: 'learning-outcomes', label: 'Outcomes', emoji: '✔️' },
  { id: 'ask-ai-teacher', label: 'Ask AI', emoji: '🤖' },
];

export function scrollToStudySection(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
