/**
 * Words of the Day — 3 class-based words + 5 idiomatic phrases per day
 * GET /api/public/words-of-day?date=YYYY-MM-DD&grade=Class+5
 * GET /api/public/words-of-day/detail?word=happy&date=...&grade=...
 *
 * Payloads are stored in word_of_the_day_cache (PostgreSQL) so AI runs once per date/grade.
 */

const express = require('express');
const { getDailyPayload, getWordDetail } = require('../services/wordOfDayService');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const body = await getDailyPayload(req.query.date, req.query.grade);
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
