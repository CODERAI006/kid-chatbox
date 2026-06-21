/**
 * Admin puzzle routes — settings, puzzle bank CRUD, regenerate.
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const {
  getGlobalConfig,
  updateGlobalConfig,
  getAllSettings,
  updateSettings,
} = require('../utils/puzzleSettings');
const {
  listAllPuzzles,
  upsertPuzzle,
  regenerateAllGradesToday,
  ensureSeedPuzzles,
} = require('../services/puzzleService');
const { PUZZLE_TYPES } = require('../data/puzzleMeta');

const router = express.Router();
router.use(authenticateToken);

router.get('/settings', checkPermission('manage_users'), async (_req, res, next) => {
  try {
    const [global, settings] = await Promise.all([getGlobalConfig(), getAllSettings()]);
    res.json({
      success: true,
      global: {
        enabled: global.enabled,
        showOnHomepage: global.show_on_homepage,
        defaultGrade: global.default_grade,
      },
      settings: settings.map((s) => ({
        grade: s.grade,
        enabled: s.enabled,
        dailyCount: s.daily_count,
      })),
      types: PUZZLE_TYPES,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', checkPermission('manage_users'), async (req, res, next) => {
  try {
    if (req.body?.global) {
      await updateGlobalConfig(req.body.global, req.user?.id);
    }
    if (Array.isArray(req.body?.settings) && req.body.settings.length) {
      await updateSettings(req.body.settings, req.user?.id);
    }
    const [global, settings] = await Promise.all([getGlobalConfig(), getAllSettings()]);
    res.json({
      success: true,
      message: 'Puzzle settings saved.',
      global: {
        enabled: global.enabled,
        showOnHomepage: global.show_on_homepage,
        defaultGrade: global.default_grade,
      },
      settings: settings.map((s) => ({
        grade: s.grade,
        enabled: s.enabled,
        dailyCount: s.daily_count,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/bank', checkPermission('manage_users'), async (req, res, next) => {
  try {
    await ensureSeedPuzzles();
    const puzzles = await listAllPuzzles({
      category: req.query.category,
      puzzleType: req.query.puzzleType,
    });
    res.json({ success: true, puzzles, count: puzzles.length });
  } catch (err) {
    next(err);
  }
});

router.put('/bank/:id', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const puzzle = await upsertPuzzle({
      id: req.params.id,
      category: body.category,
      puzzleType: body.puzzleType,
      classFrom: body.classFrom,
      classTo: body.classTo,
      difficulty: body.difficulty,
      question: body.question,
      options: body.options,
      answer: body.answer,
      explanation: body.explanation,
      timeLimit: body.timeLimit,
      points: body.points,
      isActive: body.isActive,
    });
    res.json({ success: true, puzzle, message: 'Puzzle saved.' });
  } catch (err) {
    next(err);
  }
});

router.post('/regenerate', checkPermission('manage_users'), async (_req, res, next) => {
  try {
    const result = await regenerateAllGradesToday();
    res.json({
      success: true,
      message: `Regenerated daily puzzles for ${result.built} grade(s).`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
