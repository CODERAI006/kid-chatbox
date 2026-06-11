/**
 * PostgreSQL cache for Word of the Day — avoids repeat AI / dictionary calls.
 */

const { pool } = require('../config/database');
const { normalizeGrade } = require('./normalizeGrade');

function formatCacheDate(d) {
  const date = d instanceof Date ? d : new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Stable key per grade (Class 5 / Grade 5 and "Class 5" share the same bucket). */
function gradeCacheKey(grade) {
  const num = normalizeGrade(grade) || '5';
  return `wotd_v7_cbse_g${num}`;
}

function detailCacheKey(grade, word) {
  return `${gradeCacheKey(grade)}_detail_${String(word || '').trim().toLowerCase()}`;
}

function enrichCacheKey(grade, word, withDetail) {
  const w = String(word || '').trim().toLowerCase();
  return `${gradeCacheKey(grade)}_enrich_${w}_${withDetail ? 'full' : 'base'}`;
}

async function readCache(key, cacheDate) {
  try {
    const r = await pool.query(
      `SELECT payload FROM word_of_the_day_cache
       WHERE word_key = $1 AND cache_date = $2::date`,
      [key, cacheDate]
    );
    if (r.rows.length > 0) {
      console.log(`[wordOfDayCache] HIT ${key} @ ${cacheDate}`);
      return r.rows[0].payload;
    }
    console.log(`[wordOfDayCache] MISS ${key} @ ${cacheDate}`);
    return null;
  } catch (err) {
    console.error(`[wordOfDayCache] read failed (${key}):`, err.message);
    return null;
  }
}

async function writeCache(key, cacheDate, payload) {
  try {
    await pool.query(
      `INSERT INTO word_of_the_day_cache (word_key, cache_date, payload)
       VALUES ($1, $2::date, $3::jsonb)
       ON CONFLICT (word_key, cache_date) DO UPDATE
       SET payload = EXCLUDED.payload, updated_at = CURRENT_TIMESTAMP`,
      [key, cacheDate, JSON.stringify(payload)]
    );
    console.log(`[wordOfDayCache] SAVED ${key} @ ${cacheDate}`);
  } catch (err) {
    console.error(`[wordOfDayCache] write failed (${key}):`, err.message);
  }
}

module.exports = {
  formatCacheDate,
  gradeCacheKey,
  detailCacheKey,
  enrichCacheKey,
  readCache,
  writeCache,
};
