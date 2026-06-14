/**
 * Default RSS / feed sources per education category (~70% feed-driven).
 */

const { pool } = require('../config/database');

const DEFAULT_SOURCES = [
  { name: 'NASA Breaking News', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', category: 'science', source_type: 'rss' },
  { name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml', category: 'science', source_type: 'rss' },
  { name: 'BBC Science', url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', category: 'science', source_type: 'rss' },
  { name: 'History.com', url: 'https://www.history.com/.rss/full', category: 'history', source_type: 'rss' },
  { name: 'National Geographic', url: 'https://www.nationalgeographic.com/pages/topic/latest-stories/rss', category: 'geography', source_type: 'rss' },
  { name: 'ISRO Updates', url: 'https://www.isro.gov.in/rss/isro.rss', category: 'current_affairs', source_type: 'rss' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'technology', source_type: 'rss' },
  { name: 'GitHub Blog', url: 'https://github.blog/feed/', category: 'technology', source_type: 'rss' },
  { name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'technology', source_type: 'rss' },
  { name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml', category: 'sports', source_type: 'rss' },
  { name: 'Guardian Environment', url: 'https://www.theguardian.com/environment/rss', category: 'environment', source_type: 'rss' },
  { name: 'BBC Science & Environment', url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', category: 'environment', source_type: 'rss' },
  { name: 'Guardian Books', url: 'https://www.theguardian.com/books/rss', category: 'arts_culture', source_type: 'rss' },
  { name: 'BBC Arts', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', category: 'arts_culture', source_type: 'rss' },
];

async function seedNewsSources() {
  let inserted = 0;

  await pool.query(
    `UPDATE news_sources SET is_active = FALSE
     WHERE category = 'general_knowledge'
       AND url IN ('https://techcrunch.com/feed/', 'https://github.blog/feed/')`
  );

  for (const src of DEFAULT_SOURCES) {
    const r = await pool.query(
      `INSERT INTO news_sources (name, url, category, source_type, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (url, category) DO NOTHING
       RETURNING id`,
      [src.name, src.url, src.category, src.source_type]
    );
    if (r.rowCount) inserted += 1;
  }
  if (inserted) console.log(`[newsSources] seeded ${inserted} sources`);
  return inserted;
}

async function countSources() {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_active)::int AS active
     FROM news_sources`
  );
  return { total: r.rows[0]?.total || 0, active: r.rows[0]?.active || 0 };
}

module.exports = { DEFAULT_SOURCES, seedNewsSources, countSources };
