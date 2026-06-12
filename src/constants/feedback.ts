/** Learning feature ideas students can vote for */
export const FEATURE_WISHES = [
  { id: 'games', label: 'Fun games & puzzles', icon: '🎮' },
  { id: 'progress', label: 'Progress charts & streaks', icon: '📊' },
  { id: 'voice', label: 'Voice explanations', icon: '🎤' },
  { id: 'visuals', label: 'More pictures & diagrams', icon: '🖼️' },
  { id: 'friends', label: 'Study with friends', icon: '👫' },
  { id: 'challenges', label: 'Daily challenges', icon: '🏆' },
  { id: 'stories', label: 'Story-based lessons', icon: '📖' },
  { id: 'ai_tutor', label: 'Smarter AI tutor', icon: '🤖' },
  { id: 'reminders', label: 'Better study reminders', icon: '⏰' },
  { id: 'other', label: 'Something else', icon: '✨' },
] as const;

export const RATING_EMOJIS = ['😕', '😐', '🙂', '😊', '🤩'] as const;

export const FEEDBACK_SOURCES = ['sidebar', 'quiz_results', 'global'] as const;
