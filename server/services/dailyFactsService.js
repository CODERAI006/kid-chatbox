/**
 * Facts & Fun — 10 facts/day (shared across classes), ONE Ollama call, saved in PostgreSQL.
 */

const { generateDailyFacts } = require('../utils/dailyFactsAi');
const { DAILY_FACT_SUBJECTS } = require('../utils/dailyFactsSubjects');
const { SHARED_AI_GRADE_LABEL } = require('../utils/dailyContentShared');
const { resolveGradeLabel, parseDateParam } = require('./wordOfDayService');
const { normalizeFactDetail } = require('../utils/dailyFactsEnrich');
const {
  formatCacheDate,
  gradeCacheKey,
  detailCacheKey,
  readCache,
  writeCache,
  listCachedDates,
  countArchivedFacts,
  listArchivedFacts,
} = require('../utils/dailyFactsDbCache');

const ARCHIVE_PAGE_SIZE = 20;

function withDetailFields(facts) {
  return (facts || []).map((f) => normalizeFactDetail(f));
}

async function buildDailyPayload(date) {
  const cacheDate = formatCacheDate(date);
  const facts = await generateDailyFacts(date, SHARED_AI_GRADE_LABEL);
  return {
    success: true,
    date: cacheDate,
    grade: SHARED_AI_GRADE_LABEL,
    facts: withDetailFields(facts),
    subjects: DAILY_FACT_SUBJECTS,
    factCount: facts.length,
    cached: false,
    source: 'ollama',
    sharedAcrossClasses: true,
  };
}

async function getDailyFacts(dateInput, grade) {
  const date = parseDateParam(dateInput);
  const cacheDate = formatCacheDate(date);
  const gradeLabel = await resolveGradeLabel(grade);
  const key = gradeCacheKey(gradeLabel);

  const cached = await readCache(key, cacheDate);
  if (cached?.facts?.length) {
    return {
      ...cached,
      grade: gradeLabel,
      facts: withDetailFields(cached.facts),
      cached: true,
      source: 'ollama',
    };
  }

  try {
    const body = await buildDailyPayload(date);
    await writeCache(key, cacheDate, body);
    return { ...body, grade: gradeLabel };
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

async function listFactsArchive(grade, options = {}) {
  const gradeLabel = await resolveGradeLabel(grade);
  const key = gradeCacheKey(gradeLabel);
  const maxDate = formatCacheDate(parseDateParam(options.untilDate));
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(options.limit, 10) || ARCHIVE_PAGE_SIZE));
  const subjectRaw = String(options.subject || '').trim();
  const subject = subjectRaw && subjectRaw !== 'all' ? subjectRaw : null;

  const [total, rows] = await Promise.all([
    countArchivedFacts(key, maxDate, subject),
    listArchivedFacts(key, maxDate, { page, limit, subject }),
  ]);

  const items = rows.map(({ editionDate, fact }) => ({
    editionDate,
    fact: normalizeFactDetail({
      ...fact,
      id: String(fact.id || `${editionDate}-fact`),
    }),
  }));

  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  return {
    success: true,
    grade: gradeLabel,
    untilDate: maxDate,
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
    items,
    subjects: DAILY_FACT_SUBJECTS,
  };
}

async function getFactDetail(dateInput, grade, factIdParam) {
  const factId = String(factIdParam || '').trim();
  if (!factId) {
    return { success: false, status: 400, message: 'Fact id is required' };
  }

  const date = parseDateParam(dateInput);
  const cacheDate = formatCacheDate(date);
  const gradeLabel = await resolveGradeLabel(grade);
  const detailKey = detailCacheKey(gradeLabel, factId);

  const cachedDetail = await readCache(detailKey, cacheDate);
  if (cachedDetail?.fact?.id) {
    return { ...cachedDetail, cached: true };
  }

  const daily = await getDailyFacts(cacheDate, gradeLabel);
  if (!daily.success || !daily.facts?.length) {
    return {
      success: false,
      status: 404,
      message: daily.message || 'No facts found for this day',
    };
  }

  const fact = daily.facts.find((f) => f.id === factId);
  if (!fact) {
    return { success: false, status: 404, message: 'Fact not found for this date and class' };
  }

  const enriched = normalizeFactDetail(fact);
  const body = {
    success: true,
    date: cacheDate,
    grade: gradeLabel,
    fact: enriched,
    detail: {
      explanation: enriched.explanation,
      reasoning: enriched.reasoning,
      didYouKnow: enriched.didYouKnow,
      realLifeLink: enriched.realLifeLink,
    },
    cached: false,
    source: 'ollama',
  };

  await writeCache(detailKey, cacheDate, body);
  return body;
}

async function pregenerateForDate(dateInput) {
  const date = parseDateParam(dateInput);
  const cacheDate = formatCacheDate(date);
  const key = gradeCacheKey();

  const existing = await readCache(key, cacheDate);
  if (existing?.facts?.length) {
    return { cacheDate, built: 0, total: 1, skipped: true };
  }

  try {
    await getDailyFacts(cacheDate, SHARED_AI_GRADE_LABEL);
    console.log(`[dailyFactsService] pregenerated shared edition @ ${cacheDate}`);
    return { cacheDate, built: 1, total: 1 };
  } catch (err) {
    console.error('[dailyFactsService] pregenerate failed:', err.message);
    return { cacheDate, built: 0, total: 1, error: err.message };
  }
}

module.exports = {
  getDailyFacts,
  getFactDetail,
  listArchiveDates,
  listFactsArchive,
  pregenerateForDate,
  parseDateParam,
  ARCHIVE_PAGE_SIZE,
};
