/**
 * Quiz & study images — Ollama Cloud first, Pollinations.ai URL fallback.
 */
const { generateImage } = require('../services/imageGenerationService');
const {
  getPollinationsImageUrl,
  isPollinationsFallbackEnabled,
} = require('./pollinationsImageUrl');

/** @param {string} prompt — LLM imagePrompt or scene description */
async function cloudGenerateImage(prompt, ctx = {}) {
  const result = await generateImage(prompt, { ...ctx, save: false });
  return { buffer: result.buffer, provider: result.provider, model: result.model };
}

/**
 * @param {string} prompt
 * @param {{ topic?: string, subject?: string, gradeLevel?: string }} [ctx]
 */
async function generateQuizQuestionImage(prompt, ctx = {}) {
  try {
    const result = await generateImage(prompt, { ...ctx, save: true });
    console.info('[quiz-images] saved', {
      provider: result.provider,
      model: result.model,
      imageUrl: result.imageUrl,
      imagePrompt: String(result.prompt || prompt).slice(0, 200),
    });
    return { imageUrl: result.imageUrl, imagePrompt: result.prompt || prompt };
  } catch (err) {
    if (!isPollinationsFallbackEnabled()) throw err;
    const imageUrl = getPollinationsImageUrl(prompt);
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[quiz-images] Ollama failed; using Pollinations fallback', {
      error: msg,
      imagePrompt: String(prompt).slice(0, 200),
      imageUrl,
    });
    return { imageUrl, imagePrompt: prompt };
  }
}

function saveQuizImageBase64(base64) {
  const { saveImageBuffer } = require('../services/imageGenerationService');
  return saveImageBuffer(Buffer.from(base64, 'base64'), 'png');
}

module.exports = {
  generateQuizQuestionImage,
  cloudGenerateImage,
  saveQuizImageBase64,
};
