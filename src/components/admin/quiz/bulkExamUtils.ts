/**
 * Bulk exam upload — parsing utilities and Excel template generator.
 *
 * Excel sheet format (per tab = one exam):
 *   Row 1: metadata keys   → ExamName | Class | Subject | Difficulty | PassPercentage | TimeLimit
 *   Row 2: metadata values → Math Quiz | Class 3 | Maths | Basic | 60 | 30
 *   Row 3: (blank separator)
 *   Row 4: question headers → question | optionA | optionB | optionC | optionD | correctAnswer | explanation | hint | points
 *   Row 5+: question rows
 */

import * as XLSX from 'xlsx';

export const MAX_EXAMS = 50;
export const MAX_QUESTIONS_PER_EXAM = 50;

export interface ParsedQuestion {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  hint: string;
  points: number;
  rowIndex: number;
}

export interface ParsedExam {
  name: string;
  description: string;
  gradeLevel: string;
  subject: string;
  difficulty: string;
  passingPercentage: number;
  timeLimit: string;
  questions: ParsedQuestion[];
  errors: string[];
}

/** Normalise a cell value to a trimmed string */
const str = (v: unknown): string => String(v ?? '').trim();

/** Case-insensitive key → value lookup for a flat header/value pair of rows */
const metaGet = (keys: string[], values: string[], ...aliases: string[]): string => {
  for (const alias of aliases) {
    const idx = keys.findIndex((k) => k === alias.toLowerCase().replace(/\s+/g, ''));
    if (idx >= 0) return str(values[idx]);
  }
  return '';
};

/** Parse a single worksheet, reading metadata from the first 2 rows */
export const parseSheet = (
  ws: XLSX.WorkSheet,
  sheetName: string
): { exam: ParsedExam } => {
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
  const errors: string[] = [];

  if (!rawRows || rawRows.length < 2) {
    return {
      exam: {
        name: sheetName, description: '', gradeLevel: '', subject: '',
        difficulty: 'Basic', passingPercentage: 60, timeLimit: '',
        questions: [], errors: [`Sheet "${sheetName}": No data found`],
      },
    };
  }

  // --- Read metadata from rows 1–2 ---
  const metaKeys = (rawRows[0] as string[]).map((h) =>
    str(h).toLowerCase().replace(/\s+/g, '')
  );
  const metaVals = (rawRows[1] as string[]).map((v) => str(v));

  const examName   = metaGet(metaKeys, metaVals, 'examname', 'name', 'exam') || sheetName;
  const gradeLevel = metaGet(metaKeys, metaVals, 'class', 'gradelevel', 'grade', 'classlevel');
  const subject    = metaGet(metaKeys, metaVals, 'subject', 'sub');
  const difficulty = metaGet(metaKeys, metaVals, 'difficulty', 'level') || 'Basic';
  const passRaw    = metaGet(metaKeys, metaVals, 'passpercentage', 'pass%', 'passingpercentage', 'pass');
  const timeLimit  = metaGet(metaKeys, metaVals, 'timelimit', 'time', 'timelimit(mins)', 'timelimitmin');

  const passingPercentage = parseInt(passRaw) || 60;

  // --- Find the question header row (first row containing "question") ---
  let headerRowIdx = -1;
  for (let i = 2; i < rawRows.length; i++) {
    const rowStr = (rawRows[i] as string[])
      .map((c) => str(c).toLowerCase())
      .join('|');
    if (rowStr.includes('question')) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx < 0) {
    return {
      exam: {
        name: examName, description: '', gradeLevel, subject, difficulty,
        passingPercentage, timeLimit, questions: [],
        errors: [`Sheet "${sheetName}": No question header row found. Add a row with "question" column.`],
      },
    };
  }

  const headers = (rawRows[headerRowIdx] as string[]).map((h) =>
    str(h).toLowerCase().replace(/\s+/g, '')
  );

  const getCol = (row: unknown[], ...aliases: string[]): string => {
    for (const alias of aliases) {
      const idx = headers.indexOf(alias.toLowerCase().replace(/\s+/g, ''));
      if (idx >= 0) return str(row[idx]);
    }
    return '';
  };

  const questions: ParsedQuestion[] = [];

  for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i] as unknown[];
    const questionText = getCol(row, 'question', 'questiontext', 'q');
    if (!questionText) continue;

    const correctRaw = getCol(row, 'correctanswer', 'correct', 'answer').toUpperCase();
    if (!correctRaw) {
      errors.push(`Row ${i + 1}: Missing correctAnswer`);
      continue;
    }

    questions.push({
      question: questionText,
      optionA: getCol(row, 'optiona', 'option_a', 'a'),
      optionB: getCol(row, 'optionb', 'option_b', 'b'),
      optionC: getCol(row, 'optionc', 'option_c', 'c'),
      optionD: getCol(row, 'optiond', 'option_d', 'd'),
      correctAnswer: correctRaw,
      explanation: getCol(row, 'explanation', 'justification', 'reason'),
      hint: getCol(row, 'hint'),
      points: parseInt(getCol(row, 'points', 'marks') || '1') || 1,
      rowIndex: i + 1,
    });

    if (questions.length >= MAX_QUESTIONS_PER_EXAM) {
      errors.push(`Reached ${MAX_QUESTIONS_PER_EXAM} question limit. Extra rows ignored.`);
      break;
    }
  }

  return {
    exam: { name: examName, description: '', gradeLevel, subject, difficulty, passingPercentage, timeLimit, questions, errors },
  };
};

