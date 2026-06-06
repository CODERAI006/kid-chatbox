/**
 * Quiz scheduler v2: batches, topic/subtopic FKs, library links, IST default timezone
 */

const { pool } = require('../config/database');

const migrateQuizSchedulerV2 = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE quiz_scheduler_jobs
        ADD COLUMN IF NOT EXISTS sets_per_run SMALLINT NOT NULL DEFAULT 5,
        ADD COLUMN IF NOT EXISTS topic_ids UUID[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS subtopic_ids UUID[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
        ADD COLUMN IF NOT EXISTS last_batch_id UUID
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_generation_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scheduler_job_id UUID REFERENCES quiz_scheduler_jobs(id) ON DELETE SET NULL,
        batch_tag VARCHAR(120) NOT NULL,
        sets_requested SMALLINT NOT NULL,
        sets_completed SMALLINT NOT NULL DEFAULT 0,
        sets_failed SMALLINT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'running'
          CHECK (status IN ('running','completed','partial','failed')),
        started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        error_summary TEXT
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quiz_generation_batches_job
        ON quiz_generation_batches(scheduler_job_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_generation_batches_tag
        ON quiz_generation_batches(batch_tag);
    `);

    await client.query(`
      ALTER TABLE quiz_library
        ADD COLUMN IF NOT EXISTS linked_quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS generation_batch_id UUID REFERENCES quiz_generation_batches(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS scheduler_job_id UUID REFERENCES quiz_scheduler_jobs(id) ON DELETE SET NULL
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quiz_library_batch
        ON quiz_library(generation_batch_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_library_scheduler_job
        ON quiz_library(scheduler_job_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Quiz scheduler v2 migration completed');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Quiz scheduler v2 migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migrateQuizSchedulerV2()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateQuizSchedulerV2 };
