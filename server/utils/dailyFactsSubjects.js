/** Subject areas for daily Facts & Fun (10 facts/day, all areas covered). */

const DAILY_FACT_SUBJECTS = [
  { id: 'science', label: 'Science', emoji: '🔬' },
  { id: 'geography', label: 'Geography', emoji: '🌍' },
  { id: 'history', label: 'History', emoji: '📜' },
  { id: 'current_affairs', label: 'Current Affairs', emoji: '📰' },
  { id: 'general_knowledge', label: 'General Knowledge', emoji: '💡' },
  { id: 'nature', label: 'Nature', emoji: '🌿' },
  { id: 'india', label: 'India', emoji: '🇮🇳' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'math', label: 'Math', emoji: '🔢' },
];

const FACT_COUNT = 10;

function subjectById(id) {
  return DAILY_FACT_SUBJECTS.find((s) => s.id === id) || DAILY_FACT_SUBJECTS[4];
}

module.exports = { DAILY_FACT_SUBJECTS, FACT_COUNT, subjectById };
