/**
 * Extract readable text from quiz page photos via Ollama vision models.
 */
const { ollamaChat, isLlmConfigured, getOllamaRuntimeConfig } = require('./ollamaClient');
const { resolveVisionModel } = require('./ollamaVisionModel');

const MAX_PAGES = 2;
const MAX_BASE64_CHARS = 6 * 1024 * 1024;

function normalizeBase64Images(images) {
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('At least one page image is required');
  }
  if (images.length > MAX_PAGES) {
    throw new Error(`Maximum ${MAX_PAGES} page images allowed`);
  }
  const out = [];
  for (let i = 0; i < images.length; i++) {
    const raw = String(images[i] || '').trim();
    if (!raw) {
      throw new Error(`Page ${i + 1} image is empty`);
    }
    const base64 = raw.includes(',') ? raw.split(',').pop() : raw;
    if (!base64 || base64.length < 32) {
      throw new Error(`Page ${i + 1} image data is invalid`);
    }
    if (base64.length > MAX_BASE64_CHARS) {
      throw new Error(`Page ${i + 1} image is too large after encoding`);
    }
    out.push(base64);
  }
  return out;
}

/**
 * @param {string[]} base64Images raw base64 strings (no data-URI prefix)
 * @returns {Promise<string>}
 */
async function extractTextFromQuizPages(base64Images) {
  if (!isLlmConfigured()) {
    throw new Error('Ollama is disabled. Enable Ollama to read page images.');
  }

  const images = normalizeBase64Images(base64Images);
  const model = await resolveVisionModel();
  const runtime = getOllamaRuntimeConfig();
  console.info('[quiz-image] using vision model', { model, mode: runtime.mode, pages: images.length });

  const { content } = await ollamaChat({
    model,
    messages: [
      {
        role: 'user',
        content: `You are an OCR assistant for children's study material.
Extract ALL readable text from these ${images.length} page image(s) in order (page 1 to ${images.length}).
Include headings, paragraphs, bullet points, captions, and question text if present.
Preserve meaning; fix obvious OCR spacing only.
If a page has diagrams, briefly describe labels that matter for learning.
Output plain text only — no JSON, no markdown fences.
Separate pages with a line: --- Page N ---`,
        images,
      },
    ],
    temperature: 0.1,
    num_predict: 8192,
    logContext: 'quiz.extractTextFromPages',
    requestTimeoutMs: 600_000,
  });

  const text = String(content || '').trim();
  if (text.length < 40) {
    throw new Error(
      'Could not read enough text from the uploaded pages. Use clearer photos with readable text.'
    );
  }
  return text.slice(0, 24_000);
}

module.exports = {
  extractTextFromQuizPages,
  normalizeBase64Images,
  MAX_QUIZ_PAGE_IMAGES: MAX_PAGES,
};
