/**
 * Photorealistic study/quiz images via Ollama Cloud only (Admin API key).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { wrapLlmImagePrompt } = require('../utils/educationalImagePrompt');
const { resolveOllamaImageRuntime } = require('../utils/ollamaImageRuntime');
const { getOllamaRuntimeConfig } = require('../utils/ollamaClient');

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

function saveImageBuffer(buffer, ext = 'png') {
  ensureUploadDir();
  const filename = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/quiz-images/${filename}`;
}

function getStatus() {
  const runtime = getOllamaRuntimeConfig();
  const model = (process.env.OLLAMA_IMAGE_MODEL || 'x/z-image-turbo').trim();
  return {
    configured: runtime.configured,
    provider: runtime.mode === 'cloud' ? 'ollama-cloud' : 'ollama-local',
    model,
    photorealistic: true,
    message: runtime.configured
      ? 'Photorealistic images via Ollama Cloud (Admin API key)'
      : 'Enable Ollama Cloud and set your API key in Admin',
  };
}

async function generateViaOllamaGenerate(prompt, imageRuntime) {
  const { baseUrl, headers, model } = imageRuntime;
  const url = `${String(baseUrl).replace(/\/$/, '')}/api/generate`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        width: Number(process.env.OLLAMA_IMAGE_WIDTH) || 1024,
        height: Number(process.env.OLLAMA_IMAGE_HEIGHT) || 576,
      },
    }),
    signal: createTimeoutSignal(IMAGE_TIMEOUT_MS),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Ollama image API ${res.status}: ${text.slice(0, 320)}`);
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

  return { buffer, provider: 'ollama-cloud', model: data.model || model, prompt };
}

/**
 * @param {string} prompt
 * @param {{ topic?: string, subject?: string, gradeLevel?: string, save?: boolean }} [opts]
 */
async function generateImage(prompt, opts = {}) {
  const imageRuntime = await resolveOllamaImageRuntime();
  const finalPrompt = wrapLlmImagePrompt(prompt, opts);
  const { buffer, provider, model } = await generateViaOllamaGenerate(finalPrompt, imageRuntime);
  const imageUrl = opts.save !== false ? saveImageBuffer(buffer, 'png') : null;
  return { imageUrl, buffer, provider, model, prompt: finalPrompt };
}

async function generateDemoImage(prompt) {
  const label = String(prompt || 'Educational scene').slice(0, 80);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="576" viewBox="0 0 1024 576">
    <rect width="100%" height="100%" fill="#1a365d"/>
    <text x="50%" y="48%" fill="#fff" font-size="32" text-anchor="middle" font-family="sans-serif">Demo placeholder</text>
    <text x="50%" y="58%" fill="#bee3f8" font-size="18" text-anchor="middle" font-family="sans-serif">${label.replace(/[<>&"]/g, '')}</text>
  </svg>`;
  const imageUrl = saveImageBuffer(Buffer.from(svg, 'utf8'), 'svg');
  return { imageUrl, provider: 'demo', model: 'placeholder', prompt: label };
}

module.exports = {
  getStatus,
  generateImage,
  generateDemoImage,
  saveImageBuffer,
};
