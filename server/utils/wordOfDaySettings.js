/**
 * Word of the Day settings — per-grade complexity lookup and admin updates.
 */

const { pool } = require('../config/database');
const { DEFAULT_COMPLEXITY } = require('../scripts/migrate-word-of-day-settings');

const VALID_COMPLEXITIES = ['basic', 'intermediate', 'advanced', 'expert'];

function defaultComplexityForGrade(grade) {
  return DEFAULT_COMPLEXITY[grade] || 'basic';
}

async function getComplexityForGrade(grade) {
  const key = String(grade || '').trim();
  if (!key) return 'basic';

  try {
    const r = await pool.query(
      `SELECT complexity, enabled FROM word_of_day_settings WHERE grade = $1`,
      [key]
    );
    if (r.rows.length > 0) {
      const row = r.rows[0];
      if (!row.enabled) return null;
      return row.complexity;
    }
  } catch (err) {
    console.warn('[wordOfDaySettings] lookup failed:', err.message);
  }
  return defaultComplexityForGrade(key);
}

async function getAllSettings() {
  const r = await pool.query(
    `SELECT grade, complexity, enabled, updated_at
     FROM word_of_day_settings
     ORDER BY grade`
  );
  if (r.rows.length > 0) {
    return r.rows.map((row) => ({
      grade: row.grade,
      complexity: row.complexity,
      enabled: row.enabled,
      updatedAt: row.updated_at,
    }));
  }
  return Object.entries(DEFAULT_COMPLEXITY).map(([grade, complexity]) => ({
    grade,
    complexity,
    enabled: true,
    updatedAt: null,
  }));
}

async function updateSettings(updates, userId) {
  const results = [];
  for (const item of updates) {
    const grade = String(item.grade || '').trim();
    const complexity = VALID_COMPLEXITIES.includes(item.complexity)
      ? item.complexity
      : defaultComplexityForGrade(grade);
    const enabled = item.enabled !== false;

    await pool.query(
      `INSERT INTO word_of_day_settings (grade, complexity, enabled, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (grade) DO UPDATE
       SET complexity = EXCLUDED.complexity,
           enabled = EXCLUDED.enabled,
           updated_by = EXCLUDED.updated_by,
           updated_at = CURRENT_TIMESTAMP`,
      [grade, complexity, enabled, userId || null]
    );
    results.push({ grade, complexity, enabled });
  }
  return results;
}

module.exports = {
  VALID_COMPLEXITIES,
  defaultComplexityForGrade,
  getComplexityForGrade,
  getAllSettings,
  updateSettings,
};
