/**
 * Set password for an existing user
 * Usage: node server/scripts/set-user-password.js <email> <password>
 */

const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const setPassword = async (email, password) => {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `UPDATE users
     SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
     WHERE LOWER(email) = LOWER($2)
     RETURNING id, email, name`,
    [passwordHash, email.trim()]
  );

  if (result.rowCount === 0) {
    throw new Error(`User not found: ${email}`);
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, passwordHash);
  console.log(`✅ Password updated for ${user.email} (${user.name})`);
  console.log(`🔐 Password verify: ${valid ? 'OK' : 'FAILED'}`);
};

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node server/scripts/set-user-password.js <email> <password>');
  process.exit(1);
}

setPassword(email, password)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  })
  .finally(() => pool.end());
