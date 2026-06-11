/**
 * Generate 10 daily facts via Ollama ONLY — no external APIs, no static pool.
 */

const { ollamaChat, isLlmConfigured } = require('./ollamaClient');
const { getCbseVocabularyGuidance } = require('./cbseGradeHints');
const { DAILY_FACT_SUBJECTS, FACT_COUNT } = require('./dailyFactsSubjects');

class FactsGenerationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FactsGenerationError';
  }
}

function parseFactsJson(raw) {
  const text = String(raw || '').trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed)) return null;
    const validSubjects = new Set(DAILY_FACT_SUBJECTS.map((s) => s.id));
    return parsed
      .map((item, i) => {
        const subject = validSubjects.has(item.subject)
          ? item.subject
          : DAILY_FACT_SUBJECTS[i % DAILY_FACT_SUBJECTS.length].id;
        const meta = DAILY_FACT_SUBJECTS.find((s) => s.id === subject);
        return {
          id: String(item.id || `fact-${i + 1}`),
          subject,
          emoji: String(item.emoji || meta?.emoji || '💡').slice(0, 4),
          title: String(item.title || 'Did you know?').slice(0, 80),
          fact: String(item.fact || '').slice(0, 420),
        };
      })
      .filter((f) => f.fact.length > 20)
      .slice(0, FACT_COUNT);
  } catch {
    return null;
  }
}

function buildPrompt(dateStr, gradeLabel, cbse, strict = false) {
  const subjectList = DAILY_FACT_SUBJECTS.map((s) => `${s.id} (${s.label})`).join(', ');
  const strictNote = strict
    ? '\nIMPORTANT: Return ONLY a raw JSON array. No markdown, no explanation.'
    : '';
  return `You are an expert CBSE teacher. Using ONLY your own knowledge (do NOT browse the web or cite URLs), invent exactly ${FACT_COUNT} original, true, kid-friendly facts for ${cbse.classLevel} students (age ~${cbse.age}).
Cover ALL subjects — at least one fact each: ${subjectList}.
Simple English, Indian school context where relevant, no scary or adult content.
Date seed: ${dateStr} — make today's set unique.${strictNote}

Return ONLY a JSON array of ${FACT_COUNT} objects:
[
  {
    "id": "1",
    "subject": "science",
    "emoji": "🔬",
    "title": "Short catchy title",
    "fact": "2-4 sentences a child can understand."
  }
]
"subject" must be one of: ${DAILY_FACT_SUBJECTS.map((s) => s.id).join(', ')}.`;
}

async function callOllama(prompt, gradeLabel, dateStr) {
  const { content } = await ollamaChat({
    messages: [
      {
        role: 'system',
        content: 'You create educational facts for Indian school children from your training knowledge only. Return valid JSON arrays.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.65,
    num_predict: 2000,
    logContext: `dailyFacts ollama grade=${gradeLabel} date=${dateStr}`,
  });
  return content;
}

/**
 * @param {Date} date
 * @param {string} gradeLabel
 * @returns {Promise<Array<{id,subject,emoji,title,fact}>>}
 */
async function generateDailyFacts(date, gradeLabel) {
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
  const cbse = getCbseVocabularyGuidance(gradeLabel, 'intermediate');

  try {
    let raw = await callOllama(buildPrompt(dateStr, gradeLabel, cbse), gradeLabel, dateStr);
    let facts = parseFactsJson(raw);

    if (!facts || facts.length < 8) {
      console.warn('[dailyFactsAi] retrying Ollama with strict JSON prompt');
      raw = await callOllama(buildPrompt(dateStr, gradeLabel, cbse, true), gradeLabel, dateStr);
      facts = parseFactsJson(raw);
    }

    if (!facts || facts.length < 8) {
      throw new FactsGenerationError('Ollama returned invalid facts. Check model and try again.');
    }

    return facts.map((f, i) => ({ ...f, id: `${dateStr}-${i + 1}` }));
  } catch (err) {
    if (err instanceof FactsGenerationError) throw err;
    console.error('[dailyFactsAi] Ollama error:', err.message);
    throw new FactsGenerationError(
      err.message || 'Ollama failed to generate facts. Is the server running?',
    );
  }
}

module.exports = { generateDailyFacts, FactsGenerationError, FACT_COUNT };
