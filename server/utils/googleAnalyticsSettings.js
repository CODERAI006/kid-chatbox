/**
 * Google Analytics ID from DB with in-memory cache (loaded at server startup).
 */

const { pool } = require('../config/database');
const { DEFAULT_GA_ID } = require('../scripts/migrate-app-analytics-settings');

const GA_ID_PATTERN = /^G-[A-Z0-9]+$/;

/** @type {{ googleAnalyticsId: string, enabled: boolean } | null} */
let cache = null;

function envFallback() {
  return (process.env.VITE_GOOGLE_ANALYTICS_ID || process.env.GOOGLE_ANALYTICS_ID || '').trim();
}

function normalizeGaId(raw) {
  const id = String(raw || '').trim();
  return GA_ID_PATTERN.test(id) ? id : '';
}

function buildSettings(row) {
  const fromDb = normalizeGaId(row?.google_analytics_id);
  const fromEnv = normalizeGaId(envFallback());
  const googleAnalyticsId = fromDb || fromEnv || DEFAULT_GA_ID;
  return {
    googleAnalyticsId,
    enabled: row ? row.enabled !== false : true,
  };
}

async function loadGoogleAnalyticsSettings() {
  try {
    const result = await pool.query(
      `SELECT google_analytics_id, enabled FROM app_analytics_settings WHERE id = 1`
    );
    cache = buildSettings(result.rows[0]);
  } catch (error) {
    console.warn('[GA settings] DB load failed, using env/default:', error.message || error);
    cache = buildSettings(null);
  }
  return cache;
}

function getCachedGoogleAnalyticsSettings() {
  if (cache) {
    return cache;
  }
  return buildSettings(null);
}

function invalidateGoogleAnalyticsCache() {
  cache = null;
}

module.exports = {
  loadGoogleAnalyticsSettings,
  getCachedGoogleAnalyticsSettings,
  invalidateGoogleAnalyticsCache,
};
