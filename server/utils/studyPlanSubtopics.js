/**
 * Expands parent exam topics into distinct daily sub-topics for study schedules.
 */

const { ollamaChat, isLlmConfigured } = require('./ollamaClient');

function parseJsonBlock(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function splitParentSeeds(parentTopics) {
  const seeds = [];
  for (const parent of parentTopics) {
    const parts = parent
      .split(/\band\b|,|&|\/|\+/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
    if (parts.length > 1) {
      parts.forEach((part) => seeds.push({ title: part, parent }));
    } else {
      seeds.push({ title: parent, parent });
    }
  }
  return seeds;
}

const DEPTH_LABELS = [
  'Foundations',
  'Core methods',
  'Worked examples',
  'Speed practice',
  'Application problems',
  'Exam-style mixed drill',
];

function buildFallbackSubtopics(parentTopics, count) {
  const topics = parentTopics.map((t) => String(t).trim()).filter(Boolean);
  if (!topics.length || count < 1) return [];

  const seeds = splitParentSeeds(topics);
  const result = [];

  for (let i = 0; i < count; i += 1) {
    const seed = seeds[i % seeds.length];
    const depth = Math.floor(i / seeds.length);
    if (depth === 0) {
      result.push({ title: seed.title, parent: seed.parent });
      continue;
    }
    const label = DEPTH_LABELS[depth % DEPTH_LABELS.length];
    result.push({
      title: `${seed.title} — ${label}`,
      parent: seed.parent,
    });
  }
  return result;
}

function normalizeSubtopics(items, parentTopics) {
  const fallbackParent = parentTopics[0] || 'General';
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      if (typeof item === 'string') {
        return { title: item.trim(), parent: fallbackParent };
      }
      const title = String(item.title || item.subtopic || item.name || '').trim();
      const parent = String(item.parent || item.sourceTopic || item.parentTopic || fallbackParent).trim();
      return title ? { title, parent } : null;
    })
    .filter(Boolean);
}

function padSubtopics(partial, parentTopics, count) {
  const normalized = normalizeSubtopics(partial, parentTopics);
  if (normalized.length >= count) return normalized.slice(0, count);
  const fallback = buildFallbackSubtopics(parentTopics, count);
  const used = new Set(normalized.map((s) => s.title.toLowerCase()));
  for (const item of fallback) {
    if (normalized.length >= count) break;
    if (!used.has(item.title.toLowerCase())) {
      normalized.push(item);
      used.add(item.title.toLowerCase());
    }
  }
  while (normalized.length < count) {
    const fb = fallback[normalized.length % fallback.length];
    normalized.push(fb);
  }
  return normalized.slice(0, count);
}

function buildExpandPrompt({ examName, topics, studyDayCount, examBoard, grade }) {
  const boardLine = examBoard ? `Exam board: ${examBoard}.` : '';
  const gradeLine = grade ? `Student grade: ${grade}.` : '';
  return (
    `Break down the parent topics below into exactly ${studyDayCount} distinct daily sub-topics ` +
    `for a student study schedule before "${examName}". ${boardLine} ${gradeLine}\n\n` +
    `Parent topics:\n${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n` +
    'Rules:\n' +
    `- Return exactly ${studyDayCount} sub-topics in progressive order (basics first, harder later).\n` +
    '- Each sub-topic must be specific (3–14 words), teachable in one day, and clearly related to one parent topic.\n' +
    '- Cover the full scope of all parent topics across the schedule — do not repeat the same sub-topic.\n' +
    '- No generic placeholders like "Buffer day" or "Catch-up".\n\n' +
    'Return ONLY valid JSON:\n' +
    '{"subtopics":[{"title":"...","parent":"exact parent topic string"}, ...]}'
  );
}

/**
 * @param {{ examName: string, topics: string[], studyDayCount: number, examBoard?: string|null, grade?: string|null }} input
 * @returns {Promise<{ title: string, parent: string }[]>}
 */
async function expandStudySubtopics(input) {
  const topics = (input.topics || []).map((t) => String(t).trim()).filter(Boolean);
  const count = Math.max(1, Number(input.studyDayCount) || 1);
  if (!topics.length) return [];

  if (!isLlmConfigured()) {
    return buildFallbackSubtopics(topics, count);
  }

  try {
    const { content } = await ollamaChat({
      messages: [
        {
          role: 'system',
          content:
            'You are an expert curriculum planner for school students. ' +
            'Output only JSON with specific, exam-relevant sub-topics.',
        },
        { role: 'user', content: buildExpandPrompt({ ...input, topics, studyDayCount: count }) },
      ],
      temperature: 0.35,
      num_predict: 4096,
      logContext: 'api.study-plan.expand-subtopics',
    });

    const parsed = parseJsonBlock(content);
    const normalized = normalizeSubtopics(parsed?.subtopics, topics);
    if (normalized.length >= Math.min(count, 2)) {
      return padSubtopics(normalized, topics, count);
    }
  } catch (err) {
    console.warn('[study-plan] subtopic expand failed, using fallback:', err.message);
  }

  return buildFallbackSubtopics(topics, count);
}

module.exports = {
  expandStudySubtopics,
  buildFallbackSubtopics,
};
