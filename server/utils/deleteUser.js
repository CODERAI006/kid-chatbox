/**
 * Safely delete a user by clearing FK references that block DELETE.
 * Content (quizzes, topics, etc.) is preserved; creator attribution is nulled.
 */

const { pool } = require('../config/database');

/** Tables/columns that reference users(id) without ON DELETE SET NULL */
const NULLABLE_USER_REFS = [
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

/**
 * @param {string} userId
 * @param {import('pg').PoolClient} [externalClient]
 */
async function deleteUserById(userId, externalClient = null) {
  const client = externalClient || (await pool.connect());
  const ownsClient = !externalClient;

  try {
    if (ownsClient) {
      await client.query('BEGIN');
    }

    for (const { table, column } of NULLABLE_USER_REFS) {
      await client.query(
        `UPDATE ${table} SET ${column} = NULL WHERE ${column} = $1`,
        [userId]
      );
    }

    // scheduled_by is NOT NULL — remove schedules created by this user
    await client.query('DELETE FROM scheduled_tests WHERE scheduled_by = $1', [userId]);

    await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM user_plans WHERE user_id = $1', [userId]);

    const deleted = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    if (deleted.rowCount === 0) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    if (ownsClient) {
      await client.query('COMMIT');
    }

    return deleted.rows[0];
  } catch (error) {
    if (ownsClient) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (ownsClient) {
      client.release();
    }
  }
}

module.exports = { deleteUserById, NULLABLE_USER_REFS };
