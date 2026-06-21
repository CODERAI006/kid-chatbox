/**
 * Daily puzzle categories — skill development across all areas (2 per category = 20/day).
 */

const DAILY_SKILL_CATEGORIES = [
  { category: 'Math', puzzleType: 'Applied Math Scenario', skillArea: 'Quantitative reasoning & problem-solving' },
  { category: 'Logic', puzzleType: 'Analytical Reasoning', skillArea: 'Logical deduction & patterns' },
  { category: 'Language', puzzleType: 'Vocabulary in Context', skillArea: 'Reading comprehension & word power' },
  { category: 'Science', puzzleType: 'Science Application', skillArea: 'Scientific thinking & curiosity' },
  { category: 'GK', puzzleType: 'General Knowledge', skillArea: 'Awareness of world & India' },
  { category: 'History', puzzleType: 'Historical Reasoning', skillArea: 'Historical literacy & cause-effect' },
  { category: 'Civic Sense', puzzleType: 'Citizenship & Rights', skillArea: 'Democratic values & responsible citizenship' },
  { category: 'Financial Education', puzzleType: 'Money Smart Quiz', skillArea: 'Financial literacy & smart choices' },
  { category: 'Brain Teaser', puzzleType: 'Lateral Thinking', skillArea: 'Creative & out-of-box thinking' },
  { category: 'Critical Thinking', puzzleType: 'Decision Analysis', skillArea: 'Evaluate options & justify decisions' },
];

const PUZZLES_PER_CATEGORY = 2;

function getDailyCategoryPlan(classNum) {
  return DAILY_SKILL_CATEGORIES.map((c) => ({
    ...c,
    classFrom: Math.max(1, classNum - 1),
    classTo: Math.min(12, classNum + 1),
  }));
}

function totalDailySlots() {
  return DAILY_SKILL_CATEGORIES.length * PUZZLES_PER_CATEGORY;
}

module.exports = {
  DAILY_SKILL_CATEGORIES,
  PUZZLES_PER_CATEGORY,
  getDailyCategoryPlan,
  totalDailySlots,
};
