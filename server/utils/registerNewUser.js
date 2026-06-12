/**
 * Shared setup for newly registered users: student role + Freemium plan.
 */

const { pool } = require('../config/database');
const { getFreemiumPlan, assignPlanToUser } = require('./plans');

const DUPLICATE_EMAIL_MESSAGE = 'An account with this email already exists';

/**
 * @param {string} email Normalized email
 * @returns {Promise<boolean>}
 */
const emailExists = async (email) => {
  const result = await pool.query(
    'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1',
    [email]
  );
  return result.rows.length > 0;
};

/**
 * @param {import('pg').PoolClient} client
 * @param {string} userId
 */
const setupNewUserAccount = async (client, userId) => {
  const studentRoleResult = await client.query(
    "SELECT id FROM roles WHERE name = 'student' LIMIT 1"
  );

  if (studentRoleResult.rows.length > 0) {
    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, studentRoleResult.rows[0].id]
    );
  }

  const freemiumPlan = await getFreemiumPlan();
  await assignPlanToUser(userId, freemiumPlan.id, null, client);
};

/**
 * @param {Error & { code?: string }} error
 * @returns {boolean}
 */
const isDuplicateEmailError = (error) => error.code === '23505';

module.exports = {
  DUPLICATE_EMAIL_MESSAGE,
  emailExists,
  isDuplicateEmailError,
  setupNewUserAccount,
};
