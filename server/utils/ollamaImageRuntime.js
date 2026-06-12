/**
 * Resolve Ollama Cloud image model + host (Admin API key only — no OpenAI, no local fallback).
 */
const { getOllamaRuntimeConfig, listOllamaModelsAt } = require('./ollamaClient');
const { getConfiguredModel } = require('./ollamaCloudSettings');
const { isLikelyImageModel } = require('./ollamaModelFilters');

const DEFAULT_IMAGE_MODEL = 'x/z-image-turbo';
const IMAGE_MODEL_PREFERENCES = [
  'x/z-image-turbo',
  'x/flux2-klein',
  'flux2-klein',
  'flux-schnell',
  'flux-dev',
  'sdxl',
];

function scoreImageModel(name) {
  const lower = String(name || '').toLowerCase();
  for (let i = 0; i < IMAGE_MODEL_PREFERENCES.length; i++) {
    if (lower.includes(IMAGE_MODEL_PREFERENCES[i])) return i;
  }
  return 999;
}

function modelMatches(requested, installed) {
  const req = String(requested || '').toLowerCase();
  return installed.some((name) => {
    const n = name.toLowerCase();
    return n === req || n.startsWith(`${req}:`) || req.startsWith(`${n}:`);
  });
}

function pickBestImageModel(installed) {
  const imageModels = installed.filter(isLikelyImageModel);
  if (imageModels.length === 0) return null;
  imageModels.sort((a, b) => scoreImageModel(a) - scoreImageModel(b));
  return imageModels[0];
}

/**
 * @returns {Promise<{ mode: string, baseUrl: string, headers: Record<string,string>, model: string, configured: boolean }>}
 */
async function resolveOllamaImageRuntime() {
  const runtime = getOllamaRuntimeConfig();
  if (!runtime.configured) {
    throw new Error('Ollama Cloud is not configured. Add your API key in Admin → Ollama Cloud.');
  }

  const envModel = (process.env.OLLAMA_IMAGE_MODEL || '').trim();
  const adminModel = (getConfiguredModel('image') || '').trim();
  const requested = envModel || adminModel || DEFAULT_IMAGE_MODEL;

  let installed = [];
  try {
    installed = await listOllamaModelsAt(runtime.baseUrl, runtime.headers);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[image] could not list Ollama models', { error: msg });
  }

  let model = requested;
  if (installed.length > 0) {
    if (modelMatches(requested, installed)) {
      model = installed.find((n) => {
        const r = requested.toLowerCase();
        const l = n.toLowerCase();
        return l === r || l.startsWith(`${r}:`) || r.startsWith(`${l}:`);
      }) || requested;
    } else {
      const best = pickBestImageModel(installed);
      if (best) {
        console.info('[image] admin image model unavailable on Ollama; using catalog match', {
          requested,
          using: best,
        });
        model = best;
      }
    }
  }

  console.info('[image] using Ollama image model', { model, mode: runtime.mode });
  return {
    mode: runtime.mode,
    baseUrl: runtime.baseUrl,
    headers: runtime.headers,
    model,
    configured: true,
  };
}

module.exports = {
  resolveOllamaImageRuntime,
  DEFAULT_IMAGE_MODEL,
};
