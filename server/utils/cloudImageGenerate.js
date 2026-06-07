/**
 * Cloud-only quiz illustration generation (no local Ollama image pulls).
 * Primary: Google Gemini Image API. Fallback: Pollinations (cloud, no API key).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getConfiguredModel } = require('./ollamaCloudSettings');

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-image';
const LEGACY_OLLAMA_IMAGE_MODELS = new Set(['flux', 'flux:cloud', 'gemma4:31b-cloud']);
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
  const raw = fromEnv || fromAdmin;
  if (!raw || LEGACY_OLLAMA_IMAGE_MODELS.has(raw)) {
    return DEFAULT_GEMINI_MODEL;
  }
  if (raw.startsWith('gemini-')) return raw;
  return DEFAULT_GEMINI_MODEL;
}

function getProvider() {
  const mode = (process.env.QUIZ_IMAGE_PROVIDER || 'auto').trim().toLowerCase();
  if (mode === 'pollinations') return 'pollinations';
  return 'gemini';
}

async function generateViaGemini(prompt, model) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set (required for Gemini cloud image generation).');
  }

  const res = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
    signal: createTimeoutSignal(IMAGE_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini image API ${res.status}: ${text.slice(0, 280)}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data) return part.inlineData.data;
  }
  throw new Error('Gemini returned no image data');
}

async function generateViaPollinations(prompt) {
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    '?width=512&height=512&nologo=true&enhance=false';
  const res = await fetch(url, { signal: createTimeoutSignal(IMAGE_TIMEOUT_MS) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pollinations image ${res.status}: ${text.slice(0, 200)}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 500) {
    throw new Error('Pollinations returned an empty or invalid image');
  }
  return buffer;
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
  const provider = getProvider();
  const model = resolveImageModel();

  if (provider === 'gemini') {
    const base64 = await generateViaGemini(prompt, model);
    return { buffer: Buffer.from(base64, 'base64'), provider: 'gemini', model };
  }

  const buffer = await generateViaPollinations(prompt);
  return { buffer, provider: 'pollinations', model: 'pollinations' };
}

/** @param {string} prompt */
async function generateQuizQuestionImage(prompt) {
  const { buffer, provider, model } = await cloudGenerateImage(prompt);
  const imageUrl = saveQuizImageBuffer(buffer);
  console.info('[quiz-images] cloud save', { provider, model, imageUrl });
  return imageUrl;
}

module.exports = {
  generateQuizQuestionImage,
  cloudGenerateImage,
  saveQuizImageBase64,
  resolveImageModel,
  getProvider,
};
