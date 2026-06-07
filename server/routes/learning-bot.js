/**
 * Persisted learning chat (Ollama via server). Same bot for students and admins.
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { ollamaChat, isLlmConfigured } = require('../utils/ollamaClient');
const { resolveSystemPrompt } = require('../utils/learningBotPrompt');
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
 * POST /api/learning-bot/conversation/save — archive current thread (keeps in saved list).
 */
router.post('/conversation/save', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `UPDATE learning_bot_conversations SET archived = true, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND archived = false
       RETURNING id`,
      [userId]
    );
    res.json({ success: true, savedCount: result.rowCount });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/learning-bot/conversations — saved + active threads.
 */
router.get('/conversations', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const rows = await pool.query(
      `SELECT c.id, c.archived, c.updated_at, c.created_at,
        (SELECT content FROM learning_bot_messages m
         WHERE m.conversation_id = c.id AND m.role = 'user'
         ORDER BY m.created_at ASC LIMIT 1) AS preview,
        (SELECT COUNT(*)::int FROM learning_bot_messages m WHERE m.conversation_id = c.id) AS message_count
       FROM learning_bot_conversations c
       WHERE c.user_id = $1
         AND EXISTS (SELECT 1 FROM learning_bot_messages m WHERE m.conversation_id = c.id)
       ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({
      success: true,
      conversations: rows.rows.map((r) => ({
        id: r.id,
        archived: r.archived,
        preview: r.preview ? String(r.preview).slice(0, 120) : '',
        messageCount: r.message_count || 0,
        updatedAt: r.updated_at,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/learning-bot/conversations/:id/open — load a saved thread as active.
 */
router.post('/conversations/:id/open', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const check = await pool.query(
      `SELECT id FROM learning_bot_conversations WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    await pool.query(
      `UPDATE learning_bot_conversations SET archived = true, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND archived = false AND id <> $2`,
      [userId, id]
    );
    await pool.query(
      `UPDATE learning_bot_conversations SET archived = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    const msgs = await pool.query(
      `SELECT id, role, content FROM learning_bot_messages
       WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2`,
      [id, MAX_MESSAGES_RETURN]
    );

    res.json({
      success: true,
      conversationId: id,
      messages: msgs.rows.map((r) => ({ id: r.id, role: r.role, content: r.content })),
    });
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

    let { conversationId, text, mode, format } = req.body || {};
    const chatMode = mode === 'chat' ? 'chat' : 'workspace';
    const studyFormat = typeof format === 'string' ? format.trim() : '';
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

      const systemPrompt = resolveSystemPrompt(chatMode, studyFormat);
      const messages = [{ role: 'system', content: systemPrompt }, ...tail];

      const isChat = chatMode === 'chat';
      const { content, model } = await ollamaChat({
        messages,
        temperature: isChat ? 0.65 : 0.55,
        num_predict: isChat ? 2048 : 8192,
        logContext: `api.learning-bot userId=${userId} mode=${chatMode}`,
      });

      const structured = isChat ? null : parseLearningWorkspace(content);

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
