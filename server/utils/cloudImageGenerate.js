/**
 * Quiz & study images — photorealistic generation via Ollama Cloud API key only.
 */
const { generateImage } = require('../services/imageGenerationService');

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
  const result = await generateImage(prompt, { ...ctx, save: true });
  console.info('[quiz-images] saved', {
    provider: result.provider,
    model: result.model,
    imageUrl: result.imageUrl,
  });
  return result.imageUrl;
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
