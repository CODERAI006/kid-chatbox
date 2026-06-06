/**
 * Study Library Content v2: grade targeting, general flag, image/doc types
 */

const { pool } = require('../config/database');

const migrateStudyLibraryContentV2 = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE study_library_content
      ADD COLUMN IF NOT EXISTS grade VARCHAR(100)
    `);

    await client.query(`
      ALTER TABLE study_library_content
      ADD COLUMN IF NOT EXISTS is_general BOOLEAN DEFAULT false
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_study_library_content_grade
      ON study_library_content(grade)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_study_library_content_is_general
      ON study_library_content(is_general)
    `);

    await client.query(`
      ALTER TABLE study_library_content
      DROP CONSTRAINT IF EXISTS study_library_content_content_type_check
    `);

    await client.query(`
      ALTER TABLE study_library_content
      ADD CONSTRAINT study_library_content_content_type_check
      CHECK (content_type IN ('ppt', 'pdf', 'text', 'image', 'doc'))
    `);

    await client.query('COMMIT');
    console.log('✅ Study Library Content v2 migration completed');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Study Library Content v2 migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  migrateStudyLibraryContentV2()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateStudyLibraryContentV2 };
