/**
 * Ollama image generation (POST /api/generate) for quiz illustrations.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getResolvedOllamaConfig, getConfiguredModel } = require('./ollamaCloudSettings');

const DEFAULT_HOST = 'http://127.0.0.1:11434';
const UPLOAD_DIR = path.join(__dirname, '../../uploads/quiz-images');
const IMAGE_TIMEOUT_MS = Number(process.env.OLLAMA_IMAGE_TIMEOUT_MS) || 180_000;

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function createTimeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/**
 * @param {{ prompt: string, width?: number, height?: number, steps?: number }} params
 * @returns {Promise<string>} base64 PNG
 */
async function ollamaGenerateImage({ prompt, width = 512, height = 512, steps = 4 }) {
  const localBase = (process.env.OLLAMA_HOST || process.env.OLLAMA_BASE_URL || DEFAULT_HOST).replace(
    /\/$/,
    ''
  );
  const localModel = (process.env.OLLAMA_MODEL || 'llama3.2:latest').trim();
  const runtime = getResolvedOllamaConfig(localBase, localModel);
  const model =
    getConfiguredModel('image') || (runtime.mode === 'cloud' ? 'flux:cloud' : 'flux');

  if (!model) {
    throw new Error('No image model configured (Admin → Ollama Cloud → Image, or OLLAMA_IMAGE_MODEL).');
  }
  if (runtime.mode === 'cloud' && !runtime.configured) {
    throw new Error('Ollama Cloud API key required for cloud image generation.');
  }

  const res = await fetch(`${runtime.baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...runtime.headers },
    body: JSON.stringify({ model, prompt, stream: false, width, height, steps }),
    signal: createTimeoutSignal(IMAGE_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Image API ${res.status}: ${text.slice(0, 280)}`);
  }

  const data = await res.json();
  if (!data.image) {
    throw new Error('Image model returned no image field');
  }
  return data.image;
}

function saveQuizImageBase64(base64) {
  ensureUploadDir();
  const filename = `${crypto.randomUUID()}.png`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), Buffer.from(base64, 'base64'));
  return `/uploads/quiz-images/${filename}`;
}

/** @param {string} prompt */
async function generateQuizQuestionImage(prompt) {
  const base64 = await ollamaGenerateImage({ prompt });
  return saveQuizImageBase64(base64);
}

module.exports = { generateQuizQuestionImage, ollamaGenerateImage, saveQuizImageBase64 };
