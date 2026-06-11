/**
 * Words of the Day — 3 class-based words + 5 idiomatic phrases per day
 * GET /api/public/words-of-day?date=YYYY-MM-DD&grade=Class+5
 * GET /api/public/words-of-day/detail?word=happy&date=...&grade=...
 */

const express = require('express');
const { pool } = require('../config/database');
const { generateDailyWords } = require('../utils/dailyWordsAi');
const { generateDailyPhrases } = require('../utils/dailyPhrasesAi');
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

function cacheKey(grade) {
  const g = String(grade || 'default').replace(/\s+/g, '_').toLowerCase();
  return `wotd_v6_cbse_${g}`;
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

async function buildDailyPayload(date, grade) {
  const cacheDate = formatDate(date);
  const gradeLabel = String(grade || 'Class 5 / Grade 5').trim();
  const complexity =
    (await getComplexityForGrade(gradeLabel)) ||
    defaultComplexityForGrade(gradeLabel);

  const wordTexts = await generateDailyWords(date, gradeLabel, complexity);
  const words = await Promise.all(
    wordTexts.map((w) => enrichWord(w, complexity, false, gradeLabel))
  );
  const phrases = await generateDailyPhrases(date, gradeLabel, complexity);

  return {
    success: true,
    date: cacheDate,
    grade: gradeLabel,
    complexity,
    words,
    phrases,
  };
}

/** GET / — 3 daily words + 5 idiomatic phrases */
router.get('/', async (req, res) => {
  try {
    const date = parseDateParam(req.query.date);
    const grade = req.query.grade || 'Class 5 / Grade 5';
    const cacheDate = formatDate(date);
    const key = cacheKey(grade);

    const cached = await readCache(key, cacheDate);
    if (cached?.words?.length) return res.json(cached);

    const body = await buildDailyPayload(date, grade);
    await writeCache(key, cacheDate, body);
    res.json(body);
  } catch (error) {
    console.error('[words-of-day] error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load words of the day' });
  }
});

/** GET /detail — full explanation for one of today's three words */
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
    const mainKey = cacheKey(grade);
    const mainCached = await readCache(mainKey, cacheDate);
    let todaysWords = (mainCached?.words || [])
      .map((w) => String(w.word || '').toLowerCase())
      .filter(Boolean);

    if (!todaysWords.length) {
      todaysWords = (await generateDailyWords(date, gradeLabel, complexity))
        .map((w) => w.toLowerCase());
    }

    if (!wordParam || !todaysWords.includes(wordParam)) {
      return res.status(404).json({
        success: false,
        message: 'Word not found for this date and class',
      });
    }

    const detailKey = `${cacheKey(grade)}_detail_${wordParam}`;
    const cached = await readCache(detailKey, cacheDate);
    if (cached?.word) return res.json(cached);

    const word = await enrichWord(wordParam, complexity, true, gradeLabel);
    const phrases = await generateDailyPhrases(date, gradeLabel, complexity);
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
