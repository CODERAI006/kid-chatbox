/**
 * Word of the Day — per-grade editions with weekly themes, cached in DB.
 */

const { pool } = require('../config/database');
const { generateDailyWords } = require('../utils/dailyWordsAi');
const { generateDailyPhrases } = require('../utils/dailyPhrasesAi');
const { enrichWord, enrichWordExtrasBatch } = require('../utils/wordOfDayEnrich');
const { gradesMatch } = require('../utils/normalizeGrade');
const { getComplexityForGrade, getAllSettings } = require('../utils/wordOfDaySettings');
const { getConfig } = require('../utils/wordOfDayConfig');
const { getThemeForDate } = require('../utils/wordOfDayThemes');
const {
  formatCacheDate,
  gradeCacheKey,
  detailCacheKey,
  readCache,
  writeCache,
  listCachedDates,
  countArchivedPhrases,
  listArchivedPhrases,
} = require('../utils/wordOfDayDbCache');

const PHRASES_ARCHIVE_PAGE_SIZE = 20;

function phraseSlug(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function normalizePhrase(raw, editionDate, ord) {
  const phrase = String(raw?.phrase || '').trim();
  const meaning = String(raw?.meaning || '').trim();
  const example = String(raw?.example || '').trim();
  const context = raw?.context === 'daily' ? 'daily' : 'school';
  const slug = phraseSlug(phrase) || 'expression';
  return {
    id: `${editionDate}-${ord}-${slug}`,
    phrase,
    meaning,
    example,
    context,
  };
}

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

async function resolveGradeLabel(grade) {
  const input = String(grade || 'Class 5 / Grade 5').trim();
  try {
    const { rows } = await pool.query(
      `SELECT grade FROM word_of_day_settings WHERE enabled = true`,
    );
    for (const row of rows) {
      if (gradesMatch(row.grade, input)) return row.grade;
    }
  } catch (err) {
    console.warn('[wordOfDayService] grade resolve failed:', err.message);
  }
  return input;
}

async function buildDailyPayload(date, gradeLabel, complexity) {
  const cacheDate = formatCacheDate(date);
  const config = await getConfig();
  const theme = config.weeklyThemesEnabled ? getThemeForDate(date) : null;

  const wordTexts = await generateDailyWords(date, gradeLabel, complexity, theme);
  const baseWords = await Promise.all(
    wordTexts.map((w) => enrichWord(w, complexity, false, gradeLabel, cacheDate)),
  );
  const words = await enrichWordExtrasBatch(baseWords, gradeLabel, complexity, theme);

  const phrases = await generateDailyPhrases(date, gradeLabel, complexity, theme);
  const normalizedPhrases = phrases.map((p, i) => normalizePhrase(p, cacheDate, i + 1));

  const payload = {
    success: true,
    date: cacheDate,
    grade: gradeLabel,
    complexity,
    theme: theme
      ? { key: theme.key, label: theme.label, description: theme.description }
      : null,
    words,
    phrases: normalizedPhrases,
    cached: false,
    sharedAcrossClasses: false,
  };

  await pregenerateWordDetails(payload, cacheDate, gradeLabel, complexity);
  return payload;
}

async function pregenerateWordDetails(daily, cacheDate, gradeLabel, complexity) {
  if (!daily?.words?.length) return { built: 0, total: 0 };

  const config = await getConfig();
  const wordTexts = daily.words
    .map((w) => String(w.word || '').trim().toLowerCase())
    .filter(Boolean);

  let built = 0;
  await Promise.all(
    wordTexts.map(async (word) => {
      const detailKey = detailCacheKey(gradeLabel, word);
      const cachedDetail = await readCache(detailKey, cacheDate);
      if (cachedDetail?.word) return;

      try {
        const enriched = await enrichWord(word, complexity, true, gradeLabel, cacheDate, {
          showQuiz: config.showQuiz,
          showFunChallenge: config.showFunChallenge,
        });
        await writeCache(detailKey, cacheDate, {
          success: true,
          date: cacheDate,
          grade: gradeLabel,
          complexity,
          theme: daily.theme || null,
          word: enriched,
          phrases: daily.phrases || [],
          cached: false,
          sharedAcrossClasses: false,
        });
        built += 1;
        console.log(`[wordOfDayService] preloaded detail "${word}" @ ${cacheDate} (${gradeLabel})`);
      } catch (err) {
        console.error(`[wordOfDayService] detail preload "${word}" failed:`, err.message);
      }
    }),
  );

  return { built, total: wordTexts.length };
}

async function getDailyPayload(dateInput, grade) {
  const date = parseDateParam(dateInput);
  const cacheDate = formatCacheDate(date);
  const gradeLabel = await resolveGradeLabel(grade);
  const complexity = (await getComplexityForGrade(gradeLabel)) || 'intermediate';

  if (!complexity) {
    return {
      success: false,
      status: 403,
      message: 'Word of the Day is disabled for this grade.',
    };
  }

  const key = gradeCacheKey(gradeLabel);
  const cached = await readCache(key, cacheDate);
  if (cached?.words?.length) {
    const phrases = (cached.phrases || []).map((p, i) =>
      p.id ? p : normalizePhrase(p, cacheDate, i + 1),
    );
    const payload = { ...cached, grade: gradeLabel, complexity, phrases, cached: true };
    void pregenerateWordDetails(payload, cacheDate, gradeLabel, complexity);
    return payload;
  }

  const body = await buildDailyPayload(date, gradeLabel, complexity);
  await writeCache(key, cacheDate, body);
  return { ...body, grade: gradeLabel };
}

async function getWordDetail(dateInput, grade, wordParam) {
  const date = parseDateParam(dateInput);
  const cacheDate = formatCacheDate(date);
  const gradeLabel = await resolveGradeLabel(grade);
  const complexity = (await getComplexityForGrade(gradeLabel)) || 'intermediate';

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
  if (!daily.success) return daily;

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

  const config = await getConfig();
  const enriched = await enrichWord(word, complexity, true, gradeLabel, cacheDate, {
    showQuiz: config.showQuiz,
    showFunChallenge: config.showFunChallenge,
  });
  const body = {
    success: true,
    date: cacheDate,
    grade: gradeLabel,
    complexity,
    theme: daily.theme || null,
    word: enriched,
    phrases: daily.phrases || [],
    cached: false,
    sharedAcrossClasses: false,
  };

  await writeCache(detailKey, cacheDate, body);
  return body;
}

async function pregenerateForDate(dateInput) {
  const date = parseDateParam(dateInput);
  const cacheDate = formatCacheDate(date);
  const settings = await getAllSettings();
  const enabled = settings.filter((s) => s.enabled);

  let built = 0;
  let detailsBuilt = 0;
  for (const row of enabled) {
    const key = gradeCacheKey(row.grade);
    const existing = await readCache(key, cacheDate);
    try {
      const daily = existing?.words?.length
        ? {
            ...existing,
            grade: row.grade,
            complexity: row.complexity || (await getComplexityForGrade(row.grade)) || 'intermediate',
          }
        : await getDailyPayload(cacheDate, row.grade);

      if (!existing?.words?.length) {
        built += 1;
        console.log(`[wordOfDayService] pregenerated ${row.grade} @ ${cacheDate}`);
      }

      const detailResult = await pregenerateWordDetails(
        daily,
        cacheDate,
        daily.grade || row.grade,
        daily.complexity || row.complexity || 'intermediate',
      );
      detailsBuilt += detailResult.built;
    } catch (err) {
      console.error(`[wordOfDayService] pregenerate ${row.grade} failed:`, err.message);
    }
  }

  return {
    cacheDate,
    built,
    detailsBuilt,
    total: enabled.length,
    skipped: built === 0 && detailsBuilt === 0,
  };
}

async function listPhraseArchiveDates(grade, limit = 30) {
  const gradeLabel = await resolveGradeLabel(grade);
  const key = gradeCacheKey(gradeLabel);
  const dates = await listCachedDates(key, limit);
  return { success: true, grade: gradeLabel, dates };
}

async function listPhrasesArchive(grade, options = {}) {
  const gradeLabel = await resolveGradeLabel(grade);
  const key = gradeCacheKey(gradeLabel);
  const maxDate = formatCacheDate(parseDateParam(options.untilDate));
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(options.limit, 10) || PHRASES_ARCHIVE_PAGE_SIZE));
  const contextRaw = String(options.context || '').trim();
  const context = contextRaw && contextRaw !== 'all' ? contextRaw : null;

  const [total, rows] = await Promise.all([
    countArchivedPhrases(key, maxDate, context),
    listArchivedPhrases(key, maxDate, { page, limit, context }),
  ]);

  const items = rows.map(({ editionDate, phraseOrd, phrase }) => ({
    editionDate,
    phrase: normalizePhrase(phrase, editionDate, phraseOrd),
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
  };
}

module.exports = {
  parseDateParam,
  resolveGradeLabel,
  getDailyPayload,
  getWordDetail,
  pregenerateWordDetails,
  pregenerateForDate,
  listPhraseArchiveDates,
  listPhrasesArchive,
  normalizePhrase,
  PHRASES_ARCHIVE_PAGE_SIZE,
};
