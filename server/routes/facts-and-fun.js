/**
 * Facts & Fun — class-based daily facts (10/day, saved in DB).
 * GET /api/public/facts-and-fun?date=YYYY-MM-DD&grade=Class+5
 * GET /api/public/facts-and-fun/dates?grade=Class+5&limit=30
 */

const express = require('express');
const { getDailyFacts, getFactDetail, listArchiveDates } = require('../services/dailyFactsService');

const router = express.Router();

router.get('/dates', async (req, res) => {
  try {
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const body = await listArchiveDates(req.query.grade, limit);
    res.json(body);
  } catch (error) {
    console.error('[facts-and-fun/dates]', error.message);
    res.status(500).json({ success: false, dates: [] });
  }
});

router.get('/detail', async (req, res) => {
  try {
    const body = await getFactDetail(req.query.date, req.query.grade, req.query.factId);
    if (!body.success) {
      return res.status(body.status || 404).json(body);
    }
    res.json(body);
  } catch (error) {
    console.error('[facts-and-fun/detail]', error.message);
    res.status(500).json({ success: false, message: 'Failed to load fact details' });
  }
});

router.get('/', async (req, res) => {
  try {
    const body = await getDailyFacts(req.query.date, req.query.grade);
    if (!body.success && !body.cached) {
      return res.status(503).json(body);
    }
    res.json(body);
  } catch (error) {
    console.error('[facts-and-fun]', error.message);
    res.status(500).json({ success: false, message: 'Failed to load daily facts', source: 'ollama' });
  }
});

module.exports = router;
