/**
 * Daily puzzle quotas — 10 creative (brain/riddle/critical) + 10 core subjects = 20/day.
 */

const CREATIVE_DAILY_QUOTA = 10;
const CORE_DAILY_QUOTA = 10;
const DAILY_TOTAL = CREATIVE_DAILY_QUOTA + CORE_DAILY_QUOTA;

/** Core subjects — 10 puzzles spread across curriculum areas. */
const CORE_CATEGORY_SLOTS = [
  { category: 'Math', puzzleType: 'Applied Math Scenario', quota: 2, skillArea: 'Quantitative reasoning & problem-solving' },
  { category: 'Logic', puzzleType: 'Analytical Reasoning', quota: 1, skillArea: 'Logical deduction & patterns' },
  { category: 'Language', puzzleType: 'Vocabulary in Context', quota: 1, excludePuzzleTypes: ['Riddles'], skillArea: 'Reading comprehension & word power' },
  { category: 'Science', puzzleType: 'Science Application', quota: 1, skillArea: 'Scientific thinking & curiosity' },
  { category: 'GK', puzzleType: 'General Knowledge', quota: 2, skillArea: 'Awareness of world & India' },
  { category: 'History', puzzleType: 'Historical Reasoning', quota: 1, skillArea: 'Historical literacy & cause-effect' },
  { category: 'Civic Sense', puzzleType: 'Citizenship & Rights', quota: 1, skillArea: 'Democratic values & responsible citizenship' },
  { category: 'Financial Education', puzzleType: 'Money Smart Quiz', quota: 1, skillArea: 'Financial literacy & smart choices' },
];

/** Brain teasers, riddles & critical thinking — 10 puzzles (heavier daily focus). */
const CREATIVE_CATEGORY_SLOTS = [
  { category: 'Brain Teaser', puzzleType: 'Lateral Thinking', quota: 4, label: 'Brain Teaser', skillArea: 'Creative & out-of-box thinking' },
  { category: 'Language', puzzleType: 'Riddles', quota: 3, label: 'Riddles', skillArea: 'Word play, riddles & lateral language puzzles' },
  { category: 'Critical Thinking', puzzleType: 'Decision Analysis', quota: 3, label: 'Critical Thinking', skillArea: 'Evaluate options & justify decisions' },
];

const DAILY_CATEGORY_SLOTS = [...CORE_CATEGORY_SLOTS, ...CREATIVE_CATEGORY_SLOTS];

/** @deprecated use DAILY_CATEGORY_SLOTS */
const DAILY_SKILL_CATEGORIES = DAILY_CATEGORY_SLOTS;

const PUZZLES_PER_CATEGORY = 2;

function getDailyCategoryPlan(classNum) {
  return DAILY_CATEGORY_SLOTS.map((c) => ({
    ...c,
    classFrom: Math.max(1, classNum - 1),
    classTo: Math.min(12, classNum + 1),
  }));
}

function expandPlanSlots(plan) {
  const slots = [];
  plan.forEach((entry) => {
    const n = entry.quota || 1;
    for (let i = 0; i < n; i++) {
      slots.push({ ...entry, slotIndex: slots.length + 1 });
    }
  });
  return slots;
}

function slotBreakdownKey(slot) {
  return slot.label || (slot.puzzleType === 'Riddles' ? 'Riddles' : slot.category);
}

function puzzleBreakdownKey(puzzle) {
  if (puzzle.puzzleType === 'Riddles') return 'Riddles';
  return puzzle.category;
}

function totalDailySlots() {
  return DAILY_CATEGORY_SLOTS.reduce((sum, s) => sum + (s.quota || 1), 0);
}

module.exports = {
  CREATIVE_DAILY_QUOTA,
  CORE_DAILY_QUOTA,
  DAILY_TOTAL,
  CORE_CATEGORY_SLOTS,
  CREATIVE_CATEGORY_SLOTS,
  DAILY_CATEGORY_SLOTS,
  DAILY_SKILL_CATEGORIES,
  PUZZLES_PER_CATEGORY,
  getDailyCategoryPlan,
  expandPlanSlots,
  slotBreakdownKey,
  puzzleBreakdownKey,
  totalDailySlots,
};
