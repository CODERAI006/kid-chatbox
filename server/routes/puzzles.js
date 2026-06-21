/**
 * Public puzzle routes — daily, archive, grades, puzzle detail.
 */

const express = require('express');
const {
  getDailyPuzzles,
  getPuzzleById,
  listCachedDates,
  listGradesWithCache,
  getPuzzleArchive,
  getAllPuzzlesTillToday,
  ensureCacheForGrade,
} = require('../services/puzzleService');
const { getGlobalConfig } = require('../utils/puzzleSettings');
const { DEFAULT_GRADES } = require('../data/puzzleMeta');

const router = express.Router();

function disabled(res) {
  return res.json({ success: false, puzzles: [], message: 'Puzzle module is disabled.' });
}

/** GET /api/public/puzzles/daily?date=&grade= */
router.get('/daily', async (req, res, next) => {
  try {
    const global = await getGlobalConfig();
    if (!global.enabled) return disabled(res);
    const grade = req.query.grade || global.default_grade;
    const result = await getDailyPuzzles(req.query.date, grade);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** GET /api/public/puzzles/grades — enabled grades + cache status */
router.get('/grades', async (req, res, next) => {
  try {
    const global = await getGlobalConfig();
    if (!global.enabled) return res.json({ success: false, grades: [] });
    const grades = await listGradesWithCache();
    res.json({ success: true, grades, allGrades: DEFAULT_GRADES });
  } catch (err) {
    next(err);
  }
});

/** GET /api/public/puzzles/dates?grade=&untilDate= */
router.get('/dates', async (req, res, next) => {
  try {
    const global = await getGlobalConfig();
    if (!global.enabled) return res.json({ success: false, dates: [] });
    const grade = req.query.grade || global.default_grade;
    const dates = await listCachedDates(grade, req.query.untilDate);
    res.json({ success: true, grade, dates });
  } catch (err) {
    next(err);
  }
});

/** GET /api/public/puzzles/archive?grade=&untilDate=&page=&limit= */
router.get('/archive', async (req, res, next) => {
  try {
    const global = await getGlobalConfig();
    if (!global.enabled) return res.json({ success: false, items: [] });
    const grade = req.query.grade || global.default_grade;
    if (req.query.all === 'true') {
      const result = await getAllPuzzlesTillToday(grade, req.query.untilDate);
      return res.json(result);
    }
    const result = await getPuzzleArchive(grade, {
      untilDate: req.query.untilDate,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /api/public/puzzles/warm?grade= — ensure today's cache exists */
router.post('/warm', async (req, res, next) => {
  try {
    const global = await getGlobalConfig();
    if (!global.enabled) return disabled(res);
    const grade = req.query.grade || req.body?.grade || global.default_grade;
    const result = await ensureCacheForGrade(grade);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** GET /api/public/puzzles/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const puzzle = await getPuzzleById(req.params.id);
    if (!puzzle) {
      return res.status(404).json({ success: false, message: 'Puzzle not found' });
    }
    res.json({ success: true, puzzle });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
