/**
 * Script to add admin role to a user
 * Usage: node server/scripts/add-admin-user.js <email>
 */

const { pool } = require('../config/database');
const dotenv = require('dotenv');

dotenv.config();

const addAdminRole = async (email) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if user exists
    const userResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      console.log(`❌ User with email ${email} not found. Please register first.`);
      await client.query('ROLLBACK');
      return;
    }

    const userId = userResult.rows[0].id;

    // Get admin role ID
    const roleResult = await client.query("SELECT id FROM roles WHERE name = 'admin'");

    if (roleResult.rows.length === 0) {
      console.log('❌ Admin role not found. Please run database migration first.');
      await client.query('ROLLBACK');
      return;
    }

    const adminRoleId = roleResult.rows[0].id;

    // Check if user already has admin role
    const existingRoleResult = await client.query(
      'SELECT * FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, adminRoleId]
    );

    if (existingRoleResult.rows.length > 0) {
      console.log(`✅ User ${email} already has admin role.`);
      await client.query('ROLLBACK');
      return;
    }

    // Assign admin role
    await client.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
      [userId, adminRoleId]
    );

    // Approve user so admin portal and policies treat them as active
    await client.query(
      `UPDATE users 
       SET status = 'approved', 
           approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );

    const modules = ['study', 'quiz'];
    for (const module of modules) {
      await client.query(
        `INSERT INTO user_module_access (user_id, module_name, has_access, granted_by)
         VALUES ($1, $2, true, $1)
         ON CONFLICT (user_id, module_name) 
         DO UPDATE SET has_access = true`,
        [userId, module]
      );
    }

    await client.query('COMMIT');
    console.log(`✅ Successfully added admin role to ${email}`);
    console.log(`✅ User has been approved and can now access admin portal.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding admin role:', error);
    throw error;
  } finally {
    client.release();
  }
};

const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node server/scripts/add-admin-user.js <email>');
  process.exit(1);
}

addAdminRole(email)
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });


