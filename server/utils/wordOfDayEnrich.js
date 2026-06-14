/**
 * Enrich vocabulary words with dictionary data, kid-friendly summaries, and quizzes.
 */

const axios = require('axios');
const { ADVANCED_SYNONYMS_ANTONYMS } = require('../data/advanced-synonyms-antonyms');
const { SYNONYMS_ANTONYMS_FALLBACK } = require('../data/synonyms-antonyms-fallback');
const { ollamaChat, isLlmConfigured } = require('./ollamaClient');
const { getCbseVocabularyGuidance } = require('./cbseGradeHints');
const { enrichCacheKey, readCache, writeCache } = require('./wordOfDayDbCache');

const FALLBACK_MAP = { ...SYNONYMS_ANTONYMS_FALLBACK, ...ADVANCED_SYNONYMS_ANTONYMS };

function fallbackSimpleMeaning(word, def) {
  const text = String(def || '').replace(/\.$/, '');
  if (text.length <= 80) return `"${text.charAt(0).toUpperCase()}${text.slice(1)}."`;
  return `Learn what "${word}" means in simple words.`;
}

async function fetchDictionaryWord(word) {
  try {
    const response = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
      { timeout: 6000 },
    );
    if (!response.data?.length) return null;

    const entry = response.data[0];
    const phonetic =
      entry.phonetic ||
      entry.phonetics?.find((p) => p.text)?.text ||
      '';
    const audioUrl = entry.phonetics?.find((p) => p.audio)?.audio || null;

    const meanings = entry.meanings.slice(0, 3).map((m) => {
      const fallback = FALLBACK_MAP[word.toLowerCase()] || {};
      return {
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions.slice(0, 3).map((d) => ({
          definition: d.definition,
          example: d.example || null,
        })),
        synonyms: (m.synonyms?.length ? m.synonyms : fallback.synonyms || []).slice(0, 8),
        antonyms: (m.antonyms?.length ? m.antonyms : fallback.antonyms || []).slice(0, 8),
      };
    });

    return { word: entry.word, phonetic, audioUrl, meanings };
  } catch {
    const fallback = FALLBACK_MAP[word.toLowerCase()];
    return {
      word,
      phonetic: '',
      audioUrl: null,
      meanings: [{
        partOfSpeech: 'word',
        definitions: [{ definition: `Learn the meaning of "${word}" today!`, example: null }],
        synonyms: fallback?.synonyms || [],
        antonyms: fallback?.antonyms || [],
      }],
    };
  }
}

