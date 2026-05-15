/**
 * Creates quiz_ai_generation_jobs for async server-side AI quiz generation
 * (avoids reverse-proxy timeouts while Ollama runs).
 */

const { pool } = require('../config/database');

async function migrateQuizAiJobs() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_ai_generation_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        error_message TEXT,
        quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL,
        request_payload JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quiz_ai_gen_jobs_user
        ON quiz_ai_generation_jobs(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quiz_ai_gen_jobs_status
        ON quiz_ai_generation_jobs(status)
    `);
    await client.query('COMMIT');
    console.log('quiz_ai_generation_jobs migration OK');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateQuizAiJobs()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateQuizAiJobs };
