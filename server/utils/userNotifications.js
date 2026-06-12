/**
 * In-app user notifications (study buddy requests, shared quizzes, etc.)
 */

const { pool } = require('../config/database');

/**
 * @param {import('pg').Pool | import('pg').PoolClient} db
 */
async function createUserNotification(db, {
  userId,
  type,
  title,
  body = null,
  linkPath = null,
  metadata = {},
}) {
  const result = await db.query(
    `INSERT INTO user_notifications (user_id, type, title, body, link_path, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, created_at`,
    [userId, type, title, body, linkPath, JSON.stringify(metadata || {})]
  );
  return result.rows[0];
}

module.exports = { createUserNotification };
