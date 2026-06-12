/**
 * Resolve Ollama image model for study lessons and quiz illustrations.
 */
const { getOllamaRuntimeConfig, listOllamaModels } = require('./ollamaClient');
const { getConfiguredModel } = require('./ollamaCloudSettings');
const { isLikelyImageModel } = require('./ollamaModelFilters');

const LOCAL_IMAGE_HINT =
  'Install a local image model: `ollama pull flux-schnell` or `ollama pull x/z-image-turbo`, ' +
  'or set OLLAMA_IMAGE_MODEL in .env / Admin → Ollama Cloud → Image generation.';

const CLOUD_IMAGE_HINT =
  'Set image model in Admin → Ollama Cloud (e.g. x/z-image-turbo) or OLLAMA_IMAGE_MODEL in .env.';

/** Valid Ollama Cloud image models (flux:cloud is not hosted — use x/* models). */
const CLOUD_IMAGE_FALLBACK = 'x/z-image-turbo';

const CLOUD_IMAGE_PREFERENCES = [
  'x/z-image-turbo',
  'x/flux2-klein',
  'z-image-turbo',
  'flux2-klein',
];

const LOCAL_IMAGE_PREFERENCES = [
  'x/z-image-turbo',
  'flux2-klein',
  'flux-schnell',
  'flux-dev',
  'flux',
  'sdxl',
  'stable-diffusion',
];

function scoreImageModel(name) {
  const lower = String(name || '').toLowerCase();
  for (let i = 0; i < LOCAL_IMAGE_PREFERENCES.length; i++) {
    if (lower.includes(LOCAL_IMAGE_PREFERENCES[i])) return i;
  }
  return 999;
}

function scoreCloudImageModel(name) {
  const lower = String(name || '').toLowerCase();
  for (let i = 0; i < CLOUD_IMAGE_PREFERENCES.length; i++) {
    if (lower.includes(CLOUD_IMAGE_PREFERENCES[i])) return i;
  }
  return isLikelyImageModel(name) ? 50 : 999;
}

function pickBestInstalledImageModel(installed) {
  const imageModels = installed.filter(isLikelyImageModel);
  if (imageModels.length === 0) return null;
  imageModels.sort((a, b) => scoreImageModel(a) - scoreImageModel(b));
  return imageModels[0];
}

function pickBestCloudImageModel(installed) {
  const imageModels = installed.filter(isLikelyImageModel);
  if (imageModels.length === 0) return null;
  imageModels.sort((a, b) => scoreCloudImageModel(a) - scoreCloudImageModel(b));
  return imageModels[0];
}

async function resolveCloudImageModel(configured) {
  const requested = String(configured || '').trim();
  if (!requested) return CLOUD_IMAGE_FALLBACK;

  let installed = [];
  try {
    installed = await listOllamaModels();
  } catch {
    return requested;
  }

  if (installed.length > 0 && modelMatchesInstalled(requested, installed)) {
    return requested;
  }

  const picked = pickBestCloudImageModel(installed);
  const fallback = picked || CLOUD_IMAGE_FALLBACK;
  console.warn('[image] cloud image model unavailable; using fallback', {
    requested,
    using: fallback,
    hint: 'Update Admin → Ollama Cloud → Image generation to x/z-image-turbo',
  });
  return fallback;
}

function modelMatchesInstalled(requested, installed) {
  const req = String(requested || '').toLowerCase();
  return installed.some((name) => {
    const n = name.toLowerCase();
    return n === req || n.startsWith(`${req}:`) || req.startsWith(`${n}:`);
  });
}

async function resolveImageModel() {
  const runtime = getOllamaRuntimeConfig();
  const configured = getConfiguredModel('image');

  if (runtime.mode === 'cloud') {
    if (!runtime.configured) {
      throw new Error(
        'Ollama Cloud is enabled but no API key is configured. Add a key in Admin → Ollama Cloud.'
      );
    }
    if (!configured) {
      throw new Error(`No image model configured. ${CLOUD_IMAGE_HINT}`);
    }
    const model = await resolveCloudImageModel(configured);
    console.info('[image] using Ollama Cloud image model', { model });
    return model;
  }

  const envOnly = (process.env.OLLAMA_IMAGE_MODEL || '').trim();
  if (envOnly) {
    let installed = [];
    try {
      installed = await listOllamaModels();
    } catch {
      return envOnly;
    }
    if (installed.length === 0 || modelMatchesInstalled(envOnly, installed)) return envOnly;
    throw new Error(
      `Image model "${envOnly}" is not installed. Run \`ollama pull ${envOnly.split(':')[0]}\`. ${LOCAL_IMAGE_HINT}`
    );
  }

  if (configured) {
    let installed = [];
    try {
      installed = await listOllamaModels();
    } catch {
      return configured;
    }
    if (installed.length === 0 || modelMatchesInstalled(configured, installed)) {
      return configured;
    }
  }

  let installed = [];
  try {
    installed = await listOllamaModels();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not list Ollama models (${msg}). ${LOCAL_IMAGE_HINT}`);
  }

  const picked = pickBestInstalledImageModel(installed);
  if (picked) {
    console.info('[image] auto-selected local image model', { model: picked });
    return picked;
  }

  const sample = installed.slice(0, 6).join(', ') || 'none';
  throw new Error(`No image generation model installed locally (${sample}). ${LOCAL_IMAGE_HINT}`);
}

module.exports = {
  resolveImageModel,
  resolveCloudImageModel,
  CLOUD_IMAGE_FALLBACK,
  LOCAL_IMAGE_HINT,
  CLOUD_IMAGE_HINT,
};
