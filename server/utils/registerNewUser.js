/**
 * Shared setup for newly registered users: student role, Freemium plan, module access.
 */

const { pool } = require('../config/database');
const { getFreemiumPlan, assignPlanToUser } = require('./plans');

const DUPLICATE_EMAIL_MESSAGE = 'An account with this email already exists';
const STUDENT_MODULES = ['study', 'quiz'];

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
 * @returns {Promise<boolean>}
 */
const userHasAdminRole = async (client, userId) => {
  const result = await client.query(
    `SELECT 1
     FROM user_roles ur
     INNER JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1 AND r.name IN ('admin', 'super_admin')
     LIMIT 1`,
    [userId]
  );
  return result.rows.length > 0;
};

/**
 * @param {import('pg').PoolClient} client
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
const userHasPlan = async (client, userId) => {
  const result = await client.query(
    'SELECT 1 FROM user_plans WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  return result.rows.length > 0;
};

/**
 * Freemium includes AI Study and AI Quiz for self-serve student onboarding.
 * @param {import('pg').PoolClient} client
 */
const ensureFreemiumAiFeatures = async (client) => {
  await client.query(
    `UPDATE plans
     SET hide_ai_study = false, hide_ai_quiz = false
     WHERE name = 'Freemium'`
  );
};

/**
 * @param {import('pg').PoolClient} client
 * @param {string} userId
 * @param {string | null} [grantedBy]
 */
const grantStudentModuleAccess = async (client, userId, grantedBy = null) => {
  for (const moduleName of STUDENT_MODULES) {
    await client.query(
      `INSERT INTO user_module_access (user_id, module_name, granted_by, has_access)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (user_id, module_name)
       DO UPDATE SET has_access = true, granted_by = COALESCE($3, user_module_access.granted_by)`,
      [userId, moduleName, grantedBy]
    );
  }
};

/**
 * @param {import('pg').PoolClient} client
 * @param {string} userId
 */
const assignStudentRole = async (client, userId) => {
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
};

/**
 * Idempotent student onboarding: role, Freemium plan, study/quiz module access.
 * Skips admin/super_admin accounts.
 * @param {import('pg').Pool | import('pg').PoolClient} db
 * @param {string} userId
 * @param {string | null} [assignedBy]
 */
const ensureStudentOnboarding = async (db, userId, assignedBy = null) => {
  // PoolClient (from pool.connect()) also has .connect — use .release to tell them apart.
  const ownsClient = typeof db.release !== 'function';
  const client = ownsClient ? await db.connect() : db;

  try {
    if (ownsClient) {
      await client.query('BEGIN');
    }

    if (await userHasAdminRole(client, userId)) {
      if (ownsClient) {
        await client.query('COMMIT');
      }
      return;
    }

    await assignStudentRole(client, userId);
    await grantStudentModuleAccess(client, userId, assignedBy);
    await ensureFreemiumAiFeatures(client);

    if (!(await userHasPlan(client, userId))) {
      const freemiumPlan = await getFreemiumPlan();
      await assignPlanToUser(userId, freemiumPlan.id, assignedBy, client);
    }

    if (ownsClient) {
      await client.query('COMMIT');
    }
  } catch (error) {
    if (ownsClient) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw error;
  } finally {
    if (ownsClient) {
      client.release();
    }
  }
};

/**
 * @param {import('pg').PoolClient} client
 * @param {string} userId
 */
const setupNewUserAccount = async (client, userId) => {
  await ensureStudentOnboarding(client, userId, null);
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
  ensureStudentOnboarding,
};
