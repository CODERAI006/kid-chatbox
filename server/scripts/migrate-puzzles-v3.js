/**
 * Puzzle v3 — raise stored difficulties and time limits for smarter cohort.
 */

const { pool } = require('../config/database');
const { bumpStoredDifficulty, difficultyMeta } = require('../utils/puzzleDifficultyPolicy');

async function migratePuzzlesV3() {
  const { rows } = await pool.query(
    `SELECT id, difficulty, class_from, class_to, time_limit, points FROM puzzles`,
  );

  for (const row of rows) {
    const next = bumpStoredDifficulty(row.difficulty, row.class_from, row.class_to);
    const meta = difficultyMeta(next);
    await pool.query(
      `UPDATE puzzles SET difficulty = $1, time_limit = $2, points = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [next, Math.max(row.time_limit, meta.timeLimit), Math.max(row.points, meta.points), row.id],
    );
  }

  await pool.query(`DELETE FROM puzzle_daily_cache`);

  console.log(`✅ puzzle v3: upgraded ${rows.length} puzzles, cleared daily cache`);
}

module.exports = { migratePuzzlesV3 };

if (require.main === module) {
  migratePuzzlesV3()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
