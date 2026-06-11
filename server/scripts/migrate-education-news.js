/**
 * Migration: education_news_cache — daily scraped + AI-formatted articles.
 * Usage: node server/scripts/migrate-education-news.js
 */

require('dotenv').config();
const { pool } = require('../config/database');

async function migrateEducationNews() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS education_news_cache (
        cache_key VARCHAR(120) NOT NULL,
        cache_date DATE NOT NULL,
        payload JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (cache_key, cache_date)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_education_news_cache_date
      ON education_news_cache(cache_date)
    `);
    console.log('education_news_cache table ready');
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateEducationNews()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { migrateEducationNews };
