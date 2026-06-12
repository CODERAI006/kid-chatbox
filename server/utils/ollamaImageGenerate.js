/**
 * Quiz & study image entry point — photorealistic photos via Ollama Cloud API key.
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
