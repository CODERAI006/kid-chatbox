/**
 * Word of the Day — build once per date/grade, persist in DB, serve from cache.
 */

const { pool } = require('../config/database');
const { generateDailyWords } = require('../utils/dailyWordsAi');
const { generateDailyPhrases } = require('../utils/dailyPhrasesAi');
const { getComplexityForGrade, defaultComplexityForGrade } = require('../utils/wordOfDaySettings');
const { enrichWord } = require('../utils/wordOfDayEnrich');
const { gradesMatch } = require('../utils/normalizeGrade');
const {
  formatCacheDate,
  gradeCacheKey,
  detailCacheKey,
  readCache,
  writeCache,
} = require('../utils/wordOfDayDbCache');

function parseDateParam(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/** Map any grade string to the canonical label stored in word_of_day_settings. */
async function resolveGradeLabel(grade) {
  const input = String(grade || 'Class 5 / Grade 5').trim();
  try {
    const { rows } = await pool.query(
      `SELECT grade FROM word_of_day_settings WHERE enabled = true`
    );
    for (const row of rows) {
      if (gradesMatch(row.grade, input)) return row.grade;
    }
  } catch (err) {
    console.warn('[wordOfDayService] grade resolve failed:', err.message);
  }
  return input;
}

async function buildDailyPayload(date, gradeLabel) {
  const cacheDate = formatCacheDate(date);
  const complexity =
    (await getComplexityForGrade(gradeLabel)) ||
    defaultComplexityForGrade(gradeLabel);

  const wordTexts = await generateDailyWords(date, gradeLabel, complexity);
  const words = await Promise.all(
    wordTexts.map((w) => enrichWord(w, complexity, false, gradeLabel, cacheDate))
  );
  const phrases = await generateDailyPhrases(date, gradeLabel, complexity);

  return {
    success: true,
    date: cacheDate,
    grade: gradeLabel,
    complexity,
    words,
    phrases,
    cached: false,
  };
}

async function getDailyPayload(dateInput, grade) {
  const date = parseDateParam(dateInput);
  const cacheDate = formatCacheDate(date);
  const gradeLabel = await resolveGradeLabel(grade);
  const key = gradeCacheKey(gradeLabel);

  const cached = await readCache(key, cacheDate);
  if (cached?.words?.length) {
    return { ...cached, grade: gradeLabel, cached: true };
  }

  const body = await buildDailyPayload(date, gradeLabel);
  await writeCache(key, cacheDate, body);
  return body;
}

async function getWordDetail(dateInput, grade, wordParam) {
  const date = parseDateParam(dateInput);
  const cacheDate = formatCacheDate(date);
  const gradeLabel = await resolveGradeLabel(grade);
  const complexity =
    (await getComplexityForGrade(gradeLabel)) ||
    defaultComplexityForGrade(gradeLabel);

  const word = String(wordParam || '').trim().toLowerCase();
  if (!word) {
    return { success: false, status: 400, message: 'Word is required' };
  }

  const detailKey = detailCacheKey(gradeLabel, word);
  const cachedDetail = await readCache(detailKey, cacheDate);
  if (cachedDetail?.word) {
    return { ...cachedDetail, cached: true };
  }

  const daily = await getDailyPayload(cacheDate, gradeLabel);
  const todaysWords = (daily.words || [])
    .map((w) => String(w.word || '').toLowerCase())
    .filter(Boolean);

  if (!todaysWords.includes(word)) {
    return {
      success: false,
      status: 404,
      message: 'Word not found for this date and class',
    };
  }

  const enriched = await enrichWord(word, complexity, true, gradeLabel, cacheDate);
  const body = {
    success: true,
    date: cacheDate,
    grade: gradeLabel,
    complexity,
    word: enriched,
    phrases: daily.phrases || [],
    cached: false,
  };

  await writeCache(detailKey, cacheDate, body);
  return body;
}

/** Pre-build today's words for every enabled grade (runs at startup / nightly cron). */
async function pregenerateForDate(dateInput) {
  const date = parseDateParam(dateInput);
  const cacheDate = formatCacheDate(date);

  let grades = [];
  try {
    const { rows } = await pool.query(
      `SELECT grade FROM word_of_day_settings WHERE enabled = true ORDER BY grade`
    );
    grades = rows.map((r) => r.grade);
  } catch (err) {
    console.warn('[wordOfDayService] pregenerate grade list failed:', err.message);
    grades = ['Class 5 / Grade 5'];
  }

  let built = 0;
  for (const grade of grades) {
    const key = gradeCacheKey(grade);
    const existing = await readCache(key, cacheDate);
    if (existing?.words?.length) continue;

    try {
      await getDailyPayload(cacheDate, grade);
      built += 1;
      console.log(`[wordOfDayService] pregenerated ${grade} @ ${cacheDate}`);
    } catch (err) {
      console.error(`[wordOfDayService] pregenerate failed ${grade}:`, err.message);
    }
  }

  return { cacheDate, built, total: grades.length };
}

module.exports = {
  parseDateParam,
  resolveGradeLabel,
  getDailyPayload,
  getWordDetail,
  pregenerateForDate,
};
