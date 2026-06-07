/**
 * Persisted learning chat (Ollama via server). Same bot for students and admins.
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { ollamaChat, isLlmConfigured } = require('../utils/ollamaClient');
const { SYSTEM_PROMPT } = require('../utils/learningBotPrompt');
const { parseLearningWorkspace } = require('../utils/learningWorkspaceParse');

const router = express.Router();
router.use(authenticateToken);

const MAX_USER_TEXT = 16000;
/** User+assistant pairs sent to Ollama (system added separately). */
const MAX_CONTEXT_MESSAGES = 22;
const MAX_MESSAGES_RETURN = 500;

/**
 * GET /api/learning-bot/conversation
 */
router.get('/conversation', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conv = await pool.query(
      `SELECT id FROM learning_bot_conversations
       WHERE user_id = $1 AND archived = false
       ORDER BY updated_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (conv.rows.length === 0) {
      return res.json({ success: true, conversationId: null, messages: [] });
    }

    const conversationId = conv.rows[0].id;
    const msgs = await pool.query(
      `SELECT id, role, content FROM learning_bot_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [conversationId, MAX_MESSAGES_RETURN]
    );

    res.json({
      success: true,
      conversationId,
      messages: msgs.rows.map((r) => ({
        id: r.id,
        role: r.role,
        content: r.content,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/learning-bot/conversation/reset — archive active thread(s) for this user.
 */
router.post('/conversation/reset', async (req, res, next) => {
  try {
    const userId = req.user.id;
    await pool.query(
      `UPDATE learning_bot_conversations SET archived = true, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND archived = false`,
      [userId]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/learning-bot/message
 * Body: { conversationId?: string | null, text: string }
 */
router.post('/message', async (req, res, next) => {
  try {
    if (!isLlmConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'AI is disabled (OLLAMA_DISABLED).',
      });
    }

    let { conversationId, text } = req.body || {};
    if (typeof text !== 'string') {
      return res.status(400).json({ success: false, message: 'text is required' });
    }
    text = text.trim();
    if (!text) {
      return res.status(400).json({ success: false, message: 'text is empty' });
    }
    if (text.length > MAX_USER_TEXT) {
      return res.status(400).json({ success: false, message: 'text is too long' });
    }

    const userId = req.user.id;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (!conversationId) {
        const ins = await client.query(
          `INSERT INTO learning_bot_conversations (user_id) VALUES ($1) RETURNING id`,
          [userId]
        );
        conversationId = ins.rows[0].id;
      } else {
        const check = await client.query(
          `SELECT id FROM learning_bot_conversations
           WHERE id = $1 AND user_id = $2 AND archived = false`,
          [conversationId, userId]
        );
        if (check.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ success: false, message: 'Conversation not found' });
        }
      }

      await client.query(
        `INSERT INTO learning_bot_messages (conversation_id, role, content)
         VALUES ($1, 'user', $2)`,
        [conversationId, text]
      );

      const hist = await client.query(
        `SELECT role, content FROM learning_bot_messages
         WHERE conversation_id = $1 AND role IN ('user', 'assistant')
         ORDER BY created_at ASC`,
        [conversationId]
      );

      const tail = hist.rows.slice(-MAX_CONTEXT_MESSAGES).map((r) => ({
        role: r.role,
        content: r.content,
      }));

      const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...tail];

      const { content, model } = await ollamaChat({
        messages,
        temperature: 0.55,
        num_predict: 8192,
        logContext: `api.learning-bot userId=${userId}`,
      });

      const structured = parseLearningWorkspace(content);

      await client.query(
        `INSERT INTO learning_bot_messages (conversation_id, role, content)
         VALUES ($1, 'assistant', $2)`,
        [conversationId, content]
      );

      await client.query(
        `UPDATE learning_bot_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [conversationId]
      );

      await client.query('COMMIT');
      res.json({
        success: true,
        conversationId,
        content,
        structured,
        model,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
