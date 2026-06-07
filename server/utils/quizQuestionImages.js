/**
 * Attach AI-generated illustrations to ~20% of quiz questions.
 */
const { generateQuizQuestionImage } = require('./ollamaImageGenerate');
const { sanitizeOllamaImageUrl } = require('./ollamaImageUrl');

const DEFAULT_FRACTION = 0.2;
const IMAGE_CONCURRENCY = Math.min(3, Math.max(1, Number(process.env.QUIZ_IMAGE_CONCURRENCY) || 2));

function getImageFraction() {
  const n = Number(process.env.QUIZ_IMAGE_FRACTION);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : DEFAULT_FRACTION;
}

/** Evenly spread indices so visuals appear throughout the quiz. */
function selectImageQuestionIndices(totalCount, fraction = getImageFraction()) {
  if (totalCount < 1) return [];
  const target = Math.max(1, Math.round(totalCount * fraction));
  const indices = [];
  const step = totalCount / target;
  for (let i = 0; i < target; i++) {
    indices.push(Math.min(totalCount - 1, Math.floor(i * step + step / 2)));
  }
  return [...new Set(indices)];
}

function buildImagePrompt(question, ctx = {}) {
  const subject = String(ctx.subject || 'school subject').trim();
  const grade = ctx.gradeLevel ? `Grade ${ctx.gradeLevel}. ` : '';
  const qText = String(question.question || '').replace(/\s+/g, ' ').slice(0, 220);
  return (
    `${grade}Bright child-friendly educational illustration for a quiz. Subject: ${subject}. ` +
    `Visual scene related to: ${qText}. Clean colorful diagram, simple background, ` +
    `no text or letters in the image, suitable for children.`
  );
}

/**
 * @param {Array<{ question: string, options: object, correctAnswer: string, explanation: string, number?: number }>} questions
 * @param {{ subject?: string, gradeLevel?: string }} ctx
 */
async function enrichQuestionsWithImages(questions, ctx = {}) {
  if (!Array.isArray(questions) || questions.length === 0) return questions;

  const indices = selectImageQuestionIndices(questions.length);
  console.info('[quiz-images] generating illustrations', {
    total: questions.length,
    target: indices.length,
    indices: indices.map((i) => i + 1),
  });

  const enriched = questions.map((q) => ({ ...q, imageUrl: null }));

  const generateOne = async (idx) => {
    const q = questions[idx];
    try {
      const prompt = buildImagePrompt(q, ctx);
      const imageUrl = sanitizeOllamaImageUrl(await generateQuizQuestionImage(prompt));
      if (!imageUrl) return false;
      enriched[idx] = { ...enriched[idx], imageUrl };
      console.info('[quiz-images] saved', { question: idx + 1, imageUrl });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[quiz-images] skipped question', idx + 1, msg);
      return false;
    }
  };

  let cursor = 0;
  const workers = Array.from({ length: Math.min(IMAGE_CONCURRENCY, indices.length) }, async () => {
    while (cursor < indices.length) {
      const slot = cursor++;
      await generateOne(indices[slot]);
    }
  });
  await Promise.all(workers);

  const saved = enriched.filter((q) => q.imageUrl).length;
  console.info('[quiz-images] complete', { requested: indices.length, saved });
  if (indices.length > 0 && saved === 0) {
    console.warn(
      '[quiz-images] no illustrations saved — enable Ollama Cloud and set an image model in Admin → Ollama Cloud'
    );
  }

  return enriched;
}

module.exports = {
  enrichQuestionsWithImages,
  selectImageQuestionIndices,
  buildImagePrompt,
  getImageFraction,
};
