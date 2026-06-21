/**
 * Puzzle type definitions, class rules, and difficulty metadata.
 */

const DEFAULT_GRADES = [
  'Pre-K / Nursery',
  'Class 1 / Grade 1',
  'Class 2 / Grade 2',
  'Class 3 / Grade 3',
  'Class 4 / Grade 4',
  'Class 5 / Grade 5',
  'Class 6 / Grade 6',
  'Class 7 / Grade 7',
  'Class 8 / Grade 8',
  'Class 9 / Grade 9',
  'Class 10 / Grade 10',
  'Class 11 / Grade 11',
  'Class 12 / Grade 12',
];

const DIFFICULTY_META = {
  Easy: { timeLimit: 25, points: 5 },
  Medium: { timeLimit: 60, points: 10 },
  Hard: { timeLimit: 120, points: 15 },
};

/** All supported puzzle types with class and difficulty ranges. */
const PUZZLE_TYPES = [
  { category: 'Math', puzzleType: 'Number Pattern', classFrom: 3, classTo: 8, difficulties: ['Easy', 'Medium'] },
  { category: 'Math', puzzleType: 'Missing Number', classFrom: 1, classTo: 3, difficulties: ['Easy'] },
  { category: 'Math', puzzleType: 'Magic Square', classFrom: 4, classTo: 8, difficulties: ['Medium'] },
  { category: 'Math', puzzleType: 'Number Pyramid', classFrom: 3, classTo: 7, difficulties: ['Medium'] },
  { category: 'Math', puzzleType: 'Algebra Puzzle', classFrom: 6, classTo: 10, difficulties: ['Easy', 'Medium'] },
  { category: 'Math', puzzleType: 'Probability Puzzle', classFrom: 8, classTo: 12, difficulties: ['Medium', 'Hard'] },
  { category: 'Math', puzzleType: 'Geometry Puzzle', classFrom: 6, classTo: 12, difficulties: ['Medium'] },
  { category: 'Logic', puzzleType: 'Odd One Out', classFrom: 1, classTo: 5, difficulties: ['Easy'] },
  { category: 'Logic', puzzleType: 'Pattern Recognition', classFrom: 1, classTo: 5, difficulties: ['Easy'] },
  { category: 'Logic', puzzleType: 'Analogy', classFrom: 3, classTo: 8, difficulties: ['Easy'] },
  { category: 'Logic', puzzleType: 'Coding-Decoding', classFrom: 6, classTo: 12, difficulties: ['Medium'] },
  { category: 'Logic', puzzleType: 'Blood Relations', classFrom: 5, classTo: 10, difficulties: ['Easy', 'Medium'] },
  { category: 'Logic', puzzleType: 'Direction Sense', classFrom: 6, classTo: 12, difficulties: ['Medium'] },
  { category: 'Logic', puzzleType: 'Seating Arrangement', classFrom: 7, classTo: 12, difficulties: ['Medium', 'Hard'] },
  { category: 'Logic', puzzleType: 'Syllogism', classFrom: 8, classTo: 12, difficulties: ['Medium'] },
  { category: 'Language', puzzleType: 'Jumbled Words', classFrom: 1, classTo: 5, difficulties: ['Easy'] },
  { category: 'Language', puzzleType: 'Synonyms', classFrom: 4, classTo: 10, difficulties: ['Easy'] },
  { category: 'Language', puzzleType: 'Antonyms', classFrom: 4, classTo: 10, difficulties: ['Easy'] },
  { category: 'Language', puzzleType: 'Fill in the Blank', classFrom: 1, classTo: 5, difficulties: ['Easy'] },
  { category: 'Language', puzzleType: 'Crossword', classFrom: 4, classTo: 12, difficulties: ['Medium'] },
  { category: 'Language', puzzleType: 'Riddles', classFrom: 3, classTo: 12, difficulties: ['Medium'] },
  { category: 'Science', puzzleType: 'Animal Puzzle', classFrom: 3, classTo: 8, difficulties: ['Easy', 'Medium'] },
  { category: 'Science', puzzleType: 'Human Body Puzzle', classFrom: 3, classTo: 8, difficulties: ['Easy'] },
  { category: 'Science', puzzleType: 'Physics Logic', classFrom: 8, classTo: 12, difficulties: ['Medium'] },
  { category: 'Science', puzzleType: 'Chemistry Puzzle', classFrom: 6, classTo: 12, difficulties: ['Easy', 'Medium'] },
  { category: 'Science', puzzleType: 'Food Chain Puzzle', classFrom: 4, classTo: 8, difficulties: ['Easy'] },
  { category: 'GK', puzzleType: 'Flag Identification', classFrom: 4, classTo: 12, difficulties: ['Easy'] },
  { category: 'GK', puzzleType: 'Monument Puzzle', classFrom: 3, classTo: 12, difficulties: ['Easy'] },
  { category: 'GK', puzzleType: 'Capital Cities', classFrom: 4, classTo: 12, difficulties: ['Easy'] },
  { category: 'GK', puzzleType: 'Historical Event Puzzle', classFrom: 6, classTo: 12, difficulties: ['Medium'] },
  { category: 'Visual', puzzleType: 'Spot the Difference', classFrom: 1, classTo: 8, difficulties: ['Easy'] },
  { category: 'Visual', puzzleType: 'Mirror Image', classFrom: 3, classTo: 10, difficulties: ['Medium'] },
  { category: 'Visual', puzzleType: 'Shape Rotation', classFrom: 4, classTo: 12, difficulties: ['Medium'] },
  { category: 'Visual', puzzleType: 'Hidden Object', classFrom: 1, classTo: 8, difficulties: ['Easy'] },
  { category: 'Visual', puzzleType: 'Cube Counting', classFrom: 6, classTo: 12, difficulties: ['Hard'] },
  { category: 'Coding', puzzleType: 'Output Prediction', classFrom: 8, classTo: 12, difficulties: ['Medium'] },
  { category: 'Coding', puzzleType: 'Algorithm Puzzle', classFrom: 3, classTo: 6, difficulties: ['Easy'] },
  { category: 'Coding', puzzleType: 'Debugging Puzzle', classFrom: 9, classTo: 12, difficulties: ['Medium'] },
  { category: 'Coding', puzzleType: 'Flowchart Logic', classFrom: 7, classTo: 12, difficulties: ['Medium'] },
  { category: 'Memory', puzzleType: 'Sequence Recall', classFrom: 1, classTo: 6, difficulties: ['Easy'] },
  { category: 'Memory', puzzleType: 'Image Recall', classFrom: 1, classTo: 6, difficulties: ['Easy'] },
  { category: 'Critical Thinking', puzzleType: 'Real-Life Math Scenario', classFrom: 4, classTo: 10, difficulties: ['Medium'] },
  { category: 'Critical Thinking', puzzleType: 'Decision Making Puzzle', classFrom: 6, classTo: 12, difficulties: ['Medium'] },
  { category: 'Brain Teaser', puzzleType: 'Lateral Thinking Puzzle', classFrom: 6, classTo: 12, difficulties: ['Hard'] },
  { category: 'Brain Teaser', puzzleType: 'Trick Question', classFrom: 3, classTo: 12, difficulties: ['Easy'] },
];

