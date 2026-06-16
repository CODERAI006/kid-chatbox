/**
 * Generate 10 daily facts via Ollama — category + topic driven, with detail fields.
 */

const { ollamaChat, isLlmConfigured } = require('./ollamaClient');
const { getCbseVocabularyGuidance } = require('./cbseGradeHints');
const { FACT_COUNT, MORE_FACTS_COUNT } = require('./dailyFactsSubjects');
const { loadCategories, pickDailySlots, categoryBySlug } = require('./factsCategories');

class FactsGenerationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FactsGenerationError';
  }
}

function parseMoreFacts(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, idx) => ({
      title: String(item?.title || `Related fact ${idx + 1}`).slice(0, 80),
      fact: String(item?.fact || '').slice(0, 280),
    }))
    .filter((m) => m.fact.length > 12)
    .slice(0, MORE_FACTS_COUNT);
}

function parseFactsJson(raw, assignments, categories) {
  const text = String(raw || '').trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) return null;

  const validSlugs = new Set(categories.map((c) => c.slug));

  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed)) return null;

    return parsed
      .map((item, i) => {
        const slot = assignments[i] || assignments[i % assignments.length];
        const slug = validSlugs.has(item.category)
          ? item.category
          : slot?.slug || categories[i % categories.length].slug;
        const meta = categoryBySlug(categories, slug) || slot;
        const topic = String(item.topic || slot?.topic || meta?.topics?.[0] || meta?.label || '')
          .slice(0, 80);

        return {
          id: String(item.id || `fact-${i + 1}`),
          category: slug,
          topic,
          subject: slug,
          emoji: String(item.emoji || meta?.emoji || slot?.emoji || '💡').slice(0, 4),
          title: String(item.title || 'Did you know?').slice(0, 80),
          fact: String(item.fact || '').slice(0, 420),
          explanation: String(item.explanation || item.fact || '').slice(0, 900),
          reasoning: String(item.reasoning || '').slice(0, 900),
          didYouKnow: String(item.didYouKnow || '').slice(0, 420),
          realLifeLink: String(item.realLifeLink || '').slice(0, 420),
          moreFacts: parseMoreFacts(item.moreFacts),
        };
      })
      .filter((f) => f.fact.length > 20)
      .slice(0, FACT_COUNT);
  } catch {
    return null;
  }
}

function buildPrompt(dateStr, gradeLabel, cbse, assignments, strict = false) {
  const slotLines = assignments
    .map(
      (a, i) =>
        `${i + 1}. category "${a.slug}" (${a.label}) — topic: "${a.topic}" — emoji hint: ${a.emoji}`,
    )
    .join('\n');

  const strictNote = strict
    ? '\nIMPORTANT: Return ONLY a raw JSON array. No markdown, no explanation.'
    : '';

  return `You are an expert CBSE teacher. Using ONLY your own knowledge (do NOT browse the web), invent exactly ${FACT_COUNT} original, true, kid-friendly facts for ${cbse.classLevel} students (age ~${cbse.age}).

Each fact MUST match its assigned category slug and topic below (one fact per row):
${slotLines}

Simple English, Indian school context where relevant, no scary or adult content.
Date seed: ${dateStr} — make today's set unique.${strictNote}

Return ONLY a JSON array of ${FACT_COUNT} objects. EACH object MUST include a "moreFacts" array with EXACTLY ${MORE_FACTS_COUNT} bonus facts on the SAME topic:
[
  {
    "id": "1",
    "category": "${assignments[0]?.slug || 'science'}",
    "topic": "${assignments[0]?.topic || 'General'}",
    "emoji": "${assignments[0]?.emoji || '💡'}",
    "title": "Short catchy title",
    "fact": "2-4 sentences a child can understand.",
    "explanation": "3-4 sentences explaining the main fact more clearly",
    "reasoning": "2-3 sentences on WHY this is true",
    "didYouKnow": "one surprising related fun fact",
    "realLifeLink": "how this connects to school or daily life in India",
    "moreFacts": [
      { "title": "Short title", "fact": "1-2 sentences on the same topic." }
    ]
  }
]
"category" must be the exact slug from the list above. "topic" must match the assigned topic for that row.
Each "moreFacts" array must have exactly ${MORE_FACTS_COUNT} items related to that fact's topic.`;
}

async function callOllama(prompt, gradeLabel, dateStr, numPredict = 12000) {
  const { content } = await ollamaChat({
    messages: [
      {
        role: 'system',
        content: 'You create educational facts for Indian school children. Return valid JSON arrays only.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.65,
    num_predict: numPredict,
    logContext: `dailyFacts ollama grade=${gradeLabel} date=${dateStr}`,
  });
  return content;
}

async function generateDailyFacts(date, gradeLabel, complexity = 'intermediate') {
  if (!isLlmConfigured()) {
    throw new FactsGenerationError(
      'Ollama is not configured. Start local Ollama or set Ollama Cloud in admin settings.',
    );
  }

  const dateStr = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  const cbse = getCbseVocabularyGuidance(gradeLabel, complexity);
  const categories = await loadCategories();
  const assignments = pickDailySlots(categories, dateStr, gradeLabel, FACT_COUNT);

  try {
    let raw = await callOllama(
      buildPrompt(dateStr, gradeLabel, cbse, assignments),
      gradeLabel,
      dateStr,
    );
    let facts = parseFactsJson(raw, assignments, categories);

    if (!facts || facts.length < 8) {
      console.warn('[dailyFactsAi] retrying Ollama with strict JSON prompt');
      raw = await callOllama(
        buildPrompt(dateStr, gradeLabel, cbse, assignments, true),
        gradeLabel,
        dateStr,
        14000,
      );
      facts = parseFactsJson(raw, assignments, categories);
    }

    if (!facts || facts.length < 8) {
      throw new FactsGenerationError('Ollama returned invalid facts. Check model and try again.');
    }

    const { normalizeFactDetail } = require('./dailyFactsEnrich');
    return facts.map((f, i) => normalizeFactDetail({ ...f, id: `${dateStr}-${i + 1}` }));
  } catch (err) {
    if (err instanceof FactsGenerationError) throw err;
    console.error('[dailyFactsAi] Ollama error:', err.message);
    throw new FactsGenerationError(
      err.message || 'Ollama failed to generate facts. Is the server running?',
    );
  }
}

module.exports = { generateDailyFacts, FactsGenerationError, FACT_COUNT, MORE_FACTS_COUNT };
