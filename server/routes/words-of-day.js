/**
 * Words of the Day route - 5 advanced vocabulary words per day with date support
 * GET /api/public/words-of-day?date=YYYY-MM-DD
 */

const express = require('express');
const axios = require('axios');
const { pool } = require('../config/database');
const { ADVANCED_VOCABULARY_WORDS } = require('../data/advanced-vocabulary-words');
const { ADVANCED_SYNONYMS_ANTONYMS } = require('../data/advanced-synonyms-antonyms');

const router = express.Router();
const WORDS_PER_DAY = 5;
const TOTAL_BATCHES = Math.floor(ADVANCED_VOCABULARY_WORDS.length / WORDS_PER_DAY);

/** Parse YYYY-MM-DD string or return today */
function parseDateParam(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/** Format a Date as YYYY-MM-DD */
function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get the 5 words assigned to a given date */
function getWordsForDate(d) {
  const epochDay = Math.floor(d.getTime() / (1000 * 60 * 60 * 24));
  const batchIndex = Math.abs(epochDay) % TOTAL_BATCHES;
  const start = batchIndex * WORDS_PER_DAY;
  return ADVANCED_VOCABULARY_WORDS.slice(start, start + WORDS_PER_DAY);
}

/** Read cached daily batch from DB */
async function readBatchCache(cacheDate) {
  try {
    const r = await pool.query(
      `SELECT payload FROM word_of_the_day_cache
       WHERE word_key = $1 AND cache_date = $2::date`,
      ['batch_v2', cacheDate]
    );
    return r.rows.length > 0 ? r.rows[0].payload : null;
  } catch {
    return null;
  }
}

/** Write daily batch to DB cache */
async function writeBatchCache(cacheDate, payload) {
  try {
    await pool.query(
      `INSERT INTO word_of_the_day_cache (word_key, cache_date, payload)
       VALUES ($1, $2::date, $3::jsonb)
       ON CONFLICT (word_key, cache_date) DO UPDATE
       SET payload = EXCLUDED.payload, updated_at = CURRENT_TIMESTAMP`,
      ['batch_v2', cacheDate, JSON.stringify(payload)]
    );
  } catch (err) {
    console.error('[words-of-day] cache write failed:', err.message);
  }
}

/** Fetch one word from Free Dictionary API */
async function fetchWordData(word) {
  try {
    const response = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
      { timeout: 6000 }
    );
    if (!response.data || !response.data.length) return null;

    const entry = response.data[0];
    const phonetic =
      entry.phonetic ||
      (entry.phonetics && entry.phonetics.find((p) => p.text)?.text) ||
      '';
    const audioUrl = entry.phonetics?.find((p) => p.audio)?.audio || null;

    const meanings = entry.meanings.slice(0, 2).map((m) => {
      const apiSynonyms = m.synonyms?.slice(0, 5) || [];
      const apiAntonyms = m.antonyms?.slice(0, 5) || [];
      const fallback = ADVANCED_SYNONYMS_ANTONYMS[word.toLowerCase()] || {};

      return {
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions.slice(0, 2).map((d) => ({
          definition: d.definition,
          example: d.example || null,
        })),
        synonyms: apiSynonyms.length > 0 ? apiSynonyms : (fallback.synonyms || []),
        antonyms: apiAntonyms.length > 0 ? apiAntonyms : (fallback.antonyms || []),
      };
    });

    return { word: entry.word, phonetic, audioUrl, meanings };
  } catch {
    // API not available for this word — use fallback data only
    const fallback = ADVANCED_SYNONYMS_ANTONYMS[word.toLowerCase()];
    return {
      word,
      phonetic: '',
      audioUrl: null,
      meanings: [{
        partOfSpeech: 'word',
        definitions: [{ definition: 'Look up this word to discover its meaning!', example: null }],
        synonyms: fallback?.synonyms || [],
        antonyms: fallback?.antonyms || [],
      }],
    };
  }
}

/**
 * GET /api/public/words-of-day
 * Optional query param: ?date=YYYY-MM-DD (defaults to today)
 * Returns 5 advanced vocabulary words for the given date
 */
router.get('/', async (req, res) => {
  try {
    const date = parseDateParam(req.query.date);
    const cacheDate = formatDate(date);

    // Try cache first
    const cached = await readBatchCache(cacheDate);
    if (cached) {
      return res.json(cached);
    }

    const words = getWordsForDate(date);

    // Fetch all 5 words in parallel
    const wordDataArray = await Promise.all(words.map(fetchWordData));

    const validWords = wordDataArray.filter(Boolean);

    const body = {
      success: true,
      date: cacheDate,
      words: validWords,
    };

    await writeBatchCache(cacheDate, body);
    res.json(body);
  } catch (error) {
    console.error('[words-of-day] error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load words', words: [] });
  }
});

module.exports = router;
