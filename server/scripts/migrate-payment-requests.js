/**
 * User payment proof submissions — admin approves to activate plan.
 */

require('dotenv').config();

const { pool } = require('../config/database');

async function migratePaymentRequests() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
      amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      screenshot_path VARCHAR(500),
      transaction_ref VARCHAR(120),
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
      admin_notes TEXT,
      reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_requests_status_created
      ON payment_requests (status, created_at DESC);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_requests_user
      ON payment_requests (user_id, created_at DESC);
  `);

  console.log('✅ payment_requests table ready');
}

if (require.main === module) {
  migratePaymentRequests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ payment_requests migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migratePaymentRequests };
