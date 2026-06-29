/**
 * Admin-configurable UPI / payment details (single-row table).
 */

require('dotenv').config();

const { pool } = require('../config/database');

async function migratePaymentSettings() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      enabled BOOLEAN NOT NULL DEFAULT false,
      upi_id VARCHAR(120),
      phone_number VARCHAR(20),
      payee_name VARCHAR(120),
      qr_image_path VARCHAR(500),
      instructions TEXT,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(
    `INSERT INTO payment_settings (id, enabled, instructions)
     VALUES (1, false, 'Pay via UPI, then upload your payment screenshot below. We will activate your plan after verification.')
     ON CONFLICT (id) DO NOTHING`
  );

  console.log('✅ payment_settings table ready');
}

if (require.main === module) {
  migratePaymentSettings()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ payment_settings migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migratePaymentSettings };
