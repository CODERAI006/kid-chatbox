/**
 * Weekly vocabulary themes — words grouped by topic for better retention.
 */

const WEEKLY_THEMES = [
  {
    day: 0,
    key: 'character',
    label: 'Character Building',
    description: 'Words about honesty, respect, responsibility, and good character.',
    examples: ['honest', 'respectful', 'responsible', 'brave', 'kind'],
  },
  {
    day: 1,
    key: 'science',
    label: 'Science',
    description: 'Science vocabulary from NCERT chapters and experiments.',
    examples: ['energy', 'gravity', 'ecosystem', 'observe', 'hypothesis'],
  },
  {
    day: 2,
    key: 'communication',
    label: 'Communication',
    description: 'Words for speaking, writing, and expressing ideas clearly.',
    examples: ['persuade', 'explain', 'clarify', 'describe', 'express'],
  },
  {
    day: 3,
    key: 'nature',
    label: 'Nature',
    description: 'Environment, habitats, climate, and the natural world.',
    examples: ['habitat', 'climate', 'biodiversity', 'renewable', 'sustainable'],
  },
  {
    day: 4,
    key: 'mathematics',
    label: 'Mathematics',
    description: 'Math vocabulary for problem-solving and reasoning.',
    examples: ['fraction', 'estimate', 'equation', 'compare', 'predict'],
  },
  {
    day: 5,
    key: 'general',
    label: 'General Knowledge',
    description: 'Civics, history, culture, and everyday knowledge words.',
    examples: ['democracy', 'heritage', 'innovation', 'culture', 'tradition'],
  },
  {
    day: 6,
    key: 'challenge',
    label: 'Advanced Challenge',
    description: 'Richer vocabulary for deeper thinking and expression.',
    examples: ['perseverance', 'empathy', 'sustainability', 'resilient', 'perspective'],
  },
];

/** Grade category labels for admin display */
const GRADE_CATEGORIES = {
  'Pre-K / Nursery': { tier: 'Beginner', focus: 'Basic vocabulary' },
  'Class 1 / Grade 1': { tier: 'Beginner', focus: 'Basic vocabulary' },
  'Class 2 / Grade 2': { tier: 'Beginner', focus: 'Everyday communication' },
  'Class 3 / Grade 3': { tier: 'Beginner', focus: 'Academic vocabulary' },
  'Class 4 / Grade 4': { tier: 'Intermediate', focus: 'Descriptive words' },
  'Class 5 / Grade 5': { tier: 'Intermediate', focus: 'Science & social studies' },
  'Class 6 / Grade 6': { tier: 'Intermediate', focus: 'Advanced vocabulary' },
  'Class 7 / Grade 7': { tier: 'Advanced', focus: 'Critical thinking words' },
  'Class 8 / Grade 8': { tier: 'Advanced', focus: 'High-school preparation' },
  'Class 9 / Grade 9': { tier: 'Advanced', focus: 'Academic & competitive exams' },
  'Class 10 / Grade 10': { tier: 'Advanced', focus: 'Academic & competitive exams' },
  'Class 11 / Grade 11': { tier: 'Expert', focus: 'College readiness' },
  'Class 12 / Grade 12': { tier: 'Expert', focus: 'College readiness' },
};

function getThemeForDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = d.getDay();
  return WEEKLY_THEMES.find((t) => t.day === day) || WEEKLY_THEMES[0];
}

function themePromptBlock(theme) {
  return `Today's theme: "${theme.label}" — ${theme.description}
All ${3} words MUST relate to this theme and connect to each other (not random unrelated dictionary words).
Example words for inspiration (do NOT copy all): ${theme.examples.join(', ')}`;
}

module.exports = {
  WEEKLY_THEMES,
  GRADE_CATEGORIES,
  getThemeForDate,
  themePromptBlock,
};
