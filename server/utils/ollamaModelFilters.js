/**
 * Heuristic filters for Ollama /api/tags model names by capability.
 */

const IMAGE_HINTS = ['flux', 'z-image', 'sdxl', 'stable-diffusion', 'dall', 'image-turbo'];
const VISION_HINTS = ['-vl', 'vision', 'llava', 'moondream', 'minicpm', 'bakllava', 'gemma4', 'gemma3'];

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

function isLikelyImageModel(name) {
  const n = normalizeName(name);
  return IMAGE_HINTS.some((h) => n.includes(h));
}

function isLikelyVisionModel(name) {
  const n = normalizeName(name);
  return VISION_HINTS.some((h) => n.includes(h));
}

/** @param {string} name @param {'text'|'ocr'|'image'|'voice'|'pdf'} typeId */
function modelMatchesType(name, typeId) {
  const n = normalizeName(name);
  if (!n) return false;

  if (typeId === 'image') return isLikelyImageModel(n);
  if (typeId === 'ocr') return isLikelyVisionModel(n);
  if (typeId === 'voice') return n.includes('tts') || n.includes('voice') || n.includes('speech');
  if (typeId === 'pdf') return false;

  // text: exclude obvious image-only generators; allow vision models for chat fallback
  return !isLikelyImageModel(n);
}

/** @param {string[]} names @param {'text'|'ocr'|'image'|'voice'|'pdf'} typeId */
function filterModelsForType(names, typeId) {
  const filtered = names.filter((n) => modelMatchesType(n, typeId));
  return filtered.length > 0 ? filtered.sort() : [...names].sort();
}

module.exports = {
  filterModelsForType,
  isLikelyImageModel,
  isLikelyVisionModel,
};
