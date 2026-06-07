/**
 * Resolve an Ollama vision model for page-image OCR (quiz from photos).
 */
const { getOllamaRuntimeConfig, listOllamaModels } = require('./ollamaClient');

const VISION_HINT =
  'Install a vision model in Ollama, then retry. Recommended: `ollama pull moondream` (small) or `ollama pull llava`. ' +
  'Optional: set OLLAMA_VISION_MODEL in .env to your model name.';

/** Preferred order when auto-picking from installed models. */
const VISION_MODEL_PREFERENCES = [
  'moondream',
  'llava',
  'minicpm-v',
  'llama3.2-vision',
  'bakllava',
  'qwen2.5vl',
  'qwen3-vl',
  'gemma3',
  'mistral-small3.1',
];

function isVisionModelName(name) {
  const n = String(name || '').toLowerCase();
  return VISION_MODEL_PREFERENCES.some((p) => n.includes(p));
}

function scoreVisionModel(name) {
  const lower = String(name || '').toLowerCase();
  for (let i = 0; i < VISION_MODEL_PREFERENCES.length; i++) {
    if (lower.includes(VISION_MODEL_PREFERENCES[i])) return i;
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

/**
 * @returns {Promise<string>}
 */
async function resolveVisionModel() {
  const configured = (process.env.OLLAMA_VISION_MODEL || '').trim();
  let installed = [];
  try {
    installed = await listOllamaModels();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (configured) return configured;
    throw new Error(`Could not list Ollama models (${msg}). ${VISION_HINT}`);
  }

  if (configured) {
    if (installed.length === 0 || modelMatchesInstalled(configured, installed)) {
      return configured;
    }
    throw new Error(
      `Vision model "${configured}" is not installed. Run \`ollama pull ${configured.split(':')[0]}\`. ${VISION_HINT}`
    );
  }

  const picked = pickBestInstalledVisionModel(installed);
  if (picked) return picked;

  const runtime = getOllamaRuntimeConfig();
  const sample = installed.slice(0, 6).join(', ') || 'none';
  throw new Error(
    `No vision model is installed in Ollama (${runtime.mode}). ` +
      `Your text models (${sample}) cannot read page photos. ${VISION_HINT}`
  );
}

module.exports = {
  resolveVisionModel,
  isVisionModelName,
  VISION_MODEL_HINT: VISION_HINT,
};
