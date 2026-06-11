/**
 * Daily PostgreSQL cache for education news (scrape + AI once per day per category).
 */

const { pool } = require('../config/database');

function formatCacheDate(d) {
  const date = d instanceof Date ? d : new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
