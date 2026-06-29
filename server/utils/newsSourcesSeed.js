/**
 * Default RSS / feed sources per education category — seeded into news_sources.
 */

const { pool } = require('../config/database');
const { buildDefaultSources } = require('./newsFeedSources');

const DEFAULT_SOURCES = buildDefaultSources();

async function seedNewsSources() {
  let inserted = 0;

  await pool.query(
    `UPDATE news_sources SET is_active = FALSE
     WHERE category = 'general_knowledge'
       AND url IN ('https://techcrunch.com/feed/', 'https://github.blog/feed/')`,
  );

  for (const src of DEFAULT_SOURCES) {
    const r = await pool.query(
      `INSERT INTO news_sources (name, url, category, source_type, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (url, category) DO UPDATE SET
         name = EXCLUDED.name,
         is_active = TRUE
       RETURNING id`,
      [src.name, src.url, src.category, src.source_type],
    );
    if (r.rowCount) inserted += 1;
  }

  if (inserted) console.log(`[newsSources] seeded/updated ${inserted} sources`);
  return inserted;
}

async function countSources() {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_active)::int AS active
     FROM news_sources`,
  );
  return { total: r.rows[0]?.total || 0, active: r.rows[0]?.active || 0 };
}

module.exports = { DEFAULT_SOURCES, seedNewsSources, countSources };
