/**
 * ONE Ollama call per date/grade — generates all 10 daily facts at once.
 */

const { ollamaChat, isLlmConfigured } = require('./ollamaClient');
const { getCbseVocabularyGuidance } = require('./cbseGradeHints');
const { DAILY_FACT_SUBJECTS, FACT_COUNT } = require('./dailyFactsSubjects');
const { getFactsForDate } = require('../data/daily-facts-pool');

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
        const subject = validSubjects.has(item.subject) ? item.subject : DAILY_FACT_SUBJECTS[i % DAILY_FACT_SUBJECTS.length].id;
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

/**
 * @param {Date} date
 * @param {string} gradeLabel
 * @returns {Promise<Array<{id,subject,emoji,title,fact}>>}
 */
async function generateDailyFacts(date, gradeLabel) {
  const fallback = getFactsForDate(date, gradeLabel);
  if (!isLlmConfigured()) return fallback;

  const dateStr = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  const cbse = getCbseVocabularyGuidance(gradeLabel, 'intermediate');
  const subjectList = DAILY_FACT_SUBJECTS.map((s) => `${s.id} (${s.label})`).join(', ');

  try {
    const prompt = `Generate exactly ${FACT_COUNT} short, true, kid-friendly facts for ${cbse.classLevel} CBSE students (age ~${cbse.age}).
Cover ALL these subjects — at least one fact each: ${subjectList}.
Use simple English, Indian school context where relevant, no scary or adult content.
Date seed: ${dateStr} — vary facts day to day.

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

    const { content } = await ollamaChat({
      messages: [
        { role: 'system', content: 'You create educational facts for Indian school children. Return only valid JSON arrays.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      num_predict: 1800,
      logContext: `dailyFacts grade=${gradeLabel} date=${dateStr}`,
    });

    const facts = parseFactsJson(content);
    if (facts?.length >= 8) {
      return facts.map((f, i) => ({ ...f, id: `${dateStr}-${i + 1}` }));
    }
    console.warn('[dailyFactsAi] invalid LLM output, using static pool');
    return fallback;
  } catch (err) {
    console.warn('[dailyFactsAi] LLM failed:', err.message);
    return fallback;
  }
}

module.exports = { generateDailyFacts, FACT_COUNT };
