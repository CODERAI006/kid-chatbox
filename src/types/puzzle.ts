/**
 * Puzzle module types.
 */

export type PuzzleDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface Puzzle {
  id: string;
  category: string;
  puzzleType: string;
  classFrom: number;
  classTo: number;
  difficulty: PuzzleDifficulty;
  question: string;
  options?: (string | number)[] | null;
  answer: string | number;
  explanation: string;
  timeLimit: number;
  points: number;
}

export interface DailyPuzzlesResponse {
  success: boolean;
  date: string;
  grade: string;
  puzzles: Puzzle[];
  puzzleCount?: number;
  cached?: boolean;
  message?: string;
}

export interface PuzzleGradeSetting {
  grade: string;
  enabled: boolean;
  dailyCount: number;
}

export interface PuzzleGlobalConfig {
  enabled: boolean;
  showOnHomepage: boolean;
  defaultGrade: string;
}

export interface PuzzleSettingsResponse {
  success: boolean;
  global: PuzzleGlobalConfig;
  settings: PuzzleGradeSetting[];
  types?: Array<{
    category: string;
    puzzleType: string;
    classFrom: number;
    classTo: number;
    difficulties: PuzzleDifficulty[];
  }>;
}

export interface PuzzleTypeMeta {
  category: string;
  puzzleType: string;
  classFrom: number;
  classTo: number;
  difficulties: PuzzleDifficulty[];
}

export interface ArchivedPuzzleItem extends Puzzle {
  archiveDate: string;
  grade: string;
}

export interface PuzzleArchiveResponse {
  success: boolean;
  grade: string;
  untilDate: string;
  dayCount?: number;
  totalPuzzles?: number;
  byDate?: Array<{ date: string; grade: string; puzzles: Puzzle[]; count: number }>;
  puzzles?: ArchivedPuzzleItem[];
  items?: ArchivedPuzzleItem[];
  page?: number;
  hasMore?: boolean;
  message?: string;
}

export interface PuzzleGradesResponse {
  success: boolean;
  grades: Array<{ grade: string; hasCache: boolean }>;
  allGrades: string[];
}

export const PUZZLE_DAILY_COUNT = 20;
export const PUZZLE_HOME_PREVIEW_COUNT = 5;
