/**
 * Public puzzle routes — daily, archive (class-locked when logged in).
 */

const express = require('express');
const {
  getDailyPuzzles,
  getPuzzleById,
  listCachedDates,
  getPuzzleArchive,
  getAllPuzzlesTillToday,
  ensureCacheForGrade,
} = require('../services/puzzleService');
const { getGlobalConfig } = require('../utils/puzzleSettings');
const { resolvePuzzleGrade } = require('../utils/puzzleGradeResolve');

const router = express.Router();

function disabled(res) {
  return res.json({ success: false, puzzles: [], message: 'Puzzle module is disabled.' });
}

/** GET /api/public/puzzles/daily?date=&grade= */
router.get('/daily', async (req, res, next) => {
  try {
    const global = await getGlobalConfig();
    if (!global.enabled) return disabled(res);
    const { grade, locked } = await resolvePuzzleGrade(req);
    const result = await getDailyPuzzles(req.query.date, grade);
    res.json({ ...result, gradeLocked: locked });
  } catch (err) {
    next(err);
  }
});

/** GET /api/public/puzzles/dates?grade=&untilDate= */
router.get('/dates', async (req, res, next) => {
  try {
    const global = await getGlobalConfig();
    if (!global.enabled) return res.json({ success: false, dates: [] });
    const { grade } = await resolvePuzzleGrade(req);
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
    const { grade, locked } = await resolvePuzzleGrade(req);
    if (req.query.all === 'true') {
      const result = await getAllPuzzlesTillToday(grade, req.query.untilDate);
      return res.json({ ...result, gradeLocked: locked });
    }
    const result = await getPuzzleArchive(grade, {
      untilDate: req.query.untilDate,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ ...result, gradeLocked: locked });
  } catch (err) {
    next(err);
  }
});

/** POST /api/public/puzzles/warm?grade= */
router.post('/warm', async (req, res, next) => {
  try {
    const global = await getGlobalConfig();
    if (!global.enabled) return disabled(res);
    const { grade } = await resolvePuzzleGrade(req);
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
