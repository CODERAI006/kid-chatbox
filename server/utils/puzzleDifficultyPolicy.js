/**
 * Grade-aware difficulty — smarter students, tougher puzzles by class.
 */

const DIFFICULTY_RANK = { Easy: 1, Medium: 2, Hard: 3 };
const RANK_TO_LABEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

const DIFFICULTY_META = {
  Easy: { timeLimit: 35, points: 8 },
  Medium: { timeLimit: 75, points: 12 },
  Hard: { timeLimit: 150, points: 18 },
};

/** Minimum difficulty rank required for daily selection by class. */
function minRankForClass(classNum) {
  if (classNum <= 2) return 2;
  if (classNum <= 5) return 2;
  if (classNum <= 8) return 2;
  if (classNum <= 10) return 3;
  return 3;
}

/** Target difficulty label shown to the student (never below grade floor). */
function targetDifficultyForClass(classNum) {
  const rank = minRankForClass(classNum);
  return RANK_TO_LABEL[rank] || 'Medium';
}

function difficultyRank(label) {
  return DIFFICULTY_RANK[label] || 1;
}

function difficultyMeta(label) {
  return DIFFICULTY_META[label] || DIFFICULTY_META.Medium;
}

/** Elevate puzzle difficulty/time/points to match grade expectations. */
function elevatePuzzleForGrade(puzzle, classNum) {
  const floor = minRankForClass(classNum);
  const current = difficultyRank(puzzle.difficulty);
  const finalRank = Math.max(current, floor);
  const difficulty = RANK_TO_LABEL[finalRank];
  const meta = difficultyMeta(difficulty);
  return {
    ...puzzle,
    difficulty,
    timeLimit: Math.max(puzzle.timeLimit || 0, meta.timeLimit),
    points: Math.max(puzzle.points || 0, meta.points),
  };
}

/** Filter and sort pool — hardest suitable puzzles first. */
function applyGradeDifficultyPolicy(puzzles, classNum, needed = 10) {
  const minRank = minRankForClass(classNum);
  const scored = puzzles.map((p) => ({
    ...p,
    _rank: difficultyRank(p.difficulty),
  }));

  const atOrAbove = scored.filter((p) => p._rank >= minRank);
  let pool = atOrAbove.length >= needed ? atOrAbove : scored;

  pool.sort((a, b) => {
    if (b._rank !== a._rank) return b._rank - a._rank;
    return String(a.id).localeCompare(String(b.id));
  });

  return pool.map(({ _rank, ...p }) => p);
}

/** Bump stored seed difficulty upward (one-time / sync helper). */
function bumpStoredDifficulty(current, classFrom, classTo) {
  const mid = Math.round((classFrom + classTo) / 2);
  let rank = difficultyRank(current);
  if (mid >= 4 && rank < 2) rank = 2;
  if (mid >= 7 && rank < 2) rank = 2;
  if (mid >= 9 && rank < 3) rank = 3;
  if (classTo >= 10 && rank < 3) rank = 3;
  return RANK_TO_LABEL[rank];
}

module.exports = {
  DIFFICULTY_META,
  DIFFICULTY_RANK,
  minRankForClass,
  targetDifficultyForClass,
  difficultyRank,
  difficultyMeta,
  elevatePuzzleForGrade,
  applyGradeDifficultyPolicy,
  bumpStoredDifficulty,
};
