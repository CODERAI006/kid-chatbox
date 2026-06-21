/**
 * Puzzle v5 — generation_prompt, skill_area for AI/scrape transparency.
 */

const { pool } = require('../config/database');

async function migratePuzzlesV5() {
  await pool.query(`
    ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS generation_prompt TEXT;
  `);
  await pool.query(`
    ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS skill_area VARCHAR(128);
  `);
  await pool.query(`
    ALTER TABLE puzzle_global_config
      ADD COLUMN IF NOT EXISTS ai_generation_enabled BOOLEAN NOT NULL DEFAULT true;
  `);
  await pool.query(`
    ALTER TABLE puzzle_global_config
      ADD COLUMN IF NOT EXISTS auto_scrape_enabled BOOLEAN NOT NULL DEFAULT true;
  `);
  console.log('✅ puzzle v5: prompt & skill_area columns ready');
}

module.exports = { migratePuzzlesV5 };

if (require.main === module) {
  migratePuzzlesV5()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
