/**
 * Puzzle service — seed bank, daily top-N selection, caching.
 */

const { pool } = require('../config/database');
const { ALL_SEED_PUZZLES } = require('../data/puzzleSeeds');
const {
  CLASS_BAND_PRIORITIES,
  BOOST_CATEGORIES,
  classBandForGrade,
  parseClassNum,
} = require('../data/puzzleMeta');
const {
  applyGradeDifficultyPolicy,
  elevatePuzzleForGrade,
} = require('../utils/puzzleDifficultyPolicy');
const { resolveGradeLabel } = require('./wordOfDayService');
const {
  getGlobalConfig,
  isGradeEnabled,
  getDailyCount,
} = require('../utils/puzzleSettings');

function formatCacheDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function gradeCacheKey(gradeLabel) {
  return `grade:${gradeLabel}`;
}

function mapRow(row) {
  return {
    id: row.id,
    category: row.category,
    puzzleType: row.puzzle_type,
    classFrom: row.class_from,
    classTo: row.class_to,
    difficulty: row.difficulty,
    question: row.question,
    options: row.options,
    answer: row.answer,
    explanation: row.explanation,
    timeLimit: row.time_limit,
    points: row.points,
  };
}

function mapSeed(p) {
  return {
    id: p.id,
    category: p.category,
    puzzleType: p.puzzleType,
    classFrom: p.classFrom,
    classTo: p.classTo,
    difficulty: p.difficulty,
    question: p.question,
    options: p.options,
    answer: p.answer,
    explanation: p.explanation,
    timeLimit: p.timeLimit,
    points: p.points,
  };
}

/** Deterministic shuffle using date + grade seed. */
function seededPick(items, count, seedStr) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash) + i;
    hash |= 0;
    const j = Math.abs(hash) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

function puzzleMatchesClass(puzzle, classNum) {
  return classNum >= puzzle.classFrom && classNum <= puzzle.classTo;
}

function puzzleScore(p, classNum) {
  const band = classBandForGrade(classNum);
  const priorities = CLASS_BAND_PRIORITIES[band] || [];
  let score = 0;
  if (BOOST_CATEGORIES.has(p.category)) score += 20;
  if (priorities.includes(p.puzzleType)) score += 15;
  if (p.category === 'Brain Teaser') score += 10;
  return score;
}

function prioritizePuzzles(puzzles, classNum) {
  return [...puzzles].sort((a, b) => puzzleScore(b, classNum) - puzzleScore(a, classNum));
}

async function ensureSeedPuzzles() {
  const { bumpStoredDifficulty } = require('../utils/puzzleDifficultyPolicy');
  const { difficultyMeta } = require('../data/puzzleMeta');
  for (const p of ALL_SEED_PUZZLES) {
    const difficulty = bumpStoredDifficulty(p.difficulty, p.classFrom, p.classTo);
    const meta = difficultyMeta(difficulty);
    const timeLimit = Math.max(p.timeLimit, meta.timeLimit);
    const points = Math.max(p.points, meta.points);
    await pool.query(
      `INSERT INTO puzzles (id, category, puzzle_type, class_from, class_to, difficulty,
        question, options, answer, explanation, time_limit, points)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         difficulty = EXCLUDED.difficulty,
         time_limit = EXCLUDED.time_limit,
         points = EXCLUDED.points,
         question = EXCLUDED.question,
         options = EXCLUDED.options,
         answer = EXCLUDED.answer,
         explanation = EXCLUDED.explanation,
         updated_at = CURRENT_TIMESTAMP`,
      [
        p.id, p.category, p.puzzleType, p.classFrom, p.classTo, difficulty,
        p.question, JSON.stringify(p.options), JSON.stringify(p.answer),
        p.explanation, timeLimit, points,
      ],
    );
  }
}

async function loadEligiblePuzzles(classNum) {
  await ensureSeedPuzzles();
  const r = await pool.query(
    `SELECT * FROM puzzles WHERE is_active = true AND class_from <= $1 AND class_to >= $1`,
    [classNum],
  );
  return r.rows.map(mapRow);
}

async function readCache(gradeKey, cacheDate) {
  const r = await pool.query(
    `SELECT payload FROM puzzle_daily_cache WHERE grade_key = $1 AND cache_date = $2::date`,
    [gradeKey, cacheDate],
  );
  return r.rows.length ? r.rows[0].payload : null;
}

async function writeCache(gradeKey, cacheDate, payload) {
  await pool.query(
    `INSERT INTO puzzle_daily_cache (grade_key, cache_date, payload)
     VALUES ($1, $2::date, $3::jsonb)
     ON CONFLICT (grade_key, cache_date) DO UPDATE
     SET payload = EXCLUDED.payload, updated_at = CURRENT_TIMESTAMP`,
    [gradeKey, cacheDate, JSON.stringify(payload)],
  );
}

