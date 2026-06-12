/**
 * Quiz & study illustrations via Ollama POST /api/generate → base64 image field.
 * Works with Ollama Cloud (Admin → API key) or local Ollama when image models are pulled.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CLOUD_BASE_URL } = require('./ollamaCloudSettings');
const { getOllamaRuntimeConfig } = require('./ollamaClient');
const { resolveImageModel, CLOUD_IMAGE_FALLBACK } = require('./ollamaImageModel');

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

async function assertImageGenReady() {
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
  let model = await resolveImageModel();
  if (DEPRECATED_IMAGE_MODELS.has(model) || model.startsWith('gemini-')) {
    console.warn('[quiz-images] deprecated image model; using x/z-image-turbo', { requested: model });
    model = 'x/z-image-turbo';
  }
  return { runtime, model };
}

async function generateViaOllama(prompt, model, runtime) {
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
    const notFound =
      res.status === 404 &&
      /model.*not found/i.test(text) &&
      model !== CLOUD_IMAGE_FALLBACK &&
      runtime.mode === 'cloud';
    if (notFound) {
      console.warn('[quiz-images] model not found on Ollama Cloud; retrying', {
        requested: model,
        fallback: CLOUD_IMAGE_FALLBACK,
      });
      return generateViaOllama(prompt, CLOUD_IMAGE_FALLBACK, runtime);
    }
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
  const { runtime, model } = await assertImageGenReady();
  return generateViaOllama(prompt, model, runtime);
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
};
