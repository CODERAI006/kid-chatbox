/**
 * AI-generated idioms & expressions for Words of the Day (cached once per date, shared across classes).
 */

const { ollamaChat, isLlmConfigured } = require('./ollamaClient');
const { getPhrasesForDate } = require('../data/daily-phrases');
const { getCbseVocabularyGuidance } = require('./cbseGradeHints');

const PHRASE_COUNT = 5;

function parsePhrasesJson(raw) {
  const text = String(raw || '').trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) return null;
  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(parsed)) return null;
  return parsed
    .map((item) => ({
      phrase: String(item.phrase || '').trim(),
      meaning: String(item.meaning || '').trim(),
      example: String(item.example || '').trim(),
      context: item.context === 'daily' ? 'daily' : 'school',
    }))
    .filter((p) => p.phrase && p.meaning && p.example)
    .slice(0, PHRASE_COUNT);
}

/**
 * @param {Date} date
 * @param {string} gradeLabel
 * @param {'basic'|'intermediate'|'advanced'} complexity
 * @returns {Promise<Array<{phrase:string,meaning:string,example:string,context:string}>>}
 */
async function generateDailyPhrases(date, gradeLabel, complexity, theme = null) {
  const fallback = getPhrasesForDate(date, gradeLabel, complexity);
  if (!isLlmConfigured()) return fallback;

  const dateStr = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  const cbse = getCbseVocabularyGuidance(gradeLabel, complexity);
  const levelHint =
    complexity === 'expert' || complexity === 'advanced'
      ? 'challenging idioms suitable for CBSE senior secondary learners'
      : complexity === 'intermediate'
        ? 'common idioms for CBSE middle-school learners'
        : 'simple, kid-friendly idioms for younger CBSE learners';

  const themeHint = theme
    ? `Today's vocabulary theme is "${theme.label}" — prefer expressions related to ${theme.description}`
    : '';

  try {
    const prompt = `Generate exactly ${PHRASE_COUNT} English idioms and expressions for ${cbse.classLevel} CBSE board students (age ~${cbse.age}, ${levelHint}).
${themeHint}
Focus on phrases that help students communicate confidently in conversations, group work, presentations, and everyday English.
Use contexts familiar from NCERT textbooks and Indian school life. Mix school and daily-life settings.
Each phrase must be usable inside a full sentence.
Date seed: ${dateStr} — pick varied, useful phrases (not the most clichéd ones every time).

Return ONLY a JSON array:
[
  {
    "phrase": "hit the books",
    "meaning": "To study hard.",
    "example": "I need to hit the books before tomorrow's math test.",
    "context": "school"
  }
]
"context" must be "school" or "daily".`;

    const { content } = await ollamaChat({
      messages: [
        {
          role: 'system',
          content: 'You teach English idioms to CBSE board students in India. Return only valid JSON arrays.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.75,
      num_predict: 900,
      logContext: `dailyPhrases grade=${gradeLabel}`,
    });

    const phrases = parsePhrasesJson(content);
    if (phrases?.length >= 3) return phrases;
    console.warn('[dailyPhrasesAi] invalid LLM output, using static pool');
    return fallback;
  } catch (err) {
    console.warn('[dailyPhrasesAi] LLM failed:', err.message);
    return fallback;
  }
}

module.exports = { generateDailyPhrases, PHRASE_COUNT };
