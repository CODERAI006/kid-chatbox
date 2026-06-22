/**
 * DB migration: full 32-section lesson JSON on study_sessions.
 */
const { pool } = require('../config/database');

async function migrateStudySessionsV2() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE study_sessions
      ADD COLUMN IF NOT EXISTS lesson_content JSONB
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_study_sessions_lesson_content
      ON study_sessions ((lesson_content IS NOT NULL))
    `);
    if (!process.env.KIDCHATBOX_MIGRATION_QUIET) {
      console.log('✅ study_sessions.lesson_content column ready');
    }
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateStudySessionsV2()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { migrateStudySessionsV2 };
