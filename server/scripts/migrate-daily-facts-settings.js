/**
 * Facts & Fun admin settings — per-grade complexity and enablement.
 */

const { pool } = require('../config/database');
const { DEFAULT_COMPLEXITY } = require('./migrate-word-of-day-settings');

const COMPLEXITY_CHECK = `('basic', 'intermediate', 'advanced', 'expert')`;

async function migrateDailyFactsSettings() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_facts_settings (
      grade VARCHAR(64) PRIMARY KEY,
      complexity VARCHAR(20) NOT NULL DEFAULT 'basic',
      enabled BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  await pool.query(`
    ALTER TABLE daily_facts_settings DROP CONSTRAINT IF EXISTS daily_facts_settings_complexity_check;
  `);
  await pool.query(`
    ALTER TABLE daily_facts_settings ADD CONSTRAINT daily_facts_settings_complexity_check
      CHECK (complexity IN ${COMPLEXITY_CHECK});
  `);

  for (const [grade, complexity] of Object.entries(DEFAULT_COMPLEXITY)) {
    await pool.query(
      `INSERT INTO daily_facts_settings (grade, complexity)
       VALUES ($1, $2)
       ON CONFLICT (grade) DO NOTHING`,
      [grade, complexity],
    );
  }

  console.log('✅ daily_facts_settings table ready');
}

module.exports = { migrateDailyFactsSettings };

if (require.main === module) {
  migrateDailyFactsSettings()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
