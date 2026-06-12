/**
 * Alters user FK constraints so creator/auditor references SET NULL on user delete.
 * Run once on production: node server/scripts/migrate-user-fk-set-null.js
 */

const { pool } = require('../config/database');

const FK_UPDATES = [
  { table: 'users', column: 'approved_by' },
  { table: 'topics', column: 'created_by' },
  { table: 'subtopics', column: 'created_by' },
  { table: 'study_material', column: 'created_by' },
  { table: 'quizzes', column: 'created_by' },
  { table: 'study_library_content', column: 'created_by' },
  { table: 'quiz_scheduler_jobs', column: 'created_by' },
  { table: 'user_roles', column: 'assigned_by' },
  { table: 'user_module_access', column: 'granted_by' },
  { table: 'user_plans', column: 'assigned_by' },
];

async function migrateUserFkSetNull() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const { table, column } of FK_UPDATES) {
      const { rows } = await client.query(
        `SELECT conname FROM pg_constraint
         WHERE conrelid = $1::regclass AND confrelid = 'users'::regclass
           AND conkey @> ARRAY(
             SELECT attnum FROM pg_attribute
             WHERE attrelid = $1::regclass AND attname = $2 AND NOT attisdropped
           )`,
        [table, column]
      );

      for (const { conname } of rows) {
        await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${conname}`);
      }

      await client.query(`
        ALTER TABLE ${table}
        ADD CONSTRAINT ${table}_${column}_fkey
        FOREIGN KEY (${column}) REFERENCES users(id) ON DELETE SET NULL
      `);
    }

    // scheduled_by cannot be NULL — cascade delete scheduled tests when user is removed
    const schedRows = await client.query(
      `SELECT conname FROM pg_constraint
       WHERE conrelid = 'scheduled_tests'::regclass
         AND confrelid = 'users'::regclass`
    );
    for (const { conname } of schedRows.rows) {
      await client.query(`ALTER TABLE scheduled_tests DROP CONSTRAINT IF EXISTS ${conname}`);
    }
    await client.query(`
      ALTER TABLE scheduled_tests
      ADD CONSTRAINT scheduled_tests_scheduled_by_fkey
      FOREIGN KEY (scheduled_by) REFERENCES users(id) ON DELETE CASCADE
    `);

    await client.query('COMMIT');
    console.log('✅ User FK constraints updated (ON DELETE SET NULL / CASCADE)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ migrate-user-fk-set-null failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateUserFkSetNull()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateUserFkSetNull };
