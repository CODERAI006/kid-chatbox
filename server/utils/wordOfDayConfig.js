/**
 * Global Word of the Day feature configuration.
 */

const { pool } = require('../config/database');
const { DEFAULT_CONFIG } = require('../scripts/migrate-word-of-day-config');

async function getConfig() {
  try {
    const r = await pool.query(
      `SELECT weekly_themes_enabled, show_quiz, show_fun_challenge, updated_at
       FROM word_of_day_config WHERE id = 1`,
    );
    if (r.rows.length > 0) {
      const row = r.rows[0];
      return {
        weeklyThemesEnabled: row.weekly_themes_enabled,
        showQuiz: row.show_quiz,
        showFunChallenge: row.show_fun_challenge,
        updatedAt: row.updated_at,
      };
    }
  } catch (err) {
    console.warn('[wordOfDayConfig] read failed:', err.message);
  }
  return { ...DEFAULT_CONFIG, updatedAt: null };
}

async function updateConfig(patch, userId) {
  const current = await getConfig();
  const next = {
    weeklyThemesEnabled: patch.weeklyThemesEnabled ?? current.weeklyThemesEnabled,
    showQuiz: patch.showQuiz ?? current.showQuiz,
    showFunChallenge: patch.showFunChallenge ?? current.showFunChallenge,
  };

  await pool.query(
    `INSERT INTO word_of_day_config (id, weekly_themes_enabled, show_quiz, show_fun_challenge, updated_by, updated_at)
     VALUES (1, $1, $2, $3, $4, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO UPDATE SET
       weekly_themes_enabled = EXCLUDED.weekly_themes_enabled,
       show_quiz = EXCLUDED.show_quiz,
       show_fun_challenge = EXCLUDED.show_fun_challenge,
       updated_by = EXCLUDED.updated_by,
       updated_at = CURRENT_TIMESTAMP`,
    [next.weeklyThemesEnabled, next.showQuiz, next.showFunChallenge, userId || null],
  );
  return getConfig();
}

module.exports = { getConfig, updateConfig };
