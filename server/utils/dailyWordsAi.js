/**
 * AI-generated CBSE vocabulary words for Words of the Day (cached once per date, shared across classes).
 */

const { ollamaChat, isLlmConfigured } = require('./ollamaClient');
const { getWordsForDate } = require('../data/grade-vocabulary');
const { getCbseVocabularyGuidance } = require('./cbseGradeHints');

const WORD_COUNT = 3;

function parseWordsJson(raw) {
  const text = String(raw || '').trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) return null;

  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(parsed)) return null;

  return parsed
    .map((item) => {
      if (typeof item === 'string') return item.trim().toLowerCase();
      if (item && typeof item.word === 'string') return item.word.trim().toLowerCase();
      return '';
    })
    .filter((w) => /^[a-z'-]{2,30}$/i.test(w))
    .slice(0, WORD_COUNT);
}

/**
 * @param {Date} date
 * @param {string} gradeLabel
 * @param {'basic'|'intermediate'|'advanced'} complexity
 * @returns {Promise<string[]>}
 */
async function generateDailyWords(date, gradeLabel, complexity, theme = null) {
  const fallback = getWordsForDate(date, gradeLabel, complexity);
  if (!isLlmConfigured()) return fallback;

  const dateStr = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  const cbse = getCbseVocabularyGuidance(gradeLabel, complexity);
  const { themePromptBlock } = require('./wordOfDayThemes');
  const themeBlock = theme ? `\n${themePromptBlock(theme)}\n` : '';

  try {
    const prompt = `Pick exactly ${WORD_COUNT} English vocabulary words for ${cbse.classLevel} students (about age ${cbse.age}) studying on the CBSE board in India.

Source: ${cbse.bookRef}
Word style: ${cbse.wordStyle}
Difficulty: ${complexity}
Example level (do NOT copy these): ${cbse.examples}
${themeBlock}
Rules:
- Words must appear in or match the level of NCERT/CBSE textbook passages, poems, or chapter glossaries for this class.
- Prefer words students can use when speaking, writing, presenting, or discussing in class.
- Mix part of speech where possible (noun, verb, adjective).
- No proper nouns, slang, or words far above this class level.
- All ${WORD_COUNT} words must be different from each other and thematically connected.
- Date seed ${dateStr} — vary choices day to day.

Return ONLY a JSON array of lowercase strings, e.g. ["habitat", "observe", "generous"]`;

    const { content } = await ollamaChat({
      messages: [
        {
          role: 'system',
          content:
            'You curate CBSE NCERT vocabulary for Indian school students. Return only a valid JSON array of English words.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      num_predict: 200,
      logContext: `dailyWords grade=${gradeLabel}`,
    });

    const words = parseWordsJson(content);
    if (words?.length === WORD_COUNT) return words;

    console.warn('[dailyWordsAi] invalid LLM output, using static pool');
    return fallback;
  } catch (err) {
    console.warn('[dailyWordsAi] LLM failed:', err.message);
    return fallback;
  }
}

module.exports = { generateDailyWords, WORD_COUNT };
