/**
 * Study buddy IDs, connections, requests, and quiz shares.
 * Usage: node server/scripts/migrate-study-buddies.js
 */

require('dotenv').config();
const { pool } = require('../config/database');
const { backfillBuddyIds } = require('../utils/buddyId');

async function migrateStudyBuddies() {
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS buddy_id VARCHAR(20);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_buddy_id
      ON users (buddy_id) WHERE buddy_id IS NOT NULL;
  `);

  const filled = await backfillBuddyIds(pool);
  if (filled > 0) {
    console.log(`✅ Backfilled buddy_id for ${filled} user(s)`);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS study_buddy_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      CHECK (from_user_id <> to_user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_study_buddy_requests_to_status
      ON study_buddy_requests (to_user_id, status);
    CREATE INDEX IF NOT EXISTS idx_study_buddy_requests_from_status
      ON study_buddy_requests (from_user_id, status);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_study_buddy_requests_pending_pair
      ON study_buddy_requests (from_user_id, to_user_id)
      WHERE status = 'pending';

    ALTER TABLE study_buddy_requests
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

    CREATE TABLE IF NOT EXISTS study_buddy_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      connected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      CHECK (user_a_id < user_b_id),
      UNIQUE (user_a_id, user_b_id)
    );
    CREATE INDEX IF NOT EXISTS idx_study_buddy_connections_user_a
      ON study_buddy_connections (user_a_id);
    CREATE INDEX IF NOT EXISTS idx_study_buddy_connections_user_b
      ON study_buddy_connections (user_b_id);

    CREATE TABLE IF NOT EXISTS study_buddy_quiz_shares (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quiz_library_id UUID NOT NULL REFERENCES quiz_library(id) ON DELETE CASCADE,
      message TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'unread'
        CHECK (status IN ('unread', 'read', 'started')),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMPTZ,
      CHECK (from_user_id <> to_user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_study_buddy_quiz_shares_to
      ON study_buddy_quiz_shares (to_user_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_study_buddy_quiz_shares_from
      ON study_buddy_quiz_shares (from_user_id, created_at DESC);
  `);

  console.log('✅ study buddy tables ready');
}

module.exports = { migrateStudyBuddies };

if (require.main === module) {
  migrateStudyBuddies()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
