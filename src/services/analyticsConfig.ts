/**
 * Fetches Google Analytics config from the API with sessionStorage cache.
 */

import { APP_CONSTANTS } from '@/constants/app';
import { publicApi } from '@/services/api';

const CACHE_KEY = 'guru_analytics_config_v1';
const CACHE_TTL_MS = 60 * 60 * 1000;

export interface AnalyticsConfig {
  googleAnalyticsId: string;
  enabled: boolean;
}

interface CachedPayload extends AnalyticsConfig {
  fetchedAt: number;
}

let memoryCache: AnalyticsConfig | null = null;

function readSessionCache(): AnalyticsConfig | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    if (!parsed.googleAnalyticsId) return null;
    return { googleAnalyticsId: parsed.googleAnalyticsId, enabled: parsed.enabled };
  } catch {
    return null;
  }
}

function writeSessionCache(config: AnalyticsConfig): void {
  try {
    const payload: CachedPayload = { ...config, fetchedAt: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

function envFallback(): AnalyticsConfig | null {
  const id = APP_CONSTANTS.GOOGLE_ANALYTICS_ID.trim();
  if (!id) return null;
  return { googleAnalyticsId: id, enabled: true };
}

/** Resolve GA config: memory → sessionStorage → API → env fallback. */
export async function resolveAnalyticsConfig(): Promise<AnalyticsConfig | null> {
  if (memoryCache) {
    return memoryCache;
  }

  const session = readSessionCache();
  if (session) {
    memoryCache = session;
    return session;
  }

  try {
    const remote = await publicApi.getAnalyticsConfig();
    if (remote.success && remote.googleAnalyticsId) {
      const config: AnalyticsConfig = {
        googleAnalyticsId: remote.googleAnalyticsId,
        enabled: remote.enabled,
      };
      memoryCache = config;
      writeSessionCache(config);
      return config;
    }
  } catch (error) {
    console.error('[analytics] Failed to fetch config from API:', error);
  }

  const fallback = envFallback();
  if (fallback) {
    memoryCache = fallback;
  }
  return fallback;
}
