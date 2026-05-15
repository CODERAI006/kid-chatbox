/**
 * DB migration: quiz_scheduler_jobs + generated_quizzes tables
 */

const { pool } = require('../config/database');

const migrateQuizScheduler = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── quiz_scheduler_jobs ──────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_scheduler_jobs (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_name             VARCHAR(200) NOT NULL,
        frequency_type       VARCHAR(10)  NOT NULL CHECK (frequency_type IN ('daily','weekly')),
        run_time             VARCHAR(5)   NOT NULL,          -- HH:mm UTC
        day_of_week          SMALLINT,                        -- 0=Sun … 6=Sat, nullable for daily
        topics               JSONB        NOT NULL DEFAULT '[]',
        question_count       SMALLINT     NOT NULL DEFAULT 10,
        difficulty           VARCHAR(10)  NOT NULL DEFAULT 'Mixed'
                               CHECK (difficulty IN ('Easy','Medium','Hard','Mixed')),
        visibility_start_offset_mins INTEGER NOT NULL DEFAULT 0,  -- mins after run_time
        visibility_duration_mins     INTEGER,                      -- NULL = open-ended
        status               VARCHAR(10)  NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','inactive')),
        last_run_at          TIMESTAMP,
        created_by           UUID REFERENCES users(id),
        created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── generated_quizzes ────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS generated_quizzes (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scheduler_job_id     UUID REFERENCES quiz_scheduler_jobs(id) ON DELETE SET NULL,
        quiz_title           VARCHAR(300) NOT NULL,
        topics               JSONB        NOT NULL DEFAULT '[]',
        questions            JSONB        NOT NULL DEFAULT '[]',
        difficulty           VARCHAR(10)  NOT NULL DEFAULT 'Mixed',
        question_count       SMALLINT     NOT NULL DEFAULT 10,
        visibility_start_time TIMESTAMP  NOT NULL,
        visibility_end_time   TIMESTAMP,
        status               VARCHAR(12)  NOT NULL DEFAULT 'scheduled'
                               CHECK (status IN ('scheduled','live','expired')),
        generation_error     TEXT,
        created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── indexes ──────────────────────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduler_jobs_status
        ON quiz_scheduler_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_generated_quizzes_status
        ON generated_quizzes(status);
      CREATE INDEX IF NOT EXISTS idx_generated_quizzes_visibility
        ON generated_quizzes(visibility_start_time, visibility_end_time);
      CREATE INDEX IF NOT EXISTS idx_generated_quizzes_job_id
        ON generated_quizzes(scheduler_job_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Quiz scheduler tables created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Quiz scheduler migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migrateQuizScheduler()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateQuizScheduler };
