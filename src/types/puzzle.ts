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
