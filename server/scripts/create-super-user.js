/**
 * Script to create a super user with admin role
 * Usage: node server/scripts/create-super-user.js <email> <password> <name>
 */

const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const createSuperUser = async (email, password, name) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if user already exists
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);

    let userId;

    if (existingUser.rows.length > 0) {
      console.log(`⚠️  User ${email} already exists. Updating to super user...`);
      userId = existingUser.rows[0].id;

      // Update password if provided
      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        await client.query(
          'UPDATE users SET password_hash = $1, name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [passwordHash, name || 'Super Admin', userId]
        );
      }
    } else {
      // Create new user
      if (!password) {
        throw new Error('Password is required for new users');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const result = await client.query(
        `INSERT INTO users (
          email, password_hash, name, status, age_group
        )
        VALUES ($1, $2, $3, 'approved', 'admin')
        RETURNING id`,
        [email, passwordHash, name || 'Super Admin']
      );
      userId = result.rows[0].id;
      console.log(`✅ Created new user: ${email}`);
    }

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

    if (existingRoleResult.rows.length === 0) {
      // Assign admin role
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [userId, adminRoleId]
      );
      console.log(`✅ Assigned admin role to ${email}`);
    } else {
      console.log(`✅ User ${email} already has admin role`);
    }

    // Ensure user is approved
    await client.query(
      `UPDATE users 
       SET status = 'approved', 
           approved_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );

    // Grant access to all modules
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
    console.log(`\n🎉 Super user created successfully!`);
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${name || 'Super Admin'}`);
    console.log(`🔐 Role: admin`);
    console.log(`✅ Status: approved`);
    console.log(`\nYou can now login and access the admin portal at /admin`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating super user:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Get parameters from command line
const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || 'Super Admin';

if (!email || !password) {
  console.error('❌ Email and password are required');
  console.log('Usage: node server/scripts/create-super-user.js <email> <password> [name]');
  process.exit(1);
}

createSuperUser(email, password, name)
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  });


