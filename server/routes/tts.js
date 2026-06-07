/**
 * Open-source Piper TTS API routes.
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getStatus, isPiperReady, synthesize } = require('../services/piperTtsService');

const router = express.Router();
router.use(authenticateToken);

const MAX_TEXT = 4000;

router.get('/status', (_req, res) => {
  res.json(getStatus());
});

router.post('/speak', async (req, res, next) => {
  try {
    if (!isPiperReady()) {
      return res.status(503).json({
        success: false,
        message: 'Piper TTS not installed. Run: npm run tts:setup',
      });
    }

    const text = String(req.body?.text || '').trim();
    if (!text) {
      return res.status(400).json({ success: false, message: 'text is required' });
    }
    if (text.length > MAX_TEXT) {
      return res.status(400).json({ success: false, message: `text max ${MAX_TEXT} chars` });
    }

    const audio = await synthesize(text);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-store');
    res.send(audio);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
