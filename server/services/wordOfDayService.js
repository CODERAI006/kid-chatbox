/**
 * Word of the Day — build once per calendar day (shared across classes), persist in DB.
 */

const { pool } = require('../config/database');
const { generateDailyWords } = require('../utils/dailyWordsAi');
const { generateDailyPhrases } = require('../utils/dailyPhrasesAi');
const { enrichWord } = require('../utils/wordOfDayEnrich');
const { gradesMatch } = require('../utils/normalizeGrade');
const {
  SHARED_AI_GRADE_LABEL,
  SHARED_WOTD_COMPLEXITY,
} = require('../utils/dailyContentShared');
const {
  formatCacheDate,
  gradeCacheKey,
  detailCacheKey,
  readCache,
  writeCache,
} = require('../utils/wordOfDayDbCache');

function parseDateParam(dateInput) {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) {
    return Number.isNaN(dateInput.getTime()) ? new Date() : dateInput;
  }
  const raw = String(dateInput).trim();
  if (!raw) return new Date();
  const parts = raw.split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
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

async function buildDailyPayload(date) {
  const cacheDate = formatCacheDate(date);
  const aiGrade = SHARED_AI_GRADE_LABEL;
  const complexity = SHARED_WOTD_COMPLEXITY;

  const wordTexts = await generateDailyWords(date, aiGrade, complexity);
  const words = await Promise.all(
    wordTexts.map((w) => enrichWord(w, complexity, false, aiGrade, cacheDate))
  );
  const phrases = await generateDailyPhrases(date, aiGrade, complexity);

  return {
    success: true,
    date: cacheDate,
    grade: aiGrade,
    complexity,
    words,
    phrases,
    cached: false,
    sharedAcrossClasses: true,
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

  const body = await buildDailyPayload(date);
  await writeCache(key, cacheDate, body);
  return { ...body, grade: gradeLabel };
}

async function getWordDetail(dateInput, grade, wordParam) {
  const date = parseDateParam(dateInput);
  const cacheDate = formatCacheDate(date);
  const gradeLabel = await resolveGradeLabel(grade);
  const complexity = SHARED_WOTD_COMPLEXITY;
  const aiGrade = SHARED_AI_GRADE_LABEL;

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

  const enriched = await enrichWord(word, complexity, true, aiGrade, cacheDate);
  const body = {
    success: true,
    date: cacheDate,
    grade: gradeLabel,
    complexity,
    word: enriched,
    phrases: daily.phrases || [],
    cached: false,
    sharedAcrossClasses: true,
  };

  await writeCache(detailKey, cacheDate, body);
  return body;
}

/** Pre-build today's words once (shared for all classes). */
async function pregenerateForDate(dateInput) {
  const date = parseDateParam(dateInput);
  const cacheDate = formatCacheDate(date);
  const key = gradeCacheKey();

  const existing = await readCache(key, cacheDate);
  if (existing?.words?.length) {
    return { cacheDate, built: 0, total: 1, skipped: true };
  }

  try {
    await getDailyPayload(cacheDate, SHARED_AI_GRADE_LABEL);
    console.log(`[wordOfDayService] pregenerated shared edition @ ${cacheDate}`);
    return { cacheDate, built: 1, total: 1 };
  } catch (err) {
    console.error(`[wordOfDayService] pregenerate failed:`, err.message);
    return { cacheDate, built: 0, total: 1, error: err.message };
  }
}

module.exports = {
  parseDateParam,
  resolveGradeLabel,
  getDailyPayload,
  getWordDetail,
  pregenerateForDate,
};