async function generateWordDetail(word, complexity, meanings, gradeLabel, options = {}) {
  const def = meanings[0]?.definitions[0]?.definition || word;
  const pos = meanings[0]?.partOfSpeech || 'word';
  const synonyms = meanings.flatMap((m) => m.synonyms).slice(0, 6);
  const antonyms = meanings.flatMap((m) => m.antonyms).slice(0, 4);
  const cbse = getCbseVocabularyGuidance(gradeLabel || 'Class 5 / Grade 5', complexity);
  const { showQuiz = true, showFunChallenge = true } = options;

  const baseFallback = {
    simpleMeaning: fallbackSimpleMeaning(word, def),
    detailedExplanation: def,
    realWorldExamples: meanings[0]?.definitions
      .filter((d) => d.example)
      .map((d) => d.example)
      .slice(0, 3),
    schoolExample: `Our teacher used "${word}" in class today.`,
    dailyLifeExample: `You might hear "${word}" when talking with friends or family.`,
    communicationTip: `Try using "${word}" when you explain your ideas in class or in writing.`,
    funChallenge: showFunChallenge
      ? `Can you use "${word}" in a sentence today?`
      : undefined,
    quiz: showQuiz && antonyms.length
      ? {
          question: `Which word means the opposite of "${word}"?`,
          options: shuffleQuizOptions(antonyms[0], synonyms),
          answer: antonyms[0],
        }
      : undefined,
  };

  if (!isLlmConfigured()) return baseFallback;

  try {
    const quizBlock = showQuiz
      ? `"quiz": { "question": "...", "options": ["a","b","c","d"], "answer": "correct option" }`
      : '';
    const challengeBlock = showFunChallenge
      ? `"funChallenge": "Can you use \\"${word}\\" in a sentence today?"`
      : '';

    const prompt = `Explain the English word "${word}" (${pos}) for a ${cbse.classLevel} CBSE board student (age ~${cbse.age}).
Definition: ${def}
Complexity: ${complexity}
Synonyms: ${synonyms.join(', ') || 'none'}
Antonyms: ${antonyms.join(', ') || 'none'}

Return ONLY valid JSON:
{
  "simpleMeaning": "one kid-friendly sentence, max 15 words, in quotes if helpful",
  "detailedExplanation": "2-3 age-appropriate sentences",
  "realWorldExamples": ["example 1", "example 2"],
  "schoolExample": "one sentence in Indian CBSE school context",
  "dailyLifeExample": "one sentence in everyday Indian life",
  "communicationTip": "max 25 words",
  ${challengeBlock}${challengeBlock && quizBlock ? ',' : ''}
  ${quizBlock}
}`;

    const { content } = await ollamaChat({
      messages: [
        { role: 'system', content: 'You help CBSE students learn vocabulary. Return only JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      num_predict: 700,
      logContext: `wordOfDay.detail word=${word}`,
    });

    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    const parsed = JSON.parse(content.slice(start, end + 1));
    return {
      simpleMeaning: parsed.simpleMeaning || baseFallback.simpleMeaning,
      detailedExplanation: parsed.detailedExplanation || def,
      realWorldExamples: Array.isArray(parsed.realWorldExamples)
        ? parsed.realWorldExamples.slice(0, 4) : [],
      schoolExample: parsed.schoolExample || '',
      dailyLifeExample: parsed.dailyLifeExample || '',
      communicationTip: parsed.communicationTip || '',
      funChallenge: showFunChallenge
        ? (parsed.funChallenge || baseFallback.funChallenge)
        : undefined,
      quiz: showQuiz && parsed.quiz?.question
        ? {
            question: parsed.quiz.question,
            options: (parsed.quiz.options || []).slice(0, 4),
            answer: parsed.quiz.answer || antonyms[0] || '',
          }
        : baseFallback.quiz,
    };
  } catch (err) {
    console.warn('[wordOfDayEnrich] LLM detail failed:', err.message);
    return baseFallback;
  }
}

function shuffleQuizOptions(correct, distractors) {
  const pool = [correct, ...distractors.filter((d) => d && d !== correct)].slice(0, 3);
  while (pool.length < 4) pool.push(`Option ${pool.length + 1}`);
  const fourth = distractors.find((d) => d && !pool.includes(d)) || 'Determined';
  if (!pool.includes(fourth)) pool.push(fourth);
  return pool.slice(0, 4).sort(() => Math.random() - 0.5);
}

/** Batch-generate simpleMeaning + funChallenge for list view. */
async function enrichWordExtrasBatch(words, gradeLabel, complexity, theme) {
  if (!words.length) return words;
  if (!isLlmConfigured()) {
    return words.map((w) => ({
      ...w,
      simpleMeaning: fallbackSimpleMeaning(
        w.word,
        w.meanings?.[0]?.definitions?.[0]?.definition,
      ),
      funChallenge: `Can you use "${w.word}" in a sentence today?`,
    }));
  }

  const cbse = getCbseVocabularyGuidance(gradeLabel, complexity);
  const themeLabel = theme?.label || 'general vocabulary';
  const wordList = words.map((w) => {
    const def = w.meanings?.[0]?.definitions?.[0]?.definition || w.word;
    return `"${w.word}": ${def}`;
  }).join('\n');

  try {
    const prompt = `For ${cbse.classLevel} CBSE students (theme: ${themeLabel}), write kid-friendly extras for these words:
${wordList}

Return ONLY JSON array with one object per word in the same order:
[{"word":"...", "simpleMeaning":"max 15 words", "funChallenge":"Can you use \\"word\\" in a sentence today?"}]`;

    const { content } = await ollamaChat({
      messages: [
        { role: 'system', content: 'Return only a JSON array for vocabulary learning.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      num_predict: 500,
      logContext: `wordOfDay.extras grade=${gradeLabel}`,
    });

    const start = content.indexOf('[');
    const end = content.lastIndexOf(']');
    const extras = JSON.parse(content.slice(start, end + 1));
    return words.map((w, i) => ({
      ...w,
      simpleMeaning: extras[i]?.simpleMeaning
        || fallbackSimpleMeaning(w.word, w.meanings?.[0]?.definitions?.[0]?.definition),
      funChallenge: extras[i]?.funChallenge || `Can you use "${w.word}" in a sentence today?`,
    }));
  } catch (err) {
    console.warn('[wordOfDayEnrich] batch extras failed:', err.message);
    return words.map((w) => ({
      ...w,
      simpleMeaning: fallbackSimpleMeaning(
        w.word,
        w.meanings?.[0]?.definitions?.[0]?.definition,
      ),
      funChallenge: `Can you use "${w.word}" in a sentence today?`,
    }));
  }
}

async function enrichWord(word, complexity, includeDetail = false, gradeLabel, cacheDate, options = {}) {
  if (cacheDate && gradeLabel) {
    const key = enrichCacheKey(gradeLabel, word, includeDetail);
    const cached = await readCache(key, cacheDate);
    if (cached?.word) return cached;
    if (cached && !includeDetail) return cached;
  }

  const base = await fetchDictionaryWord(word);
  const result = includeDetail
    ? { ...base, ...(await generateWordDetail(word, complexity, base.meanings, gradeLabel, options)) }
    : base;

  if (cacheDate && gradeLabel) {
    await writeCache(enrichCacheKey(gradeLabel, word, includeDetail), cacheDate, result);
  }

  return result;
}

module.exports = {
  fetchDictionaryWord,
  enrichWord,
  enrichWordExtrasBatch,
  generateWordDetail,
};
