/**
 * Stores the image generation prompt used for quiz question illustrations.
 */

const { pool } = require('../config/database');

async function migrateQuizImagePrompt() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE quiz_questions
      ADD COLUMN IF NOT EXISTS question_image_prompt TEXT
    `);
    await client.query('COMMIT');
    console.log('quiz_questions.question_image_prompt migration OK');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateQuizImagePrompt()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateQuizImagePrompt };
