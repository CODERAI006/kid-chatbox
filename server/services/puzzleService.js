/**
 * Puzzle service — seed bank, daily top-N selection, caching.
 */

const { pool } = require('../config/database');
const { ALL_SEED_PUZZLES } = require('../data/puzzleSeeds');
const {
  CLASS_BAND_PRIORITIES,
  classBandForGrade,
  parseClassNum,
} = require('../data/puzzleMeta');
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

function prioritizePuzzles(puzzles, classNum) {
  const band = classBandForGrade(classNum);
  const priorities = CLASS_BAND_PRIORITIES[band] || [];
  const prioritySet = new Set(priorities);
  const preferred = puzzles.filter((p) => prioritySet.has(p.puzzleType));
  const rest = puzzles.filter((p) => !prioritySet.has(p.puzzleType));
  return [...preferred, ...rest];
}

async function ensureSeedPuzzles() {
  for (const p of ALL_SEED_PUZZLES) {
    await pool.query(
      `INSERT INTO puzzles (id, category, puzzle_type, class_from, class_to, difficulty,
        question, options, answer, explanation, time_limit, points)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         question = EXCLUDED.question,
         options = EXCLUDED.options,
         answer = EXCLUDED.answer,
         explanation = EXCLUDED.explanation,
         updated_at = CURRENT_TIMESTAMP`,
      [
        p.id, p.category, p.puzzleType, p.classFrom, p.classTo, p.difficulty,
        p.question, JSON.stringify(p.options), JSON.stringify(p.answer),
        p.explanation, p.timeLimit, p.points,
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
  const ordered = prioritizePuzzles(eligible, classNum);
  const seed = `${cacheDate}:${gradeLabel}:${classNum}`;
  const selected = seededPick(ordered, count, seed);

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
};
