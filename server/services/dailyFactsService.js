/**
 * Facts & Fun — 10 facts/day per grade, cached in PostgreSQL.
 */

const { generateDailyFacts } = require('../utils/dailyFactsAi');
const { loadCategories, normalizeFactCategory } = require('../utils/factsCategories');
const { resolveGradeLabel, parseDateParam } = require('./wordOfDayService');
const { gradesMatch } = require('../utils/normalizeGrade');
const { getComplexityForGrade, getAllSettings } = require('../utils/dailyFactsSettings');
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

function withDetailFields(facts, categories) {
  return (facts || []).map((f) => normalizeFactCategory(normalizeFactDetail(f), categories));
}

async function categoriesPayload() {
  const categories = await loadCategories();
  return categories.map((c) => ({
    slug: c.slug,
    label: c.label,
    emoji: c.emoji,
  }));
}

async function buildDailyPayload(date, gradeLabel, complexity) {
  const cacheDate = formatCacheDate(date);
  const categories = await loadCategories();
  const facts = await generateDailyFacts(date, gradeLabel, complexity);
  return {
    success: true,
    date: cacheDate,
    grade: gradeLabel,
    complexity,
    facts: withDetailFields(facts, categories),
    categories: categories.map((c) => ({ slug: c.slug, label: c.label, emoji: c.emoji })),
    factCount: facts.length,
    cached: false,
    source: 'ollama',
    sharedAcrossClasses: false,
  };
}

async function getDailyFacts(dateInput, grade) {
  const date = parseDateParam(dateInput);
  const cacheDate = formatCacheDate(date);
  const gradeLabel = await resolveGradeLabel(grade);
  const complexity = await getComplexityForGrade(gradeLabel);

  if (!complexity) {
    return {
      success: false,
      status: 403,
      date: cacheDate,
      grade: gradeLabel,
      facts: [],
      categories: await categoriesPayload(),
      message: 'Facts & Fun is disabled for this grade.',
      source: 'ollama',
    };
  }

  const key = gradeCacheKey(gradeLabel);
  const categories = await loadCategories();
  const cached = await readCache(key, cacheDate);
  if (cached?.facts?.length) {
    return {
      ...cached,
      grade: gradeLabel,
      complexity: cached.complexity || complexity,
      facts: withDetailFields(cached.facts, categories),
      categories: cached.categories || categories.map((c) => ({
        slug: c.slug,
        label: c.label,
        emoji: c.emoji,
      })),
      cached: true,
      source: 'ollama',
      sharedAcrossClasses: false,
    };
  }

  try {
    const body = await buildDailyPayload(date, gradeLabel, complexity);
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
      categories: await categoriesPayload(),
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
  const categoryRaw = String(options.category || options.subject || '').trim();
  const category = categoryRaw && categoryRaw !== 'all' ? categoryRaw : null;

  const [total, rows] = await Promise.all([
    countArchivedFacts(key, maxDate, category),
    listArchivedFacts(key, maxDate, { page, limit, category }),
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
    categories: (await loadCategories()).map((c) => ({
      slug: c.slug,
      label: c.label,
      emoji: c.emoji,
    })),
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

async function pregenerateForDate(dateInput, options = {}) {
  const date = parseDateParam(dateInput);
  const cacheDate = formatCacheDate(date);
  const settings = await getAllSettings();
  const gradeFilter = Array.isArray(options.grades) ? options.grades : null;

  let enabled = settings.filter((s) => s.enabled);
  if (gradeFilter?.length) {
    enabled = enabled.filter((row) =>
      gradeFilter.some((g) => gradesMatch(g, row.grade)),
    );
  }

  let built = 0;
  for (const row of enabled) {
    const key = gradeCacheKey(row.grade);
    const existing = await readCache(key, cacheDate);
    if (existing?.facts?.length) continue;

    try {
      await getDailyFacts(cacheDate, row.grade);
      built += 1;
      console.log(`[dailyFactsService] pregenerated ${row.grade} @ ${cacheDate}`);
    } catch (err) {
      console.error(`[dailyFactsService] pregenerate ${row.grade} failed:`, err.message);
    }
  }

  return {
    cacheDate,
    built,
    total: enabled.length,
    skipped: built === 0,
  };
}

async function listCategories() {
  const categories = await loadCategories();
  return {
    success: true,
    categories: categories.map((c) => ({
      slug: c.slug,
      label: c.label,
      emoji: c.emoji,
      topics: c.topics,
    })),
  };
}

module.exports = {
  getDailyFacts,
  getFactDetail,
  listArchiveDates,
  listFactsArchive,
  listCategories,
  pregenerateForDate,
  parseDateParam,
  ARCHIVE_PAGE_SIZE,
};
