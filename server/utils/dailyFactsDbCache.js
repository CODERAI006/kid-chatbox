/** PostgreSQL cache for Facts & Fun — one AI call saved per grade per day. */

const { pool } = require('../config/database');
const { normalizeGrade } = require('./normalizeGrade');

function formatCacheDate(d) {
  const date = d instanceof Date ? d : new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function gradeCacheKey(grade) {
  const num = normalizeGrade(grade) || '5';
  return `facts_fun_g${num}`;
}

function detailCacheKey(grade, factId) {
  const num = normalizeGrade(grade) || '5';
  const id = String(factId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `facts_fun_g${num}_detail_${id}`;
}

async function readCache(gradeKey, cacheDate) {
  try {
    const r = await pool.query(
      `SELECT payload FROM daily_facts_cache
       WHERE grade_key = $1 AND cache_date = $2::date`,
      [gradeKey, cacheDate]
    );
    if (r.rows.length > 0) {
      console.log(`[dailyFactsCache] HIT ${gradeKey} @ ${cacheDate}`);
      return r.rows[0].payload;
    }
    return null;
  } catch (err) {
    console.error(`[dailyFactsCache] read failed:`, err.message);
    return null;
  }
}

async function writeCache(gradeKey, cacheDate, payload) {
  try {
    await pool.query(
      `INSERT INTO daily_facts_cache (grade_key, cache_date, payload)
       VALUES ($1, $2::date, $3::jsonb)
       ON CONFLICT (grade_key, cache_date) DO UPDATE
       SET payload = EXCLUDED.payload, updated_at = CURRENT_TIMESTAMP`,
      [gradeKey, cacheDate, JSON.stringify(payload)]
    );
    console.log(`[dailyFactsCache] SAVED ${gradeKey} @ ${cacheDate}`);
  } catch (err) {
    console.error(`[dailyFactsCache] write failed:`, err.message);
  }
}

async function listCachedDates(gradeKey, limit = 30) {
  try {
    const r = await pool.query(
      `SELECT cache_date::text AS date FROM daily_facts_cache
       WHERE grade_key = $1
       ORDER BY cache_date DESC
       LIMIT $2`,
      [gradeKey, limit]
    );
    return r.rows.map((row) => row.date);
  } catch (err) {
    console.error('[dailyFactsCache] list dates failed:', err.message);
    return [];
  }
}

module.exports = {
  formatCacheDate,
  gradeCacheKey,
  detailCacheKey,
  readCache,
  writeCache,
  listCachedDates,
};
