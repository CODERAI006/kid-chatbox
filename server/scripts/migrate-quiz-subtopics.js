/**
 * Adds subtopics TEXT[] to quizzes for library badges and search.
 */

const { pool } = require('../config/database');

async function migrateQuizSubtopics() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE quizzes
      ADD COLUMN IF NOT EXISTS subtopics TEXT[] NOT NULL DEFAULT '{}'
    `);
    await client.query(`
      UPDATE quizzes q
      SET subtopics = ARRAY[s.title]
      FROM subtopics s
      WHERE q.subtopic_id = s.id
        AND (q.subtopics IS NULL OR q.subtopics = '{}')
    `);
    await client.query(`
      UPDATE quizzes q
      SET subtopics = sub.arr
      FROM (
        SELECT j.quiz_id,
               ARRAY(
                 SELECT jsonb_array_elements_text(j.request_payload->'subtopics')
               ) AS arr
        FROM quiz_ai_generation_jobs j
        WHERE j.quiz_id IS NOT NULL
          AND jsonb_typeof(j.request_payload->'subtopics') = 'array'
      ) sub
      WHERE q.id = sub.quiz_id
        AND cardinality(sub.arr) > 0
        AND (q.subtopics IS NULL OR q.subtopics = '{}')
    `);
    await client.query('COMMIT');
    console.log('quizzes.subtopics migration OK');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateQuizSubtopics()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateQuizSubtopics };
