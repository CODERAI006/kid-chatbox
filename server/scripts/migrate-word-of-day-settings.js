/**
 * Word of the Day admin settings — per-grade complexity configuration.
 */

const { pool } = require('../config/database');

const DEFAULT_COMPLEXITY = {
  'Pre-K / Nursery': 'basic',
  'Class 1 / Grade 1': 'basic',
  'Class 2 / Grade 2': 'basic',
  'Class 3 / Grade 3': 'basic',
  'Class 4 / Grade 4': 'basic',
  'Class 5 / Grade 5': 'intermediate',
  'Class 6 / Grade 6': 'intermediate',
  'Class 7 / Grade 7': 'intermediate',
  'Class 8 / Grade 8': 'intermediate',
  'Class 9 / Grade 9': 'advanced',
  'Class 10 / Grade 10': 'advanced',
  'Class 11 / Grade 11': 'expert',
  'Class 12 / Grade 12': 'expert',
};

const COMPLEXITY_CHECK = `('basic', 'intermediate', 'advanced', 'expert')`;

async function migrateWordOfDaySettings() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS word_of_day_settings (
      grade VARCHAR(64) PRIMARY KEY,
      complexity VARCHAR(20) NOT NULL DEFAULT 'basic',
      enabled BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Table may already exist with an older CHECK that omits 'expert'.
  await pool.query(`
    ALTER TABLE word_of_day_settings DROP CONSTRAINT IF EXISTS word_of_day_settings_complexity_check;
  `);
  await pool.query(`
    ALTER TABLE word_of_day_settings ADD CONSTRAINT word_of_day_settings_complexity_check
      CHECK (complexity IN ${COMPLEXITY_CHECK});
  `);

  for (const [grade, complexity] of Object.entries(DEFAULT_COMPLEXITY)) {
    await pool.query(
      `INSERT INTO word_of_day_settings (grade, complexity)
       VALUES ($1, $2)
       ON CONFLICT (grade) DO NOTHING`,
      [grade, complexity]
    );
  }

  console.log('✅ word_of_day_settings table ready');
}

module.exports = { migrateWordOfDaySettings, DEFAULT_COMPLEXITY };
