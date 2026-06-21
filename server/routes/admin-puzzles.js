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
  getDailyPuzzles,
} = require('../services/puzzleService');
const { scrapeAndImport } = require('../services/puzzleScraperService');
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
        aiGenerationEnabled: global.ai_generation_enabled !== false,
        autoScrapeEnabled: global.auto_scrape_enabled !== false,
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
        aiGenerationEnabled: global.ai_generation_enabled !== false,
        autoScrapeEnabled: global.auto_scrape_enabled !== false,
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
      includePrompt: true,
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
      skillArea: body.skillArea,
      source: body.source,
      generationPrompt: body.generationPrompt,
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

/** POST /api/admin/puzzles/scrape — fetch puzzles from web sources */
router.post('/scrape', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const count = Number(req.body?.count) || 20;
    const result = await scrapeAndImport({ count });
    res.json({
      success: true,
      message: `Scraped ${result.fetched} items — ${result.inserted} new puzzles added.`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/admin/puzzles/preview?grade=&date= — preview daily set for any grade */
router.get('/preview', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const grade = req.query.grade || 'Class 5 / Grade 5';
    const result = await getDailyPuzzles(req.query.date, grade);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /api/admin/puzzles/generate-ai?grade= — force AI + scrape for a grade */
router.post('/generate-ai', checkPermission('manage_users'), async (req, res, next) => {
  try {
    const { ensureDailyContent } = require('../services/puzzleGeneratorService');
    const { regenerateToday } = require('../services/puzzleService');
    const { parseClassNum } = require('../data/puzzleMeta');
    const { resolveGradeLabel } = require('../services/wordOfDayService');
    const grade = await resolveGradeLabel(req.body?.grade || req.query.grade || 'Class 5 / Grade 5');
    const classNum = parseClassNum(grade);
    const cacheDate = new Date().toISOString().slice(0, 10);
    const gen = await ensureDailyContent(cacheDate, grade, classNum);
    await regenerateToday(grade);
    const daily = await getDailyPuzzles(new Date(), grade);
    res.json({
      success: true,
      message: `Generated ${gen.aiCount} AI + ${gen.scrapeCount} scraped puzzles for ${grade}.`,
      generationPrompt: gen.aiPrompt,
      ...gen,
      daily,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
