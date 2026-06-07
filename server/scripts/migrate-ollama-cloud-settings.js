/**
 * Ollama Cloud admin settings (single-row table).
 * Stores enable flag, encrypted API key, and optional cloud model override.
 */

require('dotenv').config();

const { pool } = require('../config/database');

async function migrateOllamaCloudSettings() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ollama_cloud_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      enabled BOOLEAN NOT NULL DEFAULT false,
      api_key_encrypted TEXT,
      cloud_model VARCHAR(255) NOT NULL DEFAULT 'gpt-oss:120b',
      cloud_vision_model VARCHAR(255) NOT NULL DEFAULT 'qwen3-vl:235b-cloud',
      model_profiles JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  await pool.query(`
    ALTER TABLE ollama_cloud_settings
    ADD COLUMN IF NOT EXISTS cloud_vision_model VARCHAR(255) NOT NULL DEFAULT 'qwen3-vl:235b-cloud';
  `);

  await pool.query(`
    ALTER TABLE ollama_cloud_settings
    ADD COLUMN IF NOT EXISTS model_profiles JSONB NOT NULL DEFAULT '{}'::jsonb;
  `);

  await pool.query(`
    INSERT INTO ollama_cloud_settings (id, enabled, cloud_model, cloud_vision_model)
    VALUES (1, false, 'gpt-oss:120b', 'qwen3-vl:235b-cloud')
    ON CONFLICT (id) DO NOTHING;
  `);

  console.log('✅ ollama_cloud_settings table ready');
}

if (require.main === module) {
  migrateOllamaCloudSettings()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ ollama_cloud_settings migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateOllamaCloudSettings };
