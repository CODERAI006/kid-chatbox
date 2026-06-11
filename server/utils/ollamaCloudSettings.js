/**
 * Admin-configured Ollama Cloud settings (API key stored encrypted at rest).
 * @see https://docs.ollama.com/cloud
 */

const crypto = require('crypto');
const { pool } = require('../config/database');
const {
  normalizeProfiles,
  resolveModelForType,
  getAdminModelCatalog,
  buildDefaultProfiles,
} = require('./ollamaModelRegistry');

const CLOUD_BASE_URL = 'https://ollama.com';
const DEFAULT_CLOUD_MODEL = 'gpt-oss:120b';
const DEFAULT_CLOUD_VISION_MODEL = 'qwen3-vl:235b-cloud';
const ALGO = 'aes-256-gcm';

/** @type {{ enabled: boolean, hasApiKey: boolean, profiles: Record<string, string>, apiKey: string | null } | null} */
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

function profilesFromRow(row) {
  let jsonProfiles = {};
  if (row?.model_profiles) {
    try {
      jsonProfiles =
        typeof row.model_profiles === 'string'
          ? JSON.parse(row.model_profiles)
          : row.model_profiles;
    } catch {
      jsonProfiles = {};
    }
  }
  return normalizeProfiles(jsonProfiles, {
    text: row?.cloud_model,
    ocr: row?.cloud_vision_model,
  });
}

async function loadOllamaCloudSettings() {
  const result = await pool.query(
    `SELECT enabled, api_key_encrypted, cloud_model, cloud_vision_model, model_profiles
     FROM ollama_cloud_settings WHERE id = 1`
  );
  const row = result.rows[0];
  if (!row) {
    cache = {
      enabled: false,
      hasApiKey: false,
      profiles: buildDefaultProfiles('cloud'),
      apiKey: null,
    };
    return cache;
  }
  const apiKey = decryptApiKey(row.api_key_encrypted);
  cache = {
    enabled: Boolean(row.enabled),
    hasApiKey: Boolean(apiKey),
    profiles: profilesFromRow(row),
    apiKey,
  };
  return cache;
}

function getCachedOllamaCloudSettings() {
  return (
    cache || {
      enabled: false,
      hasApiKey: false,
      profiles: buildDefaultProfiles('cloud'),
      apiKey: null,
    }
  );
}

function invalidateOllamaCloudCache() {
  cache = null;
}

function getOllamaRuntimeMode(localConfigured = true) {
  const envDisabled = process.env.OLLAMA_DISABLED;
  if (envDisabled === '1' || String(envDisabled).toLowerCase() === 'true') {
    return { mode: 'local', configured: false };
  }
  const cloud = getCachedOllamaCloudSettings();
  const envCloudKey = (process.env.OLLAMA_API_KEY || '').trim();
  if (cloud.enabled) {
    const apiKey = cloud.apiKey || envCloudKey || null;
    return { mode: 'cloud', configured: Boolean(apiKey) };
  }
  return { mode: 'local', configured: localConfigured };
}

/**
 * @returns {{ mode: 'cloud' | 'local', baseUrl: string, model: string, headers: Record<string, string>, configured: boolean, profiles: Record<string, string> }}
 */
function getResolvedOllamaConfig(localBaseUrl, localModel) {
  const runtime = getOllamaRuntimeMode(true);
  const cloud = getCachedOllamaCloudSettings();
  const envCloudKey = (process.env.OLLAMA_API_KEY || '').trim();

  if (runtime.mode === 'cloud') {
    const apiKey = cloud.apiKey || envCloudKey || null;
    const textModel = resolveModelForType('text', { mode: 'cloud', profiles: cloud.profiles });
    return {
      mode: 'cloud',
      baseUrl: CLOUD_BASE_URL,
      model: textModel || DEFAULT_CLOUD_MODEL,
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      configured: Boolean(apiKey),
      profiles: cloud.profiles,
    };
  }

  const localProfiles = { ...buildDefaultProfiles('local'), ...cloud.profiles };
  return {
    mode: 'local',
    baseUrl: localBaseUrl,
    model: resolveModelForType('text', { mode: 'local', profiles: localProfiles }) || localModel,
    headers: {},
    configured: runtime.configured,
    profiles: localProfiles,
  };
}

