/** Board / exam-style options shared across quiz, study, and schedules. */
export const EXAM_BOARDS = [
  'CBSE',
  'NCERT',
  'Olympiad',
  'Competitive',
  'ICSE',
  'State Board',
] as const;

export type ExamBoard = (typeof EXAM_BOARDS)[number];
