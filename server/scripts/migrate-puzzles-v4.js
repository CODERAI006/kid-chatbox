/**
 * Puzzle v4 — 20 puzzles/day minimum, expanded content categories.
 */

const { pool } = require('../config/database');

async function migratePuzzlesV4() {
  await pool.query(`
    UPDATE puzzle_settings SET daily_count = 20 WHERE daily_count < 20;
  `);
  await pool.query(`
    ALTER TABLE puzzle_settings ALTER COLUMN daily_count SET DEFAULT 20;
  `);
  await pool.query(`DELETE FROM puzzle_daily_cache`);
  console.log('✅ puzzle v4: daily count set to 20 min, cache cleared');
}

module.exports = { migratePuzzlesV4 };

if (require.main === module) {
  migratePuzzlesV4()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
