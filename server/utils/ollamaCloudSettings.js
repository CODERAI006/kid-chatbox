/**
 * Admin-configured Ollama Cloud settings (API key stored encrypted at rest).
 * @see https://docs.ollama.com/cloud
 */

const crypto = require('crypto');
const { pool } = require('../config/database');

const CLOUD_BASE_URL = 'https://ollama.com';
const DEFAULT_CLOUD_MODEL = 'gpt-oss:120b';
const ALGO = 'aes-256-gcm';

/** @type {{ enabled: boolean, hasApiKey: boolean, cloudModel: string, apiKey: string | null } | null} */
let cache = null;

function deriveKey() {
  const secret = process.env.JWT_SECRET || process.env.OLLAMA_SETTINGS_SECRET || 'change-me-in-production';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

function encryptApiKey(plain) {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptApiKey(stored) {
  if (!stored) return null;
  try {
    const [ivB64, tagB64, dataB64] = String(stored).split(':');
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const key = deriveKey();
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('[OllamaCloud] Failed to decrypt API key:', err instanceof Error ? err.message : err);
    return null;
  }
}

function maskApiKey(key) {
  if (!key || key.length < 8) return key ? '••••••••' : null;
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

async function loadOllamaCloudSettings() {
  const result = await pool.query(
    `SELECT enabled, api_key_encrypted, cloud_model FROM ollama_cloud_settings WHERE id = 1`
  );
  const row = result.rows[0];
  if (!row) {
    cache = { enabled: false, hasApiKey: false, cloudModel: DEFAULT_CLOUD_MODEL, apiKey: null };
    return cache;
  }
  const apiKey = decryptApiKey(row.api_key_encrypted);
  cache = {
    enabled: Boolean(row.enabled),
    hasApiKey: Boolean(apiKey),
    cloudModel: (row.cloud_model || DEFAULT_CLOUD_MODEL).trim() || DEFAULT_CLOUD_MODEL,
    apiKey,
  };
  return cache;
}

function getCachedOllamaCloudSettings() {
  return (
    cache || {
      enabled: false,
      hasApiKey: false,
      cloudModel: DEFAULT_CLOUD_MODEL,
      apiKey: null,
    }
  );
}

function invalidateOllamaCloudCache() {
  cache = null;
}

/**
 * Resolve runtime Ollama target: cloud (when enabled + key) or local env defaults.
 * @returns {{ mode: 'cloud' | 'local', baseUrl: string, model: string, headers: Record<string, string>, configured: boolean }}
 */
function getResolvedOllamaConfig(localBaseUrl, localModel) {
  const envDisabled = process.env.OLLAMA_DISABLED;
  if (envDisabled === '1' || String(envDisabled).toLowerCase() === 'true') {
    return { mode: 'local', baseUrl: localBaseUrl, model: localModel, headers: {}, configured: false };
  }

  const cloud = getCachedOllamaCloudSettings();
  const envCloudKey = (process.env.OLLAMA_API_KEY || '').trim();

  if (cloud.enabled) {
    const apiKey = cloud.apiKey || envCloudKey || null;
    if (!apiKey) {
      return { mode: 'cloud', baseUrl: CLOUD_BASE_URL, model: cloud.cloudModel, headers: {}, configured: false };
    }
    return {
      mode: 'cloud',
      baseUrl: CLOUD_BASE_URL,
      model: cloud.cloudModel,
      headers: { Authorization: `Bearer ${apiKey}` },
      configured: true,
    };
  }

  return {
    mode: 'local',
    baseUrl: localBaseUrl,
    model: localModel,
    headers: {},
    configured: true,
  };
}

async function getOllamaCloudSettingsForAdmin() {
  const result = await pool.query(
    `SELECT enabled, api_key_encrypted, cloud_model, updated_at, updated_by
     FROM ollama_cloud_settings WHERE id = 1`
  );
  const row = result.rows[0];
  const apiKey = decryptApiKey(row?.api_key_encrypted);
  return {
    enabled: Boolean(row?.enabled),
    hasApiKey: Boolean(apiKey),
    apiKeyMasked: maskApiKey(apiKey),
    cloudModel: (row?.cloud_model || DEFAULT_CLOUD_MODEL).trim(),
    updatedAt: row?.updated_at || null,
    updatedBy: row?.updated_by || null,
    cloudBaseUrl: CLOUD_BASE_URL,
  };
}

/**
 * @param {{ enabled?: boolean, apiKey?: string | null, cloudModel?: string, updatedBy?: string }} input
 */
async function saveOllamaCloudSettings(input) {
  const current = await pool.query(
    `SELECT enabled, api_key_encrypted, cloud_model FROM ollama_cloud_settings WHERE id = 1`
  );
  const row = current.rows[0];
  const enabled = typeof input.enabled === 'boolean' ? input.enabled : Boolean(row?.enabled);
  const cloudModel =
    typeof input.cloudModel === 'string' && input.cloudModel.trim()
      ? input.cloudModel.trim()
      : (row?.cloud_model || DEFAULT_CLOUD_MODEL);

  let apiKeyEncrypted = row?.api_key_encrypted || null;
  if (typeof input.apiKey === 'string' && input.apiKey.trim()) {
    apiKeyEncrypted = encryptApiKey(input.apiKey.trim());
  }

  await pool.query(
    `INSERT INTO ollama_cloud_settings (id, enabled, api_key_encrypted, cloud_model, updated_at, updated_by)
     VALUES (1, $1, $2, $3, CURRENT_TIMESTAMP, $4)
     ON CONFLICT (id) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       api_key_encrypted = COALESCE(EXCLUDED.api_key_encrypted, ollama_cloud_settings.api_key_encrypted),
       cloud_model = EXCLUDED.cloud_model,
       updated_at = CURRENT_TIMESTAMP,
       updated_by = EXCLUDED.updated_by`,
    [enabled, apiKeyEncrypted, cloudModel, input.updatedBy || null]
  );

  invalidateOllamaCloudCache();
  await loadOllamaCloudSettings();
  return getOllamaCloudSettingsForAdmin();
}

module.exports = {
  CLOUD_BASE_URL,
  DEFAULT_CLOUD_MODEL,
  loadOllamaCloudSettings,
  getCachedOllamaCloudSettings,
  invalidateOllamaCloudCache,
  getResolvedOllamaConfig,
  getOllamaCloudSettingsForAdmin,
  saveOllamaCloudSettings,
  maskApiKey,
};
