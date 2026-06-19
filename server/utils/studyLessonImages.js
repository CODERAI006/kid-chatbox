/**
 * Study lesson hero + gallery — photorealistic images from LLM imagePrompts (Ollama Cloud).
 */
const { generateQuizQuestionImage } = require('./ollamaImageGenerate');
const {
  wrapLlmImagePrompt,
  expandKeywordToImagePrompt,
} = require('./educationalImagePrompt');

const MAX_GALLERY = Math.min(Math.max(Number(process.env.STUDY_GALLERY_IMAGES) || 2, 1), 3);
const IMAGE_CONCURRENCY = 2;

/**
 * @param {{ introductionImagePrompt?: string, introductionImageKeyword?: string, imageGallery?: Array<{ keyword?: string, imagePrompt?: string, label?: string }>, imageKeywords?: string[] }} input
 * @param {{ subject?: string, topic?: string, gradeLevel?: string }} ctx
 */
async function resolveImageTasks(input, ctx) {
  const tasks = [];

  const introPrompt = String(input.introductionImagePrompt || '').trim();
  const introKeyword = String(
    input.introductionImageKeyword || ctx.topic || 'classroom learning'
  ).trim();

  tasks.push({
    type: 'intro',
    label: introKeyword,
    keyword: introKeyword,
    imagePrompt: introPrompt,
  });

  const gallery = Array.isArray(input.imageGallery) ? input.imageGallery : [];
  if (gallery.length > 0) {
    for (const item of gallery.slice(0, MAX_GALLERY)) {
      const keyword = String(item?.keyword || item?.label || '').trim();
      if (!keyword && !item?.imagePrompt) continue;
      tasks.push({
        type: 'gallery',
        label: String(item?.label || keyword || 'Gallery').trim(),
        keyword: keyword || ctx.topic,
        imagePrompt: String(item?.imagePrompt || '').trim(),
      });
    }
  } else {
    const keywords = [...new Set((input.imageKeywords || []).map((k) => String(k).trim()).filter(Boolean))].slice(
      0,
      MAX_GALLERY
    );
    for (const keyword of keywords) {
      tasks.push({ type: 'gallery', label: keyword, keyword, imagePrompt: '' });
    }
  }

  return tasks;
}

async function resolvePromptForTask(task, ctx) {
  if (task.imagePrompt) {
    return wrapLlmImagePrompt(task.imagePrompt, ctx);
  }
  return expandKeywordToImagePrompt(task.keyword, ctx);
}

/**
 * @param {object} input
 * @param {{ subject?: string, topic?: string, gradeLevel?: string }} ctx
 */
async function enrichLessonWithImages(input, ctx = {}) {
  const tasks = await resolveImageTasks(input, ctx);
  let introImageUrl = null;
  const galleryImages = [];

  let cursor = 0;
  const runOne = async (task) => {
    try {
      const prompt = await resolvePromptForTask(task, ctx);
      const result = await generateQuizQuestionImage(prompt, ctx);
      const url = result?.imageUrl || result;
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

module.exports = { enrichLessonWithImages };
