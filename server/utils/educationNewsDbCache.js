/**
 * Daily PostgreSQL cache for education news (scrape + AI once per day per category).
 */

const { pool } = require('../config/database');
const { DEFAULT_TIMEZONE, formatDateInTimezone, todayYmdInTimezone } = require('./timezoneUtils');

/** Calendar day in IST — matches Word of Day / Facts batch keys. */
function formatCacheDate(d) {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  if (d instanceof Date) return formatDateInTimezone(d, DEFAULT_TIMEZONE);
  return todayYmdInTimezone(DEFAULT_TIMEZONE);
}

function categoryCacheKey(categoryId) {
  return `edu_news_v1_${String(categoryId || 'science').trim()}`;
}

async function readCache(categoryId, cacheDate) {
  const key = categoryCacheKey(categoryId);
  try {
    const r = await pool.query(
      `SELECT payload, updated_at FROM education_news_cache
       WHERE cache_key = $1 AND cache_date = $2::date`,
      [key, cacheDate]
    );
    if (r.rows.length > 0) {
      console.log(`[educationNewsCache] HIT ${key} @ ${cacheDate}`);
      return { payload: r.rows[0].payload, updatedAt: r.rows[0].updated_at };
    }
    console.log(`[educationNewsCache] MISS ${key} @ ${cacheDate}`);
    return null;
  } catch (err) {
    console.error(`[educationNewsCache] read failed (${key}):`, err.message);
    return null;
  }
}

async function writeCache(categoryId, cacheDate, payload) {
  const key = categoryCacheKey(categoryId);
  try {
    await pool.query(
      `INSERT INTO education_news_cache (cache_key, cache_date, payload)
       VALUES ($1, $2::date, $3::jsonb)
       ON CONFLICT (cache_key, cache_date)
       DO UPDATE SET payload = EXCLUDED.payload, updated_at = CURRENT_TIMESTAMP`,
      [key, cacheDate, JSON.stringify(payload)]
    );
    console.log(`[educationNewsCache] SAVED ${key} @ ${cacheDate}`);
  } catch (err) {
    console.error(`[educationNewsCache] write failed (${key}):`, err.message);
  }
}

async function findArticle(categoryId, articleId, cacheDate) {
  const hit = await readCache(categoryId, cacheDate);
  if (!hit?.payload?.articles) return null;
  return hit.payload.articles.find((a) => a.id === articleId) || null;
}

module.exports = {
  formatCacheDate,
  categoryCacheKey,
  readCache,
  writeCache,
  findArticle,
};
