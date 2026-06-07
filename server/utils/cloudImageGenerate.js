/**
 * Quiz illustrations via Ollama Cloud only (POST /api/generate → base64 image field).
 * Requires Admin → Ollama Cloud enabled with a valid API key.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CLOUD_BASE_URL, getConfiguredModel } = require('./ollamaCloudSettings');
const { getOllamaRuntimeConfig } = require('./ollamaClient');

const DEFAULT_CLOUD_IMAGE_MODEL = 'flux:cloud';
const DEPRECATED_IMAGE_MODELS = new Set(['gemini-2.5-flash-image', 'gemini-3.1-flash-image']);
const UPLOAD_DIR = path.join(__dirname, '../../uploads/quiz-images');
const IMAGE_TIMEOUT_MS = Number(process.env.QUIZ_IMAGE_TIMEOUT_MS) || 180_000;

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

function resolveImageModel() {
  const fromEnv = (process.env.OLLAMA_IMAGE_MODEL || '').trim();
  const fromAdmin = (getConfiguredModel('image') || '').trim();
  const raw = fromEnv || fromAdmin || DEFAULT_CLOUD_IMAGE_MODEL;
  if (DEPRECATED_IMAGE_MODELS.has(raw) || raw.startsWith('gemini-')) {
    console.warn('[quiz-images] deprecated image model; using Ollama Cloud default', {
      requested: raw,
      using: DEFAULT_CLOUD_IMAGE_MODEL,
    });
    return DEFAULT_CLOUD_IMAGE_MODEL;
  }
  return raw;
}

function assertOllamaCloudReady() {
  const runtime = getOllamaRuntimeConfig();
  if (runtime.mode !== 'cloud' || !runtime.configured) {
    throw new Error(
      'Quiz images require Ollama Cloud. Enable it and set an API key in Admin → Ollama Cloud.'
    );
  }
  return runtime;
}

async function generateViaOllamaCloud(prompt, model) {
  const runtime = assertOllamaCloudReady();
  const url = `${CLOUD_BASE_URL}/api/generate`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...runtime.headers },
    body: JSON.stringify({ model, prompt, stream: false }),
    signal: createTimeoutSignal(IMAGE_TIMEOUT_MS),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Ollama Cloud image API ${res.status}: ${text.slice(0, 280)}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Ollama Cloud returned non-JSON image response');
  }

  const imageB64 = data?.image;
  if (!imageB64 || typeof imageB64 !== 'string') {
    throw new Error(`Ollama Cloud model "${model}" returned no image data`);
  }

  const buffer = Buffer.from(imageB64, 'base64');
  if (buffer.length < 500) {
    throw new Error('Ollama Cloud returned an empty or invalid image');
  }

  return { buffer, provider: 'ollama-cloud', model: data.model || model };
}

function saveQuizImageBuffer(buffer) {
  ensureUploadDir();
  const filename = `${crypto.randomUUID()}.png`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/quiz-images/${filename}`;
}

function saveQuizImageBase64(base64) {
  return saveQuizImageBuffer(Buffer.from(base64, 'base64'));
}

async function cloudGenerateImage(prompt) {
  const model = resolveImageModel();
  return generateViaOllamaCloud(prompt, model);
}

/** @param {string} prompt */
async function generateQuizQuestionImage(prompt) {
  const { buffer, provider, model } = await cloudGenerateImage(prompt);
  const imageUrl = saveQuizImageBuffer(buffer);
  console.info('[quiz-images] ollama cloud save', { provider, model, imageUrl });
  return imageUrl;
}

module.exports = {
  generateQuizQuestionImage,
  cloudGenerateImage,
  saveQuizImageBase64,
  resolveImageModel,
};
