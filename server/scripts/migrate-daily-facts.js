/**
 * Daily Facts & Fun cache table.
 * Usage: node server/scripts/migrate-daily-facts.js
 */

require('dotenv').config();
const { pool } = require('../config/database');

async function migrateDailyFacts() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_facts_cache (
      grade_key VARCHAR(64) NOT NULL,
      cache_date DATE NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (grade_key, cache_date)
    );
    CREATE INDEX IF NOT EXISTS idx_daily_facts_grade_date
      ON daily_facts_cache (grade_key, cache_date DESC);
  `);
  console.log('✅ daily_facts_cache table ready');
}

module.exports = { migrateDailyFacts };

if (require.main === module) {
  migrateDailyFacts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
