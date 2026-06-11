/**
 * Per-user saved competitive exam topics (by track).
 */

const { pool } = require('../config/database');

async function migrateCompetitiveTopics() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_competitive_topics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        track_id VARCHAR(64) NOT NULL,
        topics TEXT[] NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, track_id)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_competitive_topics_user
      ON user_competitive_topics (user_id)
    `);
    await client.query('COMMIT');
    console.log('user_competitive_topics migration OK');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateCompetitiveTopics()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateCompetitiveTopics };
