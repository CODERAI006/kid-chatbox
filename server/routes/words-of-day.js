/**
 * Words of the Day — class-based word + 5 daily phrases
 * GET /api/public/words-of-day?date=YYYY-MM-DD&grade=Class+5
 * GET /api/public/words-of-day/detail?word=happy&date=...&grade=...
 */

const express = require('express');
const { pool } = require('../config/database');
const { getWordForDate } = require('../data/grade-vocabulary');
const { getPhrasesForDate } = require('../data/daily-phrases');
const { getComplexityForGrade, defaultComplexityForGrade } = require('../utils/wordOfDaySettings');
const { enrichWord } = require('../utils/wordOfDayEnrich');

const router = express.Router();

function parseDateParam(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function cacheKey(grade, cacheDate) {
  const g = String(grade || 'default').replace(/\s+/g, '_').toLowerCase();
  return `wotd_v3_${g}`;
}

async function readCache(key, cacheDate) {
  try {
    const r = await pool.query(
      `SELECT payload FROM word_of_the_day_cache
       WHERE word_key = $1 AND cache_date = $2::date`,
      [key, cacheDate]
    );
    return r.rows.length > 0 ? r.rows[0].payload : null;
  } catch {
    return null;
  }
}

async function writeCache(key, cacheDate, payload) {
  try {
    await pool.query(
      `INSERT INTO word_of_the_day_cache (word_key, cache_date, payload)
       VALUES ($1, $2::date, $3::jsonb)
       ON CONFLICT (word_key, cache_date) DO UPDATE
       SET payload = EXCLUDED.payload, updated_at = CURRENT_TIMESTAMP`,
      [key, cacheDate, JSON.stringify(payload)]
    );
  } catch (err) {
    console.error('[words-of-day] cache write failed:', err.message);
  }
}

async function buildDailyPayload(date, grade, includeDetail = false) {
  const cacheDate = formatDate(date);
  const gradeLabel = String(grade || 'Class 5 / Grade 5').trim();
  const complexity =
    (await getComplexityForGrade(gradeLabel)) ||
    defaultComplexityForGrade(gradeLabel);

  const wordText = getWordForDate(date, gradeLabel, complexity);
  const word = await enrichWord(wordText, complexity, includeDetail);
  const phrases = getPhrasesForDate(date, gradeLabel, complexity);

  return {
    success: true,
    date: cacheDate,
    grade: gradeLabel,
    complexity,
    word,
    phrases,
  };
}

/** GET / — daily word + 5 phrases */
router.get('/', async (req, res) => {
  try {
    const date = parseDateParam(req.query.date);
    const grade = req.query.grade || 'Class 5 / Grade 5';
    const cacheDate = formatDate(date);
    const key = cacheKey(grade, cacheDate);

    const cached = await readCache(key, cacheDate);
    if (cached) return res.json(cached);

    const body = await buildDailyPayload(date, grade, false);
    await writeCache(key, cacheDate, body);
    res.json(body);
  } catch (error) {
    console.error('[words-of-day] error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load word of the day' });
  }
});

/** GET /detail — full word explanation page */
router.get('/detail', async (req, res) => {
  try {
    const date = parseDateParam(req.query.date);
    const grade = req.query.grade || 'Class 5 / Grade 5';
    const cacheDate = formatDate(date);
    const gradeLabel = String(grade).trim();
    const complexity =
      (await getComplexityForGrade(gradeLabel)) ||
      defaultComplexityForGrade(gradeLabel);

    const wordParam = String(req.query.word || '').trim().toLowerCase();
    const expectedWord = getWordForDate(date, gradeLabel, complexity).toLowerCase();

    if (!wordParam || wordParam !== expectedWord) {
      return res.status(404).json({
        success: false,
        message: 'Word not found for this date and class',
      });
    }

    const detailKey = `${cacheKey(grade, cacheDate)}_detail`;
    const cached = await readCache(detailKey, cacheDate);
    if (cached) return res.json(cached);

    const word = await enrichWord(expectedWord, complexity, true);
    const phrases = getPhrasesForDate(date, gradeLabel, complexity);
    const body = {
      success: true,
      date: cacheDate,
      grade: gradeLabel,
      complexity,
      word,
      phrases,
    };

    await writeCache(detailKey, cacheDate, body);
    res.json(body);
  } catch (error) {
    console.error('[words-of-day/detail] error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load word details' });
  }
});

module.exports = router;
