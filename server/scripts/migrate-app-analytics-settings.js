/**
 * Google Analytics measurement ID (single-row table, admin-updatable later).
 */

require('dotenv').config();

const { pool } = require('../config/database');

const DEFAULT_GA_ID = 'G-T7FVN8DMML';
const LEGACY_GA_ID = 'G-GC9H1MJ5MH';

async function migrateAppAnalyticsSettings() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_analytics_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      google_analytics_id VARCHAR(32) NOT NULL DEFAULT '${DEFAULT_GA_ID}',
      enabled BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(
    `INSERT INTO app_analytics_settings (id, google_analytics_id, enabled)
     VALUES (1, $1, true)
     ON CONFLICT (id) DO NOTHING`,
    [DEFAULT_GA_ID]
  );

  // Upgrade rows seeded with the previous default ID
  await pool.query(
    `UPDATE app_analytics_settings
     SET google_analytics_id = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = 1 AND google_analytics_id = $2`,
    [DEFAULT_GA_ID, LEGACY_GA_ID]
  );

  console.log('✅ app_analytics_settings table ready');
}

if (require.main === module) {
  migrateAppAnalyticsSettings()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ app_analytics_settings migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateAppAnalyticsSettings, DEFAULT_GA_ID };
