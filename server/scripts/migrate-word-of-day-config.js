/**
 * Global Word of the Day configuration (themes, feature toggles).
 */

const { pool } = require('../config/database');

const DEFAULT_CONFIG = {
  weeklyThemesEnabled: true,
  showQuiz: true,
  showFunChallenge: true,
};

async function migrateWordOfDayConfig() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS word_of_day_config (
      id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      weekly_themes_enabled BOOLEAN NOT NULL DEFAULT true,
      show_quiz BOOLEAN NOT NULL DEFAULT true,
      show_fun_challenge BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  await pool.query(
    `INSERT INTO word_of_day_config (id, weekly_themes_enabled, show_quiz, show_fun_challenge)
     VALUES (1, $1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [DEFAULT_CONFIG.weeklyThemesEnabled, DEFAULT_CONFIG.showQuiz, DEFAULT_CONFIG.showFunChallenge],
  );

  // Allow 'expert' complexity for grades 11–12
  await pool.query(`
    ALTER TABLE word_of_day_settings DROP CONSTRAINT IF EXISTS word_of_day_settings_complexity_check;
  `);
  await pool.query(`
    ALTER TABLE word_of_day_settings ADD CONSTRAINT word_of_day_settings_complexity_check
      CHECK (complexity IN ('basic', 'intermediate', 'advanced', 'expert'));
  `);

  await pool.query(`
    UPDATE word_of_day_settings SET complexity = 'expert'
    WHERE grade IN ('Class 11 / Grade 11', 'Class 12 / Grade 12')
      AND complexity = 'advanced';
  `);

  console.log('✅ word_of_day_config table ready');
}

module.exports = { migrateWordOfDayConfig, DEFAULT_CONFIG };
