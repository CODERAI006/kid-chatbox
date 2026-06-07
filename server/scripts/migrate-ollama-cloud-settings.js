/**
 * Ollama Cloud admin settings (single-row table).
 * Stores enable flag, encrypted API key, and optional cloud model override.
 */

const { pool } = require('../config/database');

async function migrateOllamaCloudSettings() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ollama_cloud_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      enabled BOOLEAN NOT NULL DEFAULT false,
      api_key_encrypted TEXT,
      cloud_model VARCHAR(255) NOT NULL DEFAULT 'gpt-oss:120b',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  await pool.query(`
    INSERT INTO ollama_cloud_settings (id, enabled, cloud_model)
    VALUES (1, false, 'gpt-oss:120b')
    ON CONFLICT (id) DO NOTHING;
  `);

  console.log('✅ ollama_cloud_settings table ready');
}

module.exports = { migrateOllamaCloudSettings };