/** Pick diverse puzzles — spread across categories and types. */
function diversePick(items, count, seedStr) {
  const picked = [];
  const usedTypes = new Set();
  const usedIds = new Set();
  let pool = seededPick(items, items.length, seedStr);

  for (const p of pool) {
    if (picked.length >= count) break;
    if (usedIds.has(p.id)) continue;
    if (usedTypes.has(p.puzzleType) && picked.length < count - 2) continue;
    picked.push(p);
    usedIds.add(p.id);
    usedTypes.add(p.puzzleType);
  }

  if (picked.length < count) {
    for (const p of pool) {
      if (picked.length >= count) break;
      if (!usedIds.has(p.id)) {
        picked.push(p);
        usedIds.add(p.id);
      }
    }
  }
  return picked;
}

async function listCachedDates(gradeLabel, untilDate, limit = 60) {
  const key = gradeCacheKey(gradeLabel);
  const until = untilDate || formatCacheDate(new Date());
  const r = await pool.query(
    `SELECT cache_date::text AS date FROM puzzle_daily_cache
     WHERE grade_key = $1 AND cache_date <= $2::date
     ORDER BY cache_date DESC LIMIT $3`,
    [key, until, limit],
  );
  return r.rows.map((row) => row.date);
}

async function listGradesWithCache() {
  const { getAllSettings } = require('../utils/puzzleSettings');
  const settings = await getAllSettings();
  const r = await pool.query(
    `SELECT DISTINCT grade_key FROM puzzle_daily_cache ORDER BY grade_key`,
  );
  const cachedKeys = new Set(r.rows.map((row) => row.grade_key.replace(/^grade:/, '')));
  return settings
    .filter((s) => s.enabled)
    .map((s) => ({ grade: s.grade, hasCache: cachedKeys.has(s.grade) }));
}

const ARCHIVE_PAGE_SIZE = 20;

async function getPuzzleArchive(gradeInput, opts = {}) {
  const gradeLabel = await resolveGradeLabel(gradeInput);
  const key = gradeCacheKey(gradeLabel);
  const untilDate = opts.untilDate || formatCacheDate(new Date());
  const page = Math.max(1, Number(opts.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(opts.limit) || ARCHIVE_PAGE_SIZE));
  const offset = (page - 1) * limit;

  const countR = await pool.query(
    `SELECT COUNT(*)::int AS total FROM puzzle_daily_cache
     WHERE grade_key = $1 AND cache_date <= $2::date`,
    [key, untilDate],
  );
  const totalDays = countR.rows[0]?.total || 0;

  const r = await pool.query(
    `SELECT cache_date::text AS date, payload FROM puzzle_daily_cache
     WHERE grade_key = $1 AND cache_date <= $2::date
     ORDER BY cache_date DESC LIMIT $3 OFFSET $4`,
    [key, untilDate, limit, offset],
  );

  const items = r.rows.flatMap((row) => {
    const puzzles = row.payload?.puzzles || [];
    return puzzles.map((p) => ({
      ...p,
      archiveDate: row.date,
      grade: gradeLabel,
    }));
  });

  return {
    success: true,
    grade: gradeLabel,
    untilDate,
    page,
    limit,
    totalDays,
    totalPuzzles: items.length,
    hasMore: offset + r.rows.length < totalDays,
    items,
  };
}

/** All puzzles from all cached days till today (flattened). */
async function getAllPuzzlesTillToday(gradeInput, untilDate) {
  const gradeLabel = await resolveGradeLabel(gradeInput);
  const key = gradeCacheKey(gradeLabel);
  const until = untilDate || formatCacheDate(new Date());

  const r = await pool.query(
    `SELECT cache_date::text AS date, payload FROM puzzle_daily_cache
     WHERE grade_key = $1 AND cache_date <= $2::date
     ORDER BY cache_date DESC`,
    [key, until],
  );

  const byDate = r.rows.map((row) => ({
    date: row.date,
    grade: gradeLabel,
    puzzles: row.payload?.puzzles || [],
    count: (row.payload?.puzzles || []).length,
  }));

  const allPuzzles = byDate.flatMap((d) =>
    d.puzzles.map((p) => ({ ...p, archiveDate: d.date, grade: gradeLabel })),
  );

  return {
    success: true,
    grade: gradeLabel,
    untilDate: until,
    dayCount: byDate.length,
    totalPuzzles: allPuzzles.length,
    byDate,
    puzzles: allPuzzles,
  };
}

async function ensureCacheForGrade(gradeLabel, dateInput) {
  return getDailyPuzzles(dateInput, gradeLabel);
}

