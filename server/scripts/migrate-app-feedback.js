/**
 * App learning feedback table.
 * Usage: node server/scripts/migrate-app-feedback.js
 */

require('dotenv').config();
const { pool } = require('../config/database');

async function migrateAppFeedback() {
  const columnCheck = await pool.query(`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_feedback'
      AND column_name = 'user_id'
  `);

  if (columnCheck.rows.length > 0 && columnCheck.rows[0].data_type !== 'uuid') {
    await pool.query('DROP TABLE IF EXISTS app_feedback CASCADE');
    console.log('⚠️  Dropped app_feedback with incompatible user_id type (expected UUID)');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_feedback (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      feature_wishes JSONB NOT NULL DEFAULT '[]',
      message TEXT,
      source VARCHAR(32) NOT NULL DEFAULT 'global',
      quiz_subject VARCHAR(128),
      quiz_score INTEGER,
      quiz_total INTEGER,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_app_feedback_user_created
      ON app_feedback (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_app_feedback_source
      ON app_feedback (source);
  `);
  console.log('✅ app_feedback table ready');
}

module.exports = { migrateAppFeedback };

if (require.main === module) {
  migrateAppFeedback()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
