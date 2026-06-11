/**
 * Study lesson illustrations via Ollama (same pipeline as quiz images).
 * Default: 1 hero + 2 gallery = 3 images. Override count with STUDY_GALLERY_IMAGES (1–3).
 */
const { generateQuizQuestionImage } = require('./ollamaImageGenerate');

/** Hero intro + this many gallery shots (3 images total by default). */
const MAX_GALLERY = Math.min(Math.max(Number(process.env.STUDY_GALLERY_IMAGES) || 2, 1), 3);
const IMAGE_CONCURRENCY = 2;

function buildStudyImagePrompt(keyword, ctx = {}) {
  const subject = String(ctx.subject || 'school subject').trim();
  const topic = String(ctx.topic || 'lesson topic').trim();
  const scene = String(keyword || topic).replace(/\s+/g, ' ').slice(0, 200);
  return (
    `Bright child-friendly educational illustration for a study lesson. Subject: ${subject}. ` +
    `Topic: ${topic}. Visual scene: ${scene}. Clean colorful diagram, simple background, ` +
    `no text or letters in the image, suitable for children.`
  );
}

/**
 * @param {{ introductionImageKeyword?: string, imageKeywords?: string[] }} input
 * @param {{ subject?: string, topic?: string }} ctx
 */
async function enrichLessonWithImages(input, ctx = {}) {
  const introKeyword = String(input.introductionImageKeyword || ctx.topic || 'classroom learning').trim();
  const keywords = [...new Set((input.imageKeywords || []).map((k) => String(k).trim()).filter(Boolean))].slice(
    0,
    MAX_GALLERY
  );

  let introImageUrl = null;
  const galleryImages = [];

  const tasks = [
    { type: 'intro', keyword: introKeyword, label: introKeyword },
    ...keywords.map((keyword) => ({ type: 'gallery', keyword, label: keyword })),
  ];

  let cursor = 0;
  const runOne = async (task) => {
    try {
      const url = await generateQuizQuestionImage(buildStudyImagePrompt(task.keyword, ctx));
      if (task.type === 'intro') introImageUrl = url;
      else galleryImages.push({ url, label: task.label, keyword: task.keyword });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[study-images] skipped', task.keyword, msg);
    }
  };

  const workers = Array.from({ length: Math.min(IMAGE_CONCURRENCY, tasks.length) }, async () => {
    while (cursor < tasks.length) {
      const slot = cursor++;
      await runOne(tasks[slot]);
    }
  });
  await Promise.all(workers);

  console.info('[study-images] complete', {
    intro: Boolean(introImageUrl),
    gallery: galleryImages.length,
    maxGallery: MAX_GALLERY,
  });

  return { introImageUrl, galleryImages };
}

module.exports = { enrichLessonWithImages, buildStudyImagePrompt };
