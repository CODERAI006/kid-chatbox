/**
 * Puzzle admin settings helpers.
 */

const { pool } = require('../config/database');
const { DEFAULT_GRADES } = require('../data/puzzleMeta');

async function getGlobalConfig() {
  const r = await pool.query(`SELECT * FROM puzzle_global_config WHERE id = 1`);
  return r.rows[0] || { enabled: true, show_on_homepage: true, default_grade: 'Class 5 / Grade 5' };
}

async function updateGlobalConfig(patch, userId) {
  const fields = [];
  const vals = [];
  let i = 1;
  if (typeof patch.enabled === 'boolean') { fields.push(`enabled = $${i++}`); vals.push(patch.enabled); }
  if (typeof patch.showOnHomepage === 'boolean') { fields.push(`show_on_homepage = $${i++}`); vals.push(patch.showOnHomepage); }
  if (typeof patch.aiGenerationEnabled === 'boolean') { fields.push(`ai_generation_enabled = $${i++}`); vals.push(patch.aiGenerationEnabled); }
  if (typeof patch.autoScrapeEnabled === 'boolean') { fields.push(`auto_scrape_enabled = $${i++}`); vals.push(patch.autoScrapeEnabled); }
  if (patch.defaultGrade) { fields.push(`default_grade = $${i++}`); vals.push(patch.defaultGrade); }
  if (!fields.length) return getGlobalConfig();
  fields.push('updated_at = CURRENT_TIMESTAMP');
  await pool.query(`UPDATE puzzle_global_config SET ${fields.join(', ')} WHERE id = 1`, vals);
  return getGlobalConfig();
}

async function getAllSettings() {
  const r = await pool.query(`SELECT grade, enabled, daily_count FROM puzzle_settings ORDER BY grade`);
  if (r.rows.length) return r.rows;
  return DEFAULT_GRADES.map((grade) => ({ grade, enabled: true, daily_count: 20 }));
}

async function updateSettings(updates, userId) {
  for (const row of updates) {
    if (!row?.grade) continue;
    await pool.query(
      `INSERT INTO puzzle_settings (grade, enabled, daily_count, updated_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (grade) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         daily_count = EXCLUDED.daily_count,
         updated_by = EXCLUDED.updated_by,
         updated_at = CURRENT_TIMESTAMP`,
      [row.grade, row.enabled !== false, Math.min(30, Math.max(20, Number(row.dailyCount) || 20)), userId || null],
    );
  }
  return getAllSettings();
}

async function isGradeEnabled(grade) {
  const global = await getGlobalConfig();
  if (!global.enabled) return false;
  const r = await pool.query(`SELECT enabled FROM puzzle_settings WHERE grade = $1`, [grade]);
  return r.rows.length ? r.rows[0].enabled : true;
}

async function getDailyCount(grade) {
  const r = await pool.query(`SELECT daily_count FROM puzzle_settings WHERE grade = $1`, [grade]);
  return r.rows.length ? r.rows[0].daily_count : 20;
}

module.exports = {
  getGlobalConfig,
  updateGlobalConfig,
  getAllSettings,
  updateSettings,
  isGradeEnabled,
  getDailyCount,
};
