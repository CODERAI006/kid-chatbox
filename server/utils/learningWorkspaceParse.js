/**
 * Server-side parse for learning workspace JSON (mirrors client parser).
 */

const CARD_TYPES = new Set([
  'hook',
  'explanation',
  'text',
  'diagram',
  'image',
  'interactive',
  'video',
  'audio',
  'example',
  'quiz',
  'flashcard',
  'askDeeper',
  'progress',
  'timeline',
  'comparison',
  'code',
  'formula',
]);

function asString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function parseLearningWorkspace(content) {
  const trimmed = String(content || '').trim();
  if (!trimmed) return null;

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const candidate = jsonMatch ? jsonMatch[0] : trimmed;

  try {
    const parsed = JSON.parse(candidate);
    const topic = asString(parsed.topic) || 'Learning';
    const cardsRaw = Array.isArray(parsed.cards) ? parsed.cards : [];
    const cards = cardsRaw.filter((c) => c && CARD_TYPES.has(c.type));
    if (!cards.length) return null;

    return {
      topic,
      progressPercent:
        typeof parsed.progressPercent === 'number'
          ? Math.max(0, Math.min(100, Math.round(parsed.progressPercent)))
          : undefined,
      cards,
    };
  } catch {
    return null;
  }
}

module.exports = { parseLearningWorkspace };
