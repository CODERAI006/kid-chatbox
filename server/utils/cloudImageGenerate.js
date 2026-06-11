/**
 * Quiz & study illustrations via Ollama POST /api/generate → base64 image field.
 * Works with Ollama Cloud (Admin → API key) or local Ollama when image models are pulled.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CLOUD_BASE_URL, getConfiguredModel } = require('./ollamaCloudSettings');
const { getOllamaRuntimeConfig } = require('./ollamaClient');

const DEFAULT_CLOUD_IMAGE_MODEL = 'x/z-image-turbo';
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

function assertImageGenReady() {
  const runtime = getOllamaRuntimeConfig();
  if (!runtime.configured) {
    throw new Error(
      'Image generation requires Ollama. Enable Ollama Cloud in Admin or run local Ollama with an image model pulled.'
    );
  }
  if (runtime.mode === 'cloud' && !runtime.headers?.Authorization) {
    throw new Error(
      'Ollama Cloud is enabled but no API key is set. Add a key in Admin → Ollama Cloud.'
    );
  }
  const model = resolveImageModel();
  if (!model) {
    throw new Error(
      'No image model configured. Set Admin → Ollama Cloud → Image generation or OLLAMA_IMAGE_MODEL.'
    );
  }
  return runtime;
}

async function generateViaOllama(prompt, model) {
  const runtime = assertImageGenReady();
  const base = (runtime.mode === 'cloud' ? CLOUD_BASE_URL : runtime.baseUrl).replace(/\/$/, '');
  const url = `${base}/api/generate`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...runtime.headers },
    body: JSON.stringify({ model, prompt, stream: false }),
    signal: createTimeoutSignal(IMAGE_TIMEOUT_MS),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Ollama image API ${res.status}: ${text.slice(0, 280)}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Ollama returned non-JSON image response');
  }

  const imageB64 = data?.image;
  if (!imageB64 || typeof imageB64 !== 'string') {
    throw new Error(`Ollama model "${model}" returned no image data`);
  }

  const buffer = Buffer.from(imageB64, 'base64');
  if (buffer.length < 500) {
    throw new Error('Ollama returned an empty or invalid image');
  }

  const provider = runtime.mode === 'cloud' ? 'ollama-cloud' : 'ollama-local';
  return { buffer, provider, model: data.model || model };
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
  return generateViaOllama(prompt, model);
}

/** @param {string} prompt */
async function generateQuizQuestionImage(prompt) {
  const { buffer, provider, model } = await cloudGenerateImage(prompt);
  const imageUrl = saveQuizImageBuffer(buffer);
  console.info('[quiz-images] saved', { provider, model, imageUrl });
  return imageUrl;
}

module.exports = {
  generateQuizQuestionImage,
  cloudGenerateImage,
  saveQuizImageBase64,
  resolveImageModel,
};
