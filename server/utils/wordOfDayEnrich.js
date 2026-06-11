/**
 * Enrich a vocabulary word with dictionary data, synonyms/antonyms, and LLM detail.
 */

const axios = require('axios');
const { ADVANCED_SYNONYMS_ANTONYMS } = require('../data/advanced-synonyms-antonyms');
const { SYNONYMS_ANTONYMS_FALLBACK } = require('../data/synonyms-antonyms-fallback');
const { ollamaChat, isLlmConfigured } = require('./ollamaClient');
const { getCbseVocabularyGuidance } = require('./cbseGradeHints');

const FALLBACK_MAP = { ...SYNONYMS_ANTONYMS_FALLBACK, ...ADVANCED_SYNONYMS_ANTONYMS };

async function fetchDictionaryWord(word) {
  try {
    const response = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
      { timeout: 6000 }
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

async function generateWordDetail(word, complexity, meanings, gradeLabel) {
  const def = meanings[0]?.definitions[0]?.definition || word;
  const pos = meanings[0]?.partOfSpeech || 'word';
  const cbse = getCbseVocabularyGuidance(gradeLabel || 'Class 5 / Grade 5', complexity);

  if (!isLlmConfigured()) {
    return {
      detailedExplanation: def,
      realWorldExamples: meanings[0]?.definitions
        .filter((d) => d.example)
        .map((d) => d.example)
        .slice(0, 3),
      schoolExample: `Our teacher used "${word}" in class today.`,
      dailyLifeExample: `You might hear "${word}" when talking with friends or family.`,
    };
  }

  try {
    const prompt = `Explain the English word "${word}" (${pos}) for a ${cbse.classLevel} CBSE board student (age ~${cbse.age}).
Definition: ${def}
Complexity: ${complexity}
Textbook context: ${cbse.bookRef}

Return ONLY valid JSON:
{
  "detailedExplanation": "2-3 age-appropriate sentences explaining the word clearly, referencing how it might appear in NCERT/CBSE books",
  "realWorldExamples": ["detailed example 1", "detailed example 2", "detailed example 3"],
  "schoolExample": "one detailed sentence using the word in an Indian CBSE school context",
  "dailyLifeExample": "one detailed sentence using the word in everyday life in India"
}`;

    const { content } = await ollamaChat({
      messages: [
        { role: 'system', content: 'You help CBSE board students learn vocabulary from NCERT textbooks. Return only JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      num_predict: 600,
      logContext: `wordOfDay.detail word=${word}`,
    });

    const parsed = JSON.parse(content.trim());
    return {
      detailedExplanation: parsed.detailedExplanation || def,
      realWorldExamples: Array.isArray(parsed.realWorldExamples)
        ? parsed.realWorldExamples.slice(0, 4) : [],
      schoolExample: parsed.schoolExample || '',
      dailyLifeExample: parsed.dailyLifeExample || '',
    };
  } catch (err) {
    console.warn('[wordOfDayEnrich] LLM detail failed:', err.message);
    return {
      detailedExplanation: def,
      realWorldExamples: [],
      schoolExample: '',
      dailyLifeExample: '',
    };
  }
}

async function enrichWord(word, complexity, includeDetail = false, gradeLabel) {
  const base = await fetchDictionaryWord(word);
  if (!includeDetail) return base;

  const detail = await generateWordDetail(word, complexity, base.meanings, gradeLabel);
  return { ...base, ...detail };
}

module.exports = { fetchDictionaryWord, enrichWord, generateWordDetail };
