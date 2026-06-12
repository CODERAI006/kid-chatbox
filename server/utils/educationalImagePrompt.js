/**
 * Photorealistic educational image prompts — shared by study mode and quiz images.
 */
const { ollamaChat, isLlmConfigured } = require('./ollamaClient');

const PHOTOREAL_SYSTEM = `You are creating images for a children's learning platform.

Always generate:
- Photorealistic images
- Real-world photography
- Natural lighting
- High detail
- Educational and age appropriate

Never generate:
- Cartoons
- Animated characters
- Vector illustrations
- Clipart
- Flat design graphics
- Infographics
- Icons
- Text inside images
- Watermarks

Style: National Geographic photography, documentary photography, realistic educational textbook images.`;

const NEGATIVE_CONSTRAINTS =
  'No cartoons, no animation, no vector graphics, no clipart, no illustrations, no icons, ' +
  'no flat design, no text overlays, no watermarks.';

/**
 * @param {string} scene
 * @param {{ topic?: string, subject?: string, gradeLevel?: string }} [ctx]
 */
function buildPhotorealImagePrompt(scene, ctx = {}) {
  const topic = String(ctx.topic || 'educational topic').trim();
  const subject = String(ctx.subject || 'school subject').trim();
  const grade = String(ctx.gradeLevel || 'primary school').trim();
  const sceneText = String(scene || topic).replace(/\s+/g, ' ').trim();

  return [
    'Generate a highly realistic educational photograph.',
    `Topic: ${topic}`,
    `Subject: ${subject}`,
    'Requirements:',
    '- Photorealistic image',
    '- Real-world photography style',
    '- National Geographic quality',
    '- Natural lighting',
    '- High detail and sharp focus',
    '- Real environments and subjects where applicable',
    `- ${NEGATIVE_CONSTRAINTS}`,
    `Suitable for ${grade} students.`,
    `Scene: ${sceneText}`,
    'Output: 16:9 landscape image, educational textbook quality.',
  ].join('\n');
}

/**
 * Wrap an LLM-authored imagePrompt with photoreal constraints if needed.
 * @param {string} imagePrompt
 * @param {{ topic?: string, subject?: string, gradeLevel?: string }} [ctx]
 */
function wrapLlmImagePrompt(imagePrompt, ctx = {}) {
  const p = String(imagePrompt || '').trim();
  if (!p) return buildPhotorealImagePrompt(ctx.topic, ctx);
  const alreadyDetailed =
    /photorealistic|national geographic|real-world photography|documentary photography/i.test(p);
  if (alreadyDetailed) {
    return `${p}. ${NEGATIVE_CONSTRAINTS} 16:9 landscape, educational textbook quality.`;
  }
  return buildPhotorealImagePrompt(p, ctx);
}

/**
 * Expand a short keyword into a full photorealistic imagePrompt via Ollama text model.
 * @param {string} keyword
 * @param {{ topic?: string, subject?: string, gradeLevel?: string }} [ctx]
 */
async function expandKeywordToImagePrompt(keyword, ctx = {}) {
  const concept = String(keyword || ctx.topic || 'classroom learning').trim();
  if (!isLlmConfigured()) {
    return buildPhotorealImagePrompt(concept, ctx);
  }

  const topic = String(ctx.topic || 'lesson topic').trim();
  const subject = String(ctx.subject || 'school subject').trim();
  const grade = String(ctx.gradeLevel || 'primary school').trim();

  try {
    const { content } = await ollamaChat({
      messages: [
        { role: 'system', content: PHOTOREAL_SYSTEM },
        {
          role: 'user',
          content:
            `Topic: ${topic}\nSubject: ${subject}\nGrade: ${grade}\n` +
            `Visual concept: ${concept}\n\n` +
            'Write one detailed imagePrompt for a photorealistic educational photograph. ' +
            'Return JSON only: {"imagePrompt":"..."}',
        },
      ],
      temperature: 0.45,
      num_predict: 600,
      logContext: 'study.image-prompt-expand',
      requestTimeoutMs: 90_000,
    });

    const match = String(content || '').match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      const expanded = String(parsed?.imagePrompt || '').trim();
      if (expanded.length > 40) {
        return wrapLlmImagePrompt(expanded, { ...ctx, topic, subject, gradeLevel: grade });
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[image-prompt] expand failed, using template', { concept, error: msg });
  }

  return buildPhotorealImagePrompt(concept, { ...ctx, topic, subject, gradeLevel: grade });
}

module.exports = {
  PHOTOREAL_SYSTEM,
  NEGATIVE_CONSTRAINTS,
  buildPhotorealImagePrompt,
  wrapLlmImagePrompt,
  expandKeywordToImagePrompt,
};
