/**
 * Authenticated proxy to local Ollama (avoids browser CORS and API keys in the client).
 * @see docs/ollama-api.md
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { ollamaChat, isLlmConfigured } = require('../utils/ollamaClient');

const router = express.Router();

/** Unauthenticated health for mounts / curl (POST /chat still requires JWT). */
router.get('/ping', (req, res) => {
  res.json({
    ok: true,
    llmEnabled: isLlmConfigured(),
    postChat: 'POST /api/ai/chat with Authorization: Bearer <token> and JSON { messages: [...] }',
  });
});

router.use(authenticateToken);

const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);
const MAX_MESSAGES = 24;
/** Quiz + study prompts can be large (custom instructions, sample questions). */
const MAX_CONTENT_LEN = 64000;

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'messages must be a non-empty array';
  }
  if (messages.length > MAX_MESSAGES) {
    return `messages length must be at most ${MAX_MESSAGES}`;
  }
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (!m || typeof m !== 'object') {
      return `messages[${i}] must be an object`;
    }
    if (!ALLOWED_ROLES.has(m.role)) {
      return `messages[${i}].role must be system, user, or assistant`;
    }
    if (typeof m.content !== 'string') {
      return `messages[${i}].content must be a string`;
    }
    if (m.content.length > MAX_CONTENT_LEN) {
      return `messages[${i}].content exceeds max length`;
    }
  }
  return null;
}

/**
 * POST /api/ai/chat
 * Body: { messages, temperature?, num_predict? }
 */
router.post('/chat', async (req, res, next) => {
  const userId = req.user?.id || 'unknown';
  const started = Date.now();
  console.info(`[api.ai.chat] start userId=${userId}`);
  try {
    if (!isLlmConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'AI is disabled (OLLAMA_DISABLED).',
      });
    }

    const { messages, temperature, num_predict, timeoutMs } = req.body || {};
    const validationError = validateMessages(messages);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const temp =
      typeof temperature === 'number' && Number.isFinite(temperature)
        ? Math.min(2, Math.max(0, temperature))
        : 0.7;
    const tokens =
      typeof num_predict === 'number' &&
      Number.isFinite(num_predict) &&
      num_predict > 0
        ? Math.min(32768, Math.floor(num_predict))
        : 4096;

    let requestTimeoutMs;
    if (
      typeof timeoutMs === 'number' &&
      Number.isFinite(timeoutMs) &&
      timeoutMs > 0
    ) {
      requestTimeoutMs = Math.min(
        3_600_000,
        Math.max(30_000, Math.floor(timeoutMs))
      );
    }

    const { content, model } = await ollamaChat({
      messages,
      temperature: temp,
      num_predict: tokens,
      logContext: `api.ai.chat userId=${userId}`,
      requestTimeoutMs,
    });

    console.info(
      `[api.ai.chat] ok userId=${userId} ms=${Date.now() - started} chars=${content?.length ?? 0}`
    );
    res.json({ success: true, content, model });
  } catch (err) {
    console.error(`[api.ai.chat] error userId=${userId} ms=${Date.now() - started}`, err);
    next(err);
  }
});

module.exports = router;