async function buildDailyPuzzles(dateInput, gradeInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  const cacheDate = formatCacheDate(date);
  const gradeLabel = await resolveGradeLabel(gradeInput);
  const classNum = parseClassNum(gradeLabel);
  const enabled = await isGradeEnabled(gradeLabel);
  const global = await getGlobalConfig();

  if (!global.enabled || !enabled) {
    return {
      success: false,
      date: cacheDate,
      grade: gradeLabel,
      puzzles: [],
      message: 'Puzzles are disabled for this grade.',
    };
  }

  const count = await getDailyCount(gradeLabel);
  const eligible = await loadEligiblePuzzles(classNum);
  const prioritized = prioritizePuzzles(eligible, classNum);
  const ordered = applyGradeDifficultyPolicy(prioritized, classNum, count);
  const seed = `${cacheDate}:${gradeLabel}:${classNum}:v4-gk`;
  const selected = diversePick(ordered, count, seed).map((p) => elevatePuzzleForGrade(p, classNum));

  return {
    success: true,
    date: cacheDate,
    grade: gradeLabel,
    classNum,
    puzzles: selected,
    puzzleCount: selected.length,
    cached: false,
  };
}

async function getDailyPuzzles(dateInput, gradeInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  const cacheDate = formatCacheDate(date);
  const gradeLabel = await resolveGradeLabel(gradeInput);
  const key = gradeCacheKey(gradeLabel);

  const cached = await readCache(key, cacheDate);
  if (cached?.puzzles?.length) {
    return { ...cached, grade: gradeLabel, cached: true };
  }

  const body = await buildDailyPuzzles(date, gradeLabel);
  if (body.success && body.puzzles.length) {
    await writeCache(key, cacheDate, body);
  }
  return body;
}

async function getPuzzleById(id) {
  await ensureSeedPuzzles();
  const r = await pool.query(`SELECT * FROM puzzles WHERE id = $1 AND is_active = true`, [id]);
  return r.rows.length ? mapRow(r.rows[0]) : null;
}

async function listAllPuzzles(filters = {}) {
  await ensureSeedPuzzles();
  const clauses = ['is_active = true'];
  const params = [];
  if (filters.category) {
    params.push(filters.category);
    clauses.push(`category = $${params.length}`);
  }
  if (filters.puzzleType) {
    params.push(filters.puzzleType);
    clauses.push(`puzzle_type = $${params.length}`);
  }
  const r = await pool.query(
    `SELECT * FROM puzzles WHERE ${clauses.join(' AND ')} ORDER BY category, puzzle_type, id`,
    params,
  );
  return r.rows.map(mapRow);
}

async function upsertPuzzle(data) {
  await pool.query(
    `INSERT INTO puzzles (id, category, puzzle_type, class_from, class_to, difficulty,
      question, options, answer, explanation, time_limit, points, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13)
     ON CONFLICT (id) DO UPDATE SET
       category = EXCLUDED.category,
       puzzle_type = EXCLUDED.puzzle_type,
       class_from = EXCLUDED.class_from,
       class_to = EXCLUDED.class_to,
       difficulty = EXCLUDED.difficulty,
       question = EXCLUDED.question,
       options = EXCLUDED.options,
       answer = EXCLUDED.answer,
       explanation = EXCLUDED.explanation,
       time_limit = EXCLUDED.time_limit,
       points = EXCLUDED.points,
       is_active = EXCLUDED.is_active,
       updated_at = CURRENT_TIMESTAMP`,
    [
      data.id, data.category, data.puzzleType, data.classFrom, data.classTo, data.difficulty,
      data.question, JSON.stringify(data.options ?? null), JSON.stringify(data.answer),
      data.explanation, data.timeLimit, data.points, data.isActive !== false,
    ],
  );
  return getPuzzleById(data.id);
}

async function regenerateToday(gradeLabel) {
  const cacheDate = formatCacheDate(new Date());
  const key = gradeCacheKey(gradeLabel);
  await pool.query(
    `DELETE FROM puzzle_daily_cache WHERE grade_key = $1 AND cache_date = $2::date`,
    [key, cacheDate],
  );
  return getDailyPuzzles(new Date(), gradeLabel);
}

async function regenerateAllGradesToday() {
  const { getAllSettings } = require('../utils/puzzleSettings');
  const settings = await getAllSettings();
  let built = 0;
  for (const row of settings.filter((s) => s.enabled)) {
    await regenerateToday(row.grade);
    built += 1;
  }
  return { built };
}

module.exports = {
  formatCacheDate,
  gradeCacheKey,
  mapSeed,
  getDailyPuzzles,
  getPuzzleById,
  listAllPuzzles,
  upsertPuzzle,
  regenerateToday,
  regenerateAllGradesToday,
  ensureSeedPuzzles,
  listCachedDates,
  listGradesWithCache,
  getPuzzleArchive,
  getAllPuzzlesTillToday,
  ensureCacheForGrade,
  ARCHIVE_PAGE_SIZE,
};
