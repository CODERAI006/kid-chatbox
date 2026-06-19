/**
 * Nightly batch job run log — Word of Day, Expressions, Facts & Fun, News.
 */

const { pool } = require('../config/database');

async function migrateDailyContentBatch() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_content_batch_runs (
      id SERIAL PRIMARY KEY,
      target_date DATE NOT NULL,
      trigger_type VARCHAR(32) NOT NULL DEFAULT 'cron',
      status VARCHAR(32) NOT NULL DEFAULT 'running',
      started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      finished_at TIMESTAMPTZ,
      stats_json JSONB,
      error_message TEXT
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_daily_content_batch_runs_target_date
      ON daily_content_batch_runs (target_date DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_daily_content_batch_runs_status
      ON daily_content_batch_runs (status, started_at DESC);
  `);

  console.log('✅ daily_content_batch_runs table ready');
}

module.exports = { migrateDailyContentBatch };
