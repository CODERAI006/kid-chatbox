/**
 * Puzzle v2 — default 10/day, source tracking, scrape settings.
 */

const { pool } = require('../config/database');

async function migratePuzzlesV2() {
  await pool.query(`
    ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'seed';
  `);

  await pool.query(`
    ALTER TABLE puzzle_global_config
      ADD COLUMN IF NOT EXISTS scrape_enabled BOOLEAN NOT NULL DEFAULT true;
  `);

  await pool.query(`
    UPDATE puzzle_settings SET daily_count = 10 WHERE daily_count = 5;
  `);

  await pool.query(`
    ALTER TABLE puzzle_settings ALTER COLUMN daily_count SET DEFAULT 10;
  `);

  console.log('✅ puzzle v2 migration ready');
}

module.exports = { migratePuzzlesV2 };

if (require.main === module) {
  migratePuzzlesV2()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
