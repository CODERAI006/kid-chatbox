/**
 * In-app notification inbox for students.
 * Usage: node server/scripts/migrate-user-notifications.js
 */

require('dotenv').config();
const { pool } = require('../config/database');

async function migrateUserNotifications() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      link_path VARCHAR(255),
      metadata JSONB NOT NULL DEFAULT '{}',
      is_read BOOLEAN NOT NULL DEFAULT false,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
      ON user_notifications (user_id, is_read, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
      ON user_notifications (user_id, created_at DESC);
  `);
  console.log('✅ user_notifications table ready');
}

module.exports = { migrateUserNotifications };

if (require.main === module) {
  migrateUserNotifications()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
