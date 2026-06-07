/**
 * Attach AI-generated illustrations to ~20% of quiz questions.
 */
const { generateQuizQuestionImage } = require('./ollamaImageGenerate');

const DEFAULT_FRACTION = 0.2;

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

  for (const idx of indices) {
    const q = questions[idx];
    try {
      const prompt = buildImagePrompt(q, ctx);
      const imageUrl = await generateQuizQuestionImage(prompt);
      enriched[idx] = { ...enriched[idx], imageUrl };
      console.info('[quiz-images] saved', { question: idx + 1, imageUrl });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[quiz-images] skipped question', idx + 1, msg);
    }
  }

  return enriched;
}

module.exports = {
  enrichQuestionsWithImages,
  selectImageQuestionIndices,
  buildImagePrompt,
  getImageFraction,
};
