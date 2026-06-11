/**
 * Facts & Fun — 10 facts/day/class, ONE Ollama call, saved in PostgreSQL.
 */

const { pool } = require('../config/database');
const { generateDailyFacts } = require('../utils/dailyFactsAi');
const { DAILY_FACT_SUBJECTS } = require('../utils/dailyFactsSubjects');
const { resolveGradeLabel } = require('./wordOfDayService');
const {
  formatCacheDate,
  gradeCacheKey,
  readCache,
  writeCache,
  listCachedDates,
} = require('../utils/dailyFactsDbCache');

function parseDateParam(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

async function buildDailyPayload(date, gradeLabel) {
  const cacheDate = formatCacheDate(date);
  const facts = await generateDailyFacts(date, gradeLabel);
  return {
    success: true,
    date: cacheDate,
    grade: gradeLabel,
    facts,
    subjects: DAILY_FACT_SUBJECTS,
    factCount: facts.length,
    cached: false,
    source: 'ollama',
  };
}

async function getDailyFacts(dateInput, grade) {
  const date = parseDateParam(dateInput);
  const cacheDate = formatCacheDate(date);
  const gradeLabel = await resolveGradeLabel(grade);
  const key = gradeCacheKey(gradeLabel);

  const cached = await readCache(key, cacheDate);
  if (cached?.facts?.length) {
    return { ...cached, grade: gradeLabel, cached: true, source: 'ollama' };
  }

  try {
    const body = await buildDailyPayload(date, gradeLabel);
    await writeCache(key, cacheDate, body);
    return body;
  } catch (err) {
    const { FactsGenerationError } = require('../utils/dailyFactsAi');
    const message = err instanceof FactsGenerationError
      ? err.message
      : 'Failed to generate facts via Ollama.';
    return {
      success: false,
      date: cacheDate,
      grade: gradeLabel,
      facts: [],
      subjects: DAILY_FACT_SUBJECTS,
      message,
      source: 'ollama',
    };
  }
}

async function listArchiveDates(grade, limit = 30) {
  const gradeLabel = await resolveGradeLabel(grade);
  const key = gradeCacheKey(gradeLabel);
  const dates = await listCachedDates(key, limit);
  return { success: true, grade: gradeLabel, dates };
}

async function pregenerateForDate(dateInput) {
  const date = parseDateParam(dateInput);
  const cacheDate = formatCacheDate(date);

  let grades = [];
  try {
    const { rows } = await pool.query(
      `SELECT grade FROM word_of_day_settings WHERE enabled = true ORDER BY grade`
    );
    grades = rows.map((r) => r.grade);
  } catch {
    grades = ['Class 5 / Grade 5'];
  }

  let built = 0;
  for (const grade of grades) {
    const key = gradeCacheKey(grade);
    const existing = await readCache(key, cacheDate);
    if (existing?.facts?.length) continue;
    try {
      await getDailyFacts(cacheDate, grade);
      built += 1;
      console.log(`[dailyFactsService] pregenerated ${grade} @ ${cacheDate}`);
    } catch (err) {
      console.error(`[dailyFactsService] pregenerate failed ${grade}:`, err.message);
    }
  }

  return { cacheDate, built, total: grades.length };
}

module.exports = {
  getDailyFacts,
  listArchiveDates,
  pregenerateForDate,
  parseDateParam,
};
