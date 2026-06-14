/**
 * Words of the Day — 3 class-based words + 5 idiomatic phrases per day
 * GET /api/public/words-of-day?date=YYYY-MM-DD&grade=Class+5
 * GET /api/public/words-of-day/detail?word=happy&date=...&grade=...
 *
 * Payloads are stored in word_of_the_day_cache (PostgreSQL) — one shared edition per date for all classes.
 */

const express = require('express');
const {
  getDailyPayload,
  getWordDetail,
  listPhraseArchiveDates,
  listPhrasesArchive,
  PHRASES_ARCHIVE_PAGE_SIZE,
} = require('../services/wordOfDayService');

const router = express.Router();

router.get('/phrases/dates', async (req, res) => {
  try {
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const body = await listPhraseArchiveDates(req.query.grade, limit);
    res.json(body);
  } catch (error) {
    console.error('[words-of-day/phrases/dates]', error.message);
    res.status(500).json({ success: false, dates: [] });
  }
});

router.get('/phrases/archive', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || PHRASES_ARCHIVE_PAGE_SIZE));
    const body = await listPhrasesArchive(req.query.grade, {
      page,
      limit,
      context: req.query.context,
      untilDate: req.query.untilDate,
    });
    res.json(body);
  } catch (error) {
    console.error('[words-of-day/phrases/archive]', error.message);
    res.status(500).json({
      success: false,
      items: [],
      total: 0,
      message: 'Failed to load expressions archive',
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const body = await getDailyPayload(req.query.date, req.query.grade);
    if (body.success === false) {
      return res.status(body.status || 500).json(body);
    }
    res.json(body);
  } catch (error) {
    console.error('[words-of-day] error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load words of the day' });
  }
});

router.get('/detail', async (req, res) => {
  try {
    const result = await getWordDetail(req.query.date, req.query.grade, req.query.word);
    if (!result.success) {
      return res.status(result.status || 500).json({
        success: false,
        message: result.message || 'Failed to load word details',
      });
    }
    res.json(result);
  } catch (error) {
    console.error('[words-of-day/detail] error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load word details' });
  }
});

module.exports = router;
