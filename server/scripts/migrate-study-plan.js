/**
 * DB migration: study_plans for exam prep schedules
 */

const { pool } = require('../config/database');

const migrateStudyPlan = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS study_plans (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        exam_name         VARCHAR(300) NOT NULL,
        exam_date         DATE NOT NULL,
        hours_per_day     NUMERIC(4,1) NOT NULL DEFAULT 1,
        schedule          JSONB NOT NULL DEFAULT '[]',
        status            VARCHAR(12) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','completed','cancelled')),
        created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_study_plans_user_status
        ON study_plans(user_id, status);
    `);

    await client.query('COMMIT');
    console.log('✅ Study plan tables created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Study plan migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migrateStudyPlan()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateStudyPlan };
