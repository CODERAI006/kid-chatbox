/**
 * Puzzle UI constants — category colors and labels.
 */

import type { PuzzleDifficulty } from '@/types/puzzle';

export const PUZZLE_CATEGORY_EMOJI: Record<string, string> = {
  Math: '🔢',
  Logic: '🧩',
  Language: '📝',
  Science: '🔬',
  GK: '🌍',
  Visual: '👁️',
  Coding: '💻',
  Memory: '🧠',
  'Critical Thinking': '💡',
  'Brain Teaser': '🎭',
};

export const DIFFICULTY_COLOR: Record<PuzzleDifficulty, string> = {
  Easy: 'green',
  Medium: 'orange',
  Hard: 'red',
};

export const DEFAULT_PUBLIC_GRADE = 'Class 5 / Grade 5';

export const PUZZLE_HUB_TABS = [
  { id: 'daily', label: 'Today\'s Puzzles', emoji: '⭐' },
  { id: 'practice', label: 'Practice', emoji: '🎯' },
] as const;
