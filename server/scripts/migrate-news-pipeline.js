/**
 * Pipeline tables: sources, raw articles, learning content, run history.
 * Usage: node server/scripts/migrate-news-pipeline.js
 */

require('dotenv').config();
const { pool } = require('../config/database');

async function migrateNewsPipeline() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS news_sources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        url TEXT NOT NULL,
        category VARCHAR(64) NOT NULL,
        source_type VARCHAR(32) NOT NULL DEFAULT 'rss',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (url, category)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS news_articles (
        id SERIAL PRIMARY KEY,
        external_id VARCHAR(120) NOT NULL,
        source_id INTEGER REFERENCES news_sources(id) ON DELETE SET NULL,
        category VARCHAR(64) NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        url TEXT NOT NULL UNIQUE,
        url_to_image TEXT,
        author VARCHAR(200),
        published_at TIMESTAMPTZ,
        scraped_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS news_learning_content (
        id SERIAL PRIMARY KEY,
        article_id INTEGER NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
        summary TEXT,
        funfacts_json JSONB DEFAULT '[]',
        quiz_json JSONB DEFAULT '[]',
        difficulty_level VARCHAR(32),
        age_group VARCHAR(32),
        learning_objectives JSONB DEFAULT '[]',
        formatted_json JSONB,
        processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (article_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS news_pipeline_runs (
        id SERIAL PRIMARY KEY,
        started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMPTZ,
        status VARCHAR(32) NOT NULL DEFAULT 'running',
        trigger_type VARCHAR(32) NOT NULL DEFAULT 'cron',
        stats_json JSONB,
        error_message TEXT
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_news_pipeline_runs_started ON news_pipeline_runs(started_at DESC)
    `);

    console.log('news pipeline tables ready');
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateNewsPipeline()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { migrateNewsPipeline };
