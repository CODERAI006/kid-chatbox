/**
 * Quiz image entry point — Ollama Cloud only via /api/generate.
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
