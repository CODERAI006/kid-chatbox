/**
 * Image generation demo & status API (Ollama Cloud photorealistic or demo placeholders).
 */
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  getStatus,
  generateImage,
  generateDemoImage,
} = require('../services/imageGenerationService');

const router = express.Router();

/** GET /api/images/status — service health (no auth). */
router.get('/status', (req, res) => {
  res.json({ success: true, ...getStatus() });
});

router.use(authenticateToken);

/**
 * POST /api/images/demo
 * Body: { prompt?: string }
 * Instant placeholder SVG — no Ollama call.
 */
router.post('/demo', async (req, res, next) => {
  try {
    const prompt =
      String(req.body?.prompt || '').trim() ||
      'Child-friendly educational diagram for a school lesson';
    const result = await generateDemoImage(prompt);
    res.json({
      success: true,
      imageUrl: result.imageUrl,
      provider: result.provider,
      model: result.model,
      prompt: result.prompt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/images/generate
 * Body: { prompt: string, mode?: 'llm' | 'demo' | 'auto' }
 */
router.post('/generate', async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || '').trim();
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'prompt is required' });
    }
    const mode = req.body?.mode;
    const result = await generateImage(prompt, { mode, save: true });
    res.json({
      success: true,
      imageUrl: result.imageUrl,
      provider: result.provider,
      model: result.model,
      fallbackReason: result.fallbackReason || null,
      prompt: result.prompt,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