/** Parse all sheets in a workbook */
export const parseWorkbook = (workbook: XLSX.WorkBook): ParsedExam[] => {
  const exams: ParsedExam[] = [];
  for (const sheetName of workbook.SheetNames.slice(0, MAX_EXAMS)) {
    if (sheetName.toLowerCase().startsWith('_') || sheetName.toLowerCase() === 'template') continue;
    const { exam } = parseSheet(workbook.Sheets[sheetName], sheetName);
    exams.push(exam);
  }
  return exams;
};

/** Metadata row helpers for template generation */
const META_KEYS = ['ExamName', 'Class', 'Subject', 'Difficulty', 'PassPercentage', 'TimeLimit(mins)'];
const Q_HEADERS = ['question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'explanation', 'hint', 'points'];

const makeSheet = (
  meta: string[],
  questions: string[][]
): XLSX.WorkSheet => {
  const rows = [
    META_KEYS,
    meta,
    [],           // blank separator
    Q_HEADERS,
    ...questions,
  ];
  return XLSX.utils.aoa_to_sheet(rows);
};

/** Download the populated Excel template */
export const downloadBulkTemplate = (): void => {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Maths example
  XLSX.utils.book_append_sheet(
    wb,
    makeSheet(
      ['Math Quiz - Grade 3', 'Class 3', 'Maths', 'Basic', '60', '30'],
      [
        ['What is 5 × 6?', '25', '30', '35', '40', 'B', '5 times 6 equals 30', 'Count by 5s six times', '1'],
        ['What is 12 ÷ 4?', '2', '3', '4', '5', 'B', '12 divided by 4 is 3', '', '1'],
        ['What is 7 + 8?', '13', '14', '15', '16', 'C', '7 + 8 = 15', '', '1'],
      ]
    ),
    'Math Quiz - Grade 3'
  );

  // Sheet 2 — Science example (Advanced)
  XLSX.utils.book_append_sheet(
    wb,
    makeSheet(
      ['Science Quiz - Grade 5', 'Class 5', 'EVS / Science', 'Advanced', '65', '45'],
      [
        ['Which gas do plants absorb during photosynthesis?', 'Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen', 'C', 'Plants absorb CO2 to produce glucose and oxygen', 'Think about the food-making process in plants', '1'],
        ['Which planet is closest to the Sun?', 'Venus', 'Mercury', 'Earth', 'Mars', 'B', 'Mercury orbits closest to the Sun', 'First planet from Sun', '1'],
      ]
    ),
    'Science Quiz - Grade 5'
  );

  XLSX.writeFile(wb, 'bulk-exam-template.xlsx');
};
