/** Section nav metadata for the 17-part study lesson layout. */
export interface StudySectionMeta {
  id: string;
  label: string;
  emoji: string;
}

export const STUDY_LESSON_SECTIONS: StudySectionMeta[] = [
  { id: 'topic-header', label: 'Topic', emoji: '📚' },
  { id: 'why-learn', label: 'Why Learn', emoji: '💡' },
  { id: 'quick-summary', label: 'Summary', emoji: '⚡' },
  { id: 'detailed-explanation', label: 'Explain', emoji: '📖' },
  { id: 'visual-learning', label: 'Visual', emoji: '🎨' },
  { id: 'real-life-analogy', label: 'Analogy', emoji: '🌍' },
  { id: 'real-world-examples', label: 'Examples', emoji: '🔍' },
  { id: 'key-terms', label: 'Terms', emoji: '📝' },
  { id: 'fun-facts', label: 'Fun Facts', emoji: '🌟' },
  { id: 'did-you-know', label: 'Did You Know', emoji: '🤔' },
  { id: 'common-mistakes', label: 'Mistakes', emoji: '⚠️' },
  { id: 'exam-notes', label: 'Exam Notes', emoji: '📋' },
  { id: 'questions-answers', label: 'Q & A', emoji: '✏️' },
  { id: 'thinking-questions', label: 'Think', emoji: '🧠' },
  { id: 'flashcards', label: 'Cards', emoji: '🃏' },
  { id: 'one-minute-revision', label: '1-Min Rev', emoji: '⏱️' },
  { id: 'ask-ai-teacher', label: 'Ask AI', emoji: '🤖' },
];

export function scrollToStudySection(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
