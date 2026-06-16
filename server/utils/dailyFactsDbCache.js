/** PostgreSQL cache for Facts & Fun — per-class edition per calendar day. */

const { pool } = require('../config/database');

function formatCacheDate(d) {
  const date = d instanceof Date ? d : new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Per-grade cache key — each class gets age-appropriate facts. */
function gradeCacheKey(grade) {
  const slug = String(grade || 'common')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
  return `facts_fun_v1_${slug || 'common'}`;
}

function detailCacheKey(grade, factId) {
  const id = String(factId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${gradeCacheKey(grade)}_detail_${id}`;
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

function archiveFactsWhere(gradeKey, maxDate, category) {
  const params = [gradeKey, maxDate];
  let categoryClause = '';
  if (category) {
    categoryClause = `AND (elem->>'category' = $3 OR elem->>'subject' = $3)`;
    params.push(category);
  }
  const base = `
    FROM daily_facts_cache d
    CROSS JOIN LATERAL jsonb_array_elements(d.payload->'facts') WITH ORDINALITY AS t(elem, ord)
    WHERE d.grade_key = $1
      AND d.cache_date <= $2::date
      AND jsonb_typeof(d.payload->'facts') = 'array'
      ${categoryClause}`;
  return { base, params };
}

async function countArchivedFacts(gradeKey, maxDate, category) {
  try {
    const { base, params } = archiveFactsWhere(gradeKey, maxDate, category);
    const r = await pool.query(`SELECT COUNT(*)::int AS total ${base}`, params);
    return r.rows[0]?.total ?? 0;
  } catch (err) {
    console.error('[dailyFactsCache] count archive failed:', err.message);
    return 0;
  }
}

async function listArchivedFacts(gradeKey, maxDate, { page = 1, limit = 20, category, subject } = {}) {
  const filter = category || subject;
  try {
    const safeLimit = Math.min(50, Math.max(1, limit));
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;
    const { base, params } = archiveFactsWhere(gradeKey, maxDate, filter);
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const r = await pool.query(
      `SELECT d.cache_date::text AS edition_date, t.elem AS fact_json
       ${base}
       ORDER BY d.cache_date DESC, t.ord ASC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, safeLimit, offset],
    );
    return r.rows.map((row) => ({
      editionDate: row.edition_date,
      fact: row.fact_json,
    }));
  } catch (err) {
    console.error('[dailyFactsCache] list archive failed:', err.message);
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
  countArchivedFacts,
  listArchivedFacts,
};
