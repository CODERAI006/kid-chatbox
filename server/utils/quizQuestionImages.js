/**
 * Attach Ollama Cloud illustrations to quiz questions the text LLM marks as visual.
 */
const { generateQuizQuestionImage } = require('./ollamaImageGenerate');
const { wrapLlmImagePrompt, expandKeywordToImagePrompt } = require('./educationalImagePrompt');
const { sanitizeOllamaImageUrl } = require('./ollamaImageUrl');

const DEFAULT_FRACTION = 0.2;
const IMAGE_CONCURRENCY = Math.min(3, Math.max(1, Number(process.env.QUIZ_IMAGE_CONCURRENCY) || 2));

function getImageFraction() {
  const n = Number(process.env.QUIZ_IMAGE_FRACTION);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : DEFAULT_FRACTION;
}

function normalizeNeedsImage(value) {
  if (value === true) return true;
  if (typeof value === 'string') return /^(true|yes|1)$/i.test(value.trim());
  return false;
}

/** Evenly spread indices when the LLM marks no visual questions. */
function selectSpreadIndices(totalCount, fraction = getImageFraction()) {
  if (totalCount < 1) return [];
  const target = Math.max(1, Math.round(totalCount * fraction));
  const indices = [];
  const step = totalCount / target;
  for (let i = 0; i < target; i++) {
    indices.push(Math.min(totalCount - 1, Math.floor(i * step + step / 2)));
  }
  return [...new Set(indices)];
}

/**
 * Prefer questions the text LLM flagged with needsImage; cap at ~20% of the quiz.
 * @param {Array<{ needsImage?: boolean, imagePrompt?: string }>} questions
 */
function selectImageQuestionIndices(questions, fraction = getImageFraction()) {
  if (!Array.isArray(questions) || questions.length === 0) return [];

  const maxCount = Math.max(1, Math.round(questions.length * fraction));
  const llmPicked = questions
    .map((q, i) => ({ i, q }))
    .filter(({ q }) => normalizeNeedsImage(q.needsImage));

  if (llmPicked.length > 0) {
    const ranked = llmPicked
      .map(({ i, q }) => ({
        i,
        score: String(q.imagePrompt || '').trim().length > 10 ? 2 : 1,
      }))
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .slice(0, maxCount)
      .map((x) => x.i)
      .sort((a, b) => a - b);

    console.info('[quiz-images] LLM selected visual questions', {
      marked: llmPicked.length,
      generating: ranked.length,
      maxCount,
      indices: ranked.map((i) => i + 1),
    });
    return ranked;
  }

  const fallback = selectSpreadIndices(questions.length, fraction);
  console.info('[quiz-images] LLM marked no visuals; using spread fallback', {
    indices: fallback.map((i) => i + 1),
  });
  return fallback;
}

async function buildImagePrompt(question, ctx = {}) {
  const custom = String(question.imagePrompt || '').trim();
  if (custom) {
    return wrapLlmImagePrompt(custom, ctx);
  }
  const qText = String(question.question || '').replace(/\s+/g, ' ').slice(0, 220);
  return expandKeywordToImagePrompt(qText, ctx);
}

function stripImageMeta(question) {
  const { needsImage, imagePrompt, ...rest } = question;
  return rest;
}

/**
 * @param {Array<{ question: string, options: object, correctAnswer: string, explanation: string, needsImage?: boolean, imagePrompt?: string }>} questions
 * @param {{ subject?: string, gradeLevel?: string }} ctx
 */
async function enrichQuestionsWithImages(questions, ctx = {}) {
  if (!Array.isArray(questions) || questions.length === 0) return questions;

  const indices = selectImageQuestionIndices(questions);
  const enriched = questions.map((q) => ({ ...q, imageUrl: null }));

  const generateOne = async (idx) => {
    const q = questions[idx];
    try {
      const prompt = await buildImagePrompt(q, ctx);
      const imageUrl = sanitizeOllamaImageUrl(await generateQuizQuestionImage(prompt, ctx));
      if (!imageUrl) return false;
      enriched[idx] = { ...enriched[idx], imageUrl };
      console.info('[quiz-images] saved', {
        question: idx + 1,
        llmMarked: normalizeNeedsImage(q.needsImage),
        imageUrl,
      });
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
      '[quiz-images] no illustrations saved — enable Ollama Cloud API key and set image model in Admin'
    );
  }

  return enriched.map(stripImageMeta);
}

function stripQuestionImageMeta(questions) {
  if (!Array.isArray(questions)) return questions;
  return questions.map(stripImageMeta);
}

module.exports = {
  enrichQuestionsWithImages,
  selectImageQuestionIndices,
  selectSpreadIndices,
  buildImagePrompt,
  getImageFraction,
  normalizeNeedsImage,
  stripQuestionImageMeta,
};
