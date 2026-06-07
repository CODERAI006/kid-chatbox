/**
 * Resolve Ollama vision model for page-image OCR (quiz from photos).
 */
const { getOllamaRuntimeConfig, listOllamaModels } = require('./ollamaClient');
const { getConfiguredModel } = require('./ollamaCloudSettings');

const LOCAL_VISION_HINT =
  'Install a local vision model: `ollama pull qwen3-vl` or set OLLAMA_VISION_MODEL in Admin → Ollama Cloud.';

const CLOUD_VISION_HINT =
  'Set OCR model in Admin → Ollama Cloud (e.g. qwen3-vl:235b-cloud) or OLLAMA_VISION_MODEL in .env.';

const LOCAL_VISION_MODEL_PREFERENCES = [
  'qwen3-vl',
  'qwen2.5vl',
  'gemma4',
  'gemma3',
  'moondream',
  'llava',
  'minicpm-v',
  'llama3.2-vision',
  'bakllava',
];

const CLOUD_VISION_MODEL_OPTIONS = [
  { id: 'qwen3-vl:235b-cloud', label: 'Qwen3-VL Cloud (recommended)', note: 'Best OCR, diagrams, charts' },
  { id: 'qwen3-vl:235b-instruct-cloud', label: 'Qwen3-VL Instruct Cloud', note: 'Documents and UI' },
  { id: 'gemma4:31b-cloud', label: 'Gemma 4 Cloud', note: 'Faster multimodal' },
];

function isVisionModelName(name) {
  const n = String(name || '').toLowerCase();
  return LOCAL_VISION_MODEL_PREFERENCES.some((p) => n.includes(p));
}

function scoreVisionModel(name) {
  const lower = String(name || '').toLowerCase();
  for (let i = 0; i < LOCAL_VISION_MODEL_PREFERENCES.length; i++) {
    if (lower.includes(LOCAL_VISION_MODEL_PREFERENCES[i])) return i;
  }
  return 999;
}

function pickBestInstalledVisionModel(installed) {
  const vision = installed.filter(isVisionModelName);
  if (vision.length === 0) return null;
  vision.sort((a, b) => scoreVisionModel(a) - scoreVisionModel(b));
  return vision[0];
}

function modelMatchesInstalled(requested, installed) {
  const req = String(requested || '').toLowerCase();
  return installed.some((name) => {
    const n = name.toLowerCase();
    return n === req || n.startsWith(`${req}:`) || req.startsWith(`${n}:`);
  });
}

async function resolveVisionModel() {
  const runtime = getOllamaRuntimeConfig();
  const configured = getConfiguredModel('ocr');

  if (runtime.mode === 'cloud') {
    if (!runtime.configured) {
      throw new Error(
        'Ollama Cloud is enabled but no API key is configured. Add a key in Admin → Ollama Cloud.'
      );
    }
    if (!configured) {
      throw new Error(`No OCR model configured. ${CLOUD_VISION_HINT}`);
    }
    console.info('[vision] using Ollama Cloud OCR model', { model: configured });
    return configured;
  }

  if (configured && !process.env.OLLAMA_VISION_MODEL) {
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

  const envOnly = (process.env.OLLAMA_VISION_MODEL || '').trim();
  if (envOnly) {
    let installed = [];
    try {
      installed = await listOllamaModels();
    } catch {
      return envOnly;
    }
    if (installed.length === 0 || modelMatchesInstalled(envOnly, installed)) return envOnly;
    throw new Error(
      `Vision model "${envOnly}" is not installed. Run \`ollama pull ${envOnly.split(':')[0]}\`. ${LOCAL_VISION_HINT}`
    );
  }

  let installed = [];
  try {
    installed = await listOllamaModels();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not list Ollama models (${msg}). ${LOCAL_VISION_HINT}`);
  }

  const picked = pickBestInstalledVisionModel(installed);
  if (picked) return picked;

  const sample = installed.slice(0, 6).join(', ') || 'none';
  throw new Error(
    `No vision model installed locally (${sample}). ${LOCAL_VISION_HINT}`
  );
}

module.exports = {
  resolveVisionModel,
  isVisionModelName,
  CLOUD_VISION_MODEL_OPTIONS,
  VISION_MODEL_HINT: LOCAL_VISION_HINT,
  CLOUD_VISION_HINT,
};
