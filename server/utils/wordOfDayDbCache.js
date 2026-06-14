/**
 * PostgreSQL cache for Word of the Day — avoids repeat AI / dictionary calls.
 */

const { pool } = require('../config/database');

function formatCacheDate(d) {
  const date = d instanceof Date ? d : new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Per-grade cache key — each class gets age-appropriate vocabulary. */
function gradeCacheKey(grade) {
  const slug = String(grade || 'common')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
  return `wotd_v9_${slug || 'common'}`;
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

async function listCachedDates(cacheKey, limit = 30) {
  try {
    const r = await pool.query(
      `SELECT cache_date::text AS date FROM word_of_the_day_cache
       WHERE word_key = $1
       ORDER BY cache_date DESC
       LIMIT $2`,
      [cacheKey, limit],
    );
    return r.rows.map((row) => row.date);
  } catch (err) {
    console.error('[wordOfDayCache] list dates failed:', err.message);
    return [];
  }
}

function archivePhrasesWhere(cacheKey, maxDate, context) {
  const params = [cacheKey, maxDate];
  let contextClause = '';
  if (context === 'school' || context === 'daily') {
    contextClause = `AND elem->>'context' = $3`;
    params.push(context);
  }
  const base = `
    FROM word_of_the_day_cache d
    CROSS JOIN LATERAL jsonb_array_elements(d.payload->'phrases') WITH ORDINALITY AS t(elem, ord)
    WHERE d.word_key = $1
      AND d.cache_date <= $2::date
      AND jsonb_typeof(d.payload->'phrases') = 'array'
      ${contextClause}`;
  return { base, params };
}

async function countArchivedPhrases(cacheKey, maxDate, context) {
  try {
    const { base, params } = archivePhrasesWhere(cacheKey, maxDate, context);
    const r = await pool.query(`SELECT COUNT(*)::int AS total ${base}`, params);
    return r.rows[0]?.total ?? 0;
  } catch (err) {
    console.error('[wordOfDayCache] count phrases archive failed:', err.message);
    return 0;
  }
}

async function listArchivedPhrases(cacheKey, maxDate, { page = 1, limit = 20, context } = {}) {
  try {
    const safeLimit = Math.min(50, Math.max(1, limit));
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;
    const { base, params } = archivePhrasesWhere(cacheKey, maxDate, context);
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const r = await pool.query(
      `SELECT d.cache_date::text AS edition_date, t.elem AS phrase_json, t.ord AS phrase_ord
       ${base}
       ORDER BY d.cache_date DESC, t.ord ASC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, safeLimit, offset],
    );
    return r.rows.map((row) => ({
      editionDate: row.edition_date,
      phraseOrd: row.phrase_ord,
      phrase: row.phrase_json,
    }));
  } catch (err) {
    console.error('[wordOfDayCache] list phrases archive failed:', err.message);
    return [];
  }
}

module.exports = {
  formatCacheDate,
  gradeCacheKey,
  detailCacheKey,
  enrichCacheKey,
  readCache,
  writeCache,
  listCachedDates,
  countArchivedPhrases,
  listArchivedPhrases,
};
