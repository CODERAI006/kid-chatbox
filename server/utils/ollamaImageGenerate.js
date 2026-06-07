/**
 * Quiz image entry point — delegates to cloud-only generation (no local Ollama image models).
 */
const {
  generateQuizQuestionImage,
  cloudGenerateImage,
  saveQuizImageBase64,
} = require('./cloudImageGenerate');

/** @deprecated Use cloudGenerateImage; kept for callers expecting base64 from Ollama. */
async function ollamaGenerateImage({ prompt }) {
  const { buffer } = await cloudGenerateImage(prompt);
  return buffer.toString('base64');
}

module.exports = {
  generateQuizQuestionImage,
  ollamaGenerateImage,
  saveQuizImageBase64,
};