/** @param {'text'|'ocr'|'image'|'voice'|'pdf'} typeId */
function getConfiguredModel(typeId) {
  const localBase = (process.env.OLLAMA_HOST || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const localModel = (process.env.OLLAMA_MODEL || 'llama3.2:latest').trim();
  const runtime = getResolvedOllamaConfig(localBase, localModel);
  return resolveModelForType(typeId, { mode: runtime.mode, profiles: runtime.profiles });
}

async function getOllamaCloudSettingsForAdmin() {
  const result = await pool.query(
    `SELECT enabled, api_key_encrypted, cloud_model, cloud_vision_model, model_profiles, updated_at, updated_by
     FROM ollama_cloud_settings WHERE id = 1`
  );
  const row = result.rows[0];
  const apiKey = decryptApiKey(row?.api_key_encrypted);
  const models = profilesFromRow(row);
  return {
    enabled: Boolean(row?.enabled),
    hasApiKey: Boolean(apiKey),
    apiKeyMasked: maskApiKey(apiKey),
    cloudModel: models.text || DEFAULT_CLOUD_MODEL,
    cloudVisionModel: models.ocr || DEFAULT_CLOUD_VISION_MODEL,
    models,
    modelCatalog: getAdminModelCatalog(),
    updatedAt: row?.updated_at || null,
    updatedBy: row?.updated_by || null,
    cloudBaseUrl: CLOUD_BASE_URL,
  };
}

function mergeModelsInput(input, row) {
  const existing = profilesFromRow(row);
  const next = { ...existing };

  if (input.models && typeof input.models === 'object') {
    for (const [key, val] of Object.entries(input.models)) {
      if (typeof val === 'string') next[key] = val.trim();
    }
  }
  if (typeof input.cloudModel === 'string' && input.cloudModel.trim()) {
    next.text = input.cloudModel.trim();
  }
  if (typeof input.cloudVisionModel === 'string' && input.cloudVisionModel.trim()) {
    next.ocr = input.cloudVisionModel.trim();
  }
  return normalizeProfiles(next, {});
}

/**
 * @param {{ enabled?: boolean, apiKey?: string | null, cloudModel?: string, cloudVisionModel?: string, models?: Record<string, string>, updatedBy?: string }} input
 */
async function saveOllamaCloudSettings(input) {
  const current = await pool.query(
    `SELECT enabled, api_key_encrypted, cloud_model, cloud_vision_model, model_profiles
     FROM ollama_cloud_settings WHERE id = 1`
  );
  const row = current.rows[0];
  const enabled = typeof input.enabled === 'boolean' ? input.enabled : Boolean(row?.enabled);
  const models = mergeModelsInput(input, row);

  let apiKeyEncrypted = row?.api_key_encrypted || null;
  if (typeof input.apiKey === 'string' && input.apiKey.trim()) {
    apiKeyEncrypted = encryptApiKey(input.apiKey.trim());
  }

  await pool.query(
    `INSERT INTO ollama_cloud_settings (
       id, enabled, api_key_encrypted, cloud_model, cloud_vision_model, model_profiles, updated_at, updated_by
     )
     VALUES (1, $1, $2, $3, $4, $5::jsonb, CURRENT_TIMESTAMP, $6)
     ON CONFLICT (id) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       api_key_encrypted = COALESCE(EXCLUDED.api_key_encrypted, ollama_cloud_settings.api_key_encrypted),
       cloud_model = EXCLUDED.cloud_model,
       cloud_vision_model = EXCLUDED.cloud_vision_model,
       model_profiles = EXCLUDED.model_profiles,
       updated_at = CURRENT_TIMESTAMP,
       updated_by = EXCLUDED.updated_by`,
    [
      enabled,
      apiKeyEncrypted,
      models.text || DEFAULT_CLOUD_MODEL,
      models.ocr || DEFAULT_CLOUD_VISION_MODEL,
      JSON.stringify(models),
      input.updatedBy || null,
    ]
  );

  invalidateOllamaCloudCache();
  await loadOllamaCloudSettings();
  return getOllamaCloudSettingsForAdmin();
}

module.exports = {
  CLOUD_BASE_URL,
  DEFAULT_CLOUD_MODEL,
  DEFAULT_CLOUD_VISION_MODEL,
  loadOllamaCloudSettings,
  getCachedOllamaCloudSettings,
  invalidateOllamaCloudCache,
  getResolvedOllamaConfig,
  getConfiguredModel,
  getOllamaCloudSettingsForAdmin,
  saveOllamaCloudSettings,
  maskApiKey,
};