/** Preferred puzzle types per class band for daily selection. */
const CLASS_BAND_PRIORITIES = {
  '1-2': ['Missing Number', 'Pattern Recognition', 'Odd One Out', 'Jumbled Words', 'Fill in the Blank', 'Sequence Recall', 'Hidden Object', 'Spot the Difference'],
  '3-5': ['Number Pattern', 'Odd One Out', 'Jumbled Words', 'Animal Puzzle', 'Food Chain Puzzle', 'Capital Cities', 'Riddles', 'Trick Question', 'Flag Identification'],
  '6-8': ['Analogy', 'Direction Sense', 'Chemistry Puzzle', 'Geometry Puzzle', 'Human Body Puzzle', 'Algorithm Puzzle', 'Flowchart Logic', 'Number Pyramid', 'Magic Square'],
  '9-10': ['Algebra Puzzle', 'Probability Puzzle', 'Coding-Decoding', 'Real-Life Math Scenario', 'Decision Making Puzzle', 'Output Prediction', 'Debugging Puzzle'],
  '11-12': ['Syllogism', 'Seating Arrangement', 'Lateral Thinking Puzzle', 'Cube Counting', 'Probability Puzzle', 'Coding-Decoding', 'Historical Event Puzzle'],
};

function classBandForGrade(classNum) {
  if (classNum <= 2) return '1-2';
  if (classNum <= 5) return '3-5';
  if (classNum <= 8) return '6-8';
  if (classNum <= 10) return '9-10';
  return '11-12';
}

function parseClassNum(grade) {
  if (!grade) return 5;
  const match = String(grade).match(/(\d{1,2})/);
  return match ? Number(match[1]) : 5;
}

function difficultyMeta(difficulty) {
  return DIFFICULTY_META[difficulty] || DIFFICULTY_META.Easy;
}

module.exports = {
  DEFAULT_GRADES,
  DIFFICULTY_META,
  PUZZLE_TYPES,
  CLASS_BAND_PRIORITIES,
  classBandForGrade,
  parseClassNum,
  difficultyMeta,
};
