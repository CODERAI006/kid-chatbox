/**
 * Allowed grade/class values for user profiles and registration.
 * Keep in sync with src/constants/auth.ts GRADES.
 */

const ALLOWED_GRADES = [
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
  'Graduation',
  'Post Graduation',
];

const GRADE_SET = new Set(ALLOWED_GRADES);

function normalizeGrade(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function isValidGrade(value) {
  const normalized = normalizeGrade(value);
  return normalized != null && GRADE_SET.has(normalized);
}

module.exports = {
  ALLOWED_GRADES,
  normalizeGrade,
  isValidGrade,
};
