/**
 * Ollama model types — defaults, env overrides, and admin presets per capability.
 */

const OLLAMA_MODEL_TYPES = [
  {
    id: 'text',
    label: 'Text / Chat',
    description: 'Quiz generation, study lessons, learning bot',
    emoji: '💬',
    defaultCloud: 'gpt-oss:120b',
    defaultLocal: 'llama3.2:latest',
    envVar: 'OLLAMA_MODEL',
    implemented: true,
    presets: [
      { id: 'gpt-oss:120b', label: 'GPT-OSS 120B Cloud' },
      { id: 'qwen3:235b-cloud', label: 'Qwen3 235B Cloud' },
      { id: 'deepseek-v3.1:671b-cloud', label: 'DeepSeek V3.1 Cloud' },
    ],
  },
  {
    id: 'ocr',
    label: 'OCR / Vision',
    description: 'Read textbook photos, diagrams, worksheets',
    emoji: '📷',
    defaultCloud: 'qwen3-vl:235b-cloud',
    defaultLocal: 'qwen3-vl',
    envVar: 'OLLAMA_VISION_MODEL',
    implemented: true,
    presets: [
      { id: 'qwen3-vl:235b-cloud', label: 'Qwen3-VL Cloud (recommended)' },
      { id: 'qwen3-vl:235b-instruct-cloud', label: 'Qwen3-VL Instruct Cloud' },
      { id: 'gemma4:31b-cloud', label: 'Gemma 4 Cloud' },
      { id: 'qwen2.5vl:7b', label: 'Qwen2.5-VL 7B (local)' },
    ],
  },
  {
    id: 'image',
    label: 'Image generation',
    description:
      'Study lesson (hero + gallery) and quiz illustrations via Ollama /api/generate. Pick speed vs quality; override with OLLAMA_IMAGE_MODEL.',
    emoji: '🖼️',
    defaultCloud: 'x/z-image-turbo',
    defaultLocal: 'x/z-image-turbo',
    envVar: 'OLLAMA_IMAGE_MODEL',
    implemented: true,
    presets: [
      { id: 'x/z-image-turbo', label: 'Z-Image Turbo — fastest (official Ollama default)' },
      { id: 'x/flux2-klein:4b', label: 'FLUX.2 Klein 4B — quality + speed (Apache 2.0)' },
      { id: 'x/flux2-klein:9b', label: 'FLUX.2 Klein 9B — highest FLUX.2 quality' },
      { id: 'flux:cloud', label: 'FLUX Cloud — hosted FLUX' },
      { id: 'flux-dev', label: 'FLUX.1 Dev — best open-source quality (ollama pull)' },
      { id: 'flux-schnell', label: 'FLUX.1 Schnell — fast FLUX.1 (ollama pull)' },
      { id: 'sdxl', label: 'SDXL — mature ecosystem (ollama pull)' },
    ],
  },
  {
    id: 'voice',
    label: 'Voice / TTS',
    description: 'Audio narration and spoken lessons',
    emoji: '🔊',
    defaultCloud: '',
    defaultLocal: '',
    envVar: 'OLLAMA_VOICE_MODEL',
    implemented: false,
    presets: [],
  },
  {
    id: 'pdf',
    label: 'PDF / Documents',
    description: 'Structured worksheets and export layouts',
    emoji: '📄',
    defaultCloud: '',
    defaultLocal: '',
    envVar: 'OLLAMA_PDF_MODEL',
    implemented: false,
    presets: [],
  },
];

const TYPE_BY_ID = Object.fromEntries(OLLAMA_MODEL_TYPES.map((t) => [t.id, t]));

function getModelTypeDefinition(typeId) {
  return TYPE_BY_ID[typeId] || null;
}

function buildDefaultProfiles(mode = 'cloud') {
  const out = {};
  for (const t of OLLAMA_MODEL_TYPES) {
    out[t.id] = mode === 'cloud' ? t.defaultCloud : t.defaultLocal;
  }
  return out;
}

function normalizeProfiles(raw, legacy = {}) {
  const base = buildDefaultProfiles('cloud');
  const merged = { ...base, ...legacy };
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const t of OLLAMA_MODEL_TYPES) {
      const v = raw[t.id];
      if (typeof v === 'string') merged[t.id] = v.trim();
    }
  }
  return merged;
}

/**
 * Resolve model for a capability. Env var wins, then admin profile, then default.
 * @param {'text'|'ocr'|'image'|'voice'|'pdf'} typeId
 * @param {{ mode: 'cloud'|'local', profiles: Record<string, string> }} ctx
 */
function resolveModelForType(typeId, ctx) {
  const def = getModelTypeDefinition(typeId);
  if (!def) return '';

  const envVal = (process.env[def.envVar] || '').trim();
  if (envVal) return envVal;

  const profileVal = (ctx.profiles?.[typeId] || '').trim();
  if (profileVal) return profileVal;

  return ctx.mode === 'cloud' ? def.defaultCloud : def.defaultLocal;
}

function getAdminModelCatalog() {
  return OLLAMA_MODEL_TYPES.map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
    emoji: t.emoji,
    envVar: t.envVar,
    implemented: t.implemented,
    defaultCloud: t.defaultCloud,
    defaultLocal: t.defaultLocal,
    presets: t.presets,
  }));
}

module.exports = {
  OLLAMA_MODEL_TYPES,
  getModelTypeDefinition,
  buildDefaultProfiles,
  normalizeProfiles,
  resolveModelForType,
  getAdminModelCatalog,
};
