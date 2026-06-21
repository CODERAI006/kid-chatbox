/**
 * Public puzzle routes — daily top puzzles, puzzle detail.
 */

const express = require('express');
const {
  getDailyPuzzles,
  getPuzzleById,
} = require('../services/puzzleService');
const { getGlobalConfig } = require('../utils/puzzleSettings');
const { PUZZLE_TYPES } = require('../data/puzzleMeta');

const router = express.Router();

/** GET /api/public/puzzles/daily?date=&grade= */
router.get('/daily', async (req, res, next) => {
  try {
    const global = await getGlobalConfig();
    if (!global.enabled) {
      return res.json({
        success: false,
        puzzles: [],
        message: 'Puzzle module is disabled.',
      });
    }
    const grade = req.query.grade || global.default_grade;
    const result = await getDailyPuzzles(req.query.date, grade);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** GET /api/public/puzzles/types — puzzle type catalog */
router.get('/types', (_req, res) => {
  res.json({ success: true, types: PUZZLE_TYPES });
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
