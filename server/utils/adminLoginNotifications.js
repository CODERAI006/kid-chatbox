/**
 * Notify admin users when a non-admin user logs in.
 */

const { createUserNotification } = require('./userNotifications');

const ADMIN_ROLES = ['admin', 'super_admin'];

const METHOD_LABELS = {
  email: 'email & password',
  google: 'Google',
  apple: 'Apple',
  register: 'registration',
};

async function userHasAdminRole(db, userId) {
  const result = await db.query(
    `SELECT 1
     FROM user_roles ur
     INNER JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1 AND r.name = ANY($2::text[])
     LIMIT 1`,
    [userId, ADMIN_ROLES]
  );
  return result.rows.length > 0;
}

async function getAdminUserIds(db) {
  const result = await db.query(
    `SELECT DISTINCT ur.user_id
     FROM user_roles ur
     INNER JOIN roles r ON r.id = ur.role_id
     WHERE r.name = ANY($1::text[])`,
    [ADMIN_ROLES]
  );
  return result.rows.map((row) => row.user_id);
}

/**
 * @param {import('pg').Pool | import('pg').PoolClient} db
 */
async function notifyAdminsOfUserLogin(db, { userId, name, email, method = 'email' }) {
  try {
    if (!userId || (await userHasAdminRole(db, userId))) return;

    const adminIds = await getAdminUserIds(db);
    if (!adminIds.length) return;

    const displayName = name?.trim() || 'A student';
    const methodLabel = METHOD_LABELS[method] || method;
    const title = `${displayName} logged in`;
    const body = email
      ? `${email} signed in via ${methodLabel}.`
      : `Signed in via ${methodLabel}.`;

    await Promise.all(
      adminIds.map((adminId) =>
        createUserNotification(db, {
          userId: adminId,
          type: 'user_login',
          title,
          body,
          linkPath: '/admin/users',
          metadata: { userId, email: email || null, name: displayName, method },
        })
      )
    );
  } catch (error) {
    console.error('[adminLoginNotifications] notify failed:', error.message || error);
  }
}

module.exports = { notifyAdminsOfUserLogin, userHasAdminRole, getAdminUserIds };
