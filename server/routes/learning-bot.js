/**
 * Persisted learning chat (Ollama via server). Same bot for students and admins.
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/rbac');
const { chatRateLimit } = require('../middleware/chatRateLimit');
const { ollamaChat, isLlmConfigured } = require('../utils/ollamaClient');
const { resolveSystemPrompt } = require('../utils/learningBotPrompt');
const { parseLearningWorkspace } = require('../utils/learningWorkspaceParse');
const { shouldUseDataAgent } = require('../modules/chatbot/agents/intentClassifier');
const { runChatAgent } = require('../modules/chatbot/services/chatAgentService');
const { getRegistry } = require('../modules/database-schema/schemaRegistry');

const router = express.Router();
router.use(authenticateToken);
router.use(chatRateLimit);

const MAX_USER_TEXT = 16000;
/** User+assistant pairs sent to Ollama (system added separately). */
const MAX_CONTEXT_MESSAGES = 22;
const MAX_MESSAGES_RETURN = 500;

function requireApprovedUser(req, res, next) {
  const status = req.user?.status;
  if (status && status !== 'approved' && status !== 'enabled') {
    return res.status(403).json({
      success: false,
      message: 'Account pending approval. Chat is available after admin approval.',
    });
  }
  next();
}

/**
 * GET /api/learning-bot/schema — admin schema registry snapshot (debug)
 */
router.get('/schema', checkRole(['admin']), async (req, res, next) => {
  try {
    const reg = getRegistry();
    res.json({
      success: true,
      loadedAt: reg.loadedAt,
      tableCount: reg.tables.length,
      tables: reg.tables.map((t) => ({
        name: t.name,
        purposes: t.purposes,
        columnCount: t.columns.length,
        foreignKeys: t.foreignKeys.length,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/learning-bot/analytics
 * Explicit database-backed performance analysis (always uses data agent).
 */
router.post('/analytics', requireApprovedUser, async (req, res, next) => {
  try {
    const { text } = req.body || {};
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, message: 'text is required' });
    }
    const question = text.trim().slice(0, MAX_USER_TEXT);
    const result = await runChatAgent({
      user: req.user,
      question,
      logContext: `api.learning-bot.analytics userId=${req.user.id}`,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

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
 * GET /api/learning-bot/conversations/:id — read-only thread (does not change active chat).
 */
router.get('/conversations/:id', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const check = await pool.query(
      `SELECT id, archived, updated_at, created_at FROM learning_bot_conversations
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const row = check.rows[0];
    const msgs = await pool.query(
      `SELECT id, role, content FROM learning_bot_messages
       WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2`,
      [id, MAX_MESSAGES_RETURN]
    );

    const preview = await pool.query(
      `SELECT content FROM learning_bot_messages
       WHERE conversation_id = $1 AND role = 'user'
       ORDER BY created_at ASC LIMIT 1`,
      [id]
    );

    res.json({
      success: true,
      conversation: {
        id: row.id,
        archived: row.archived,
        preview: preview.rows[0]?.content
          ? String(preview.rows[0].content).slice(0, 120)
          : '',
        messageCount: msgs.rows.length,
        updatedAt: row.updated_at,
        createdAt: row.created_at,
      },
      messages: msgs.rows.map((r) => ({ id: r.id, role: r.role, content: r.content })),
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
 * POST /api/learning-bot/conversation/export
 * Export conversation to PDF
 */
router.post('/conversation/export', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.body || {};

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'conversationId is required' });
    }

    // Check conversation ownership
    const check = await pool.query(
      `SELECT id FROM learning_bot_conversations WHERE id = $1 AND user_id = $2`,
      [conversationId, userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Get all messages
    const msgs = await pool.query(
      `SELECT id, role, content, created_at FROM learning_bot_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );

    const messages = msgs.rows.map((r) => ({
      id: r.id,
      role: r.role,
      content: r.content,
      timestamp: r.created_at,
    }));

    // Export to PDF using jsPDF (loaded via CDN for server-side)
    // We'll generate HTML and let the frontend handle PDF generation
    res.json({
      success: true,
      conversationId,
      messages,
      downloadUrl: `/api/learning-bot/conversation/${conversationId}/pdf`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/learning-bot/message
 * Body: { conversationId?: string | null, text: string }
 */
router.post('/message', requireApprovedUser, async (req, res, next) => {
  try {
    let { conversationId, text, mode, format } = req.body || {};
    const chatMode = mode === 'chat' ? 'chat' : mode === 'analytics' ? 'analytics' : 'workspace';
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
    const useDataAgent = shouldUseDataAgent(text, chatMode);

    if (!useDataAgent && !isLlmConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'AI is disabled (OLLAMA_DISABLED).',
      });
    }
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

      let content;
      let model;
      let structured = null;
      let dataBacked = false;
      let intent = null;

      if (useDataAgent) {
        const agentResult = await runChatAgent({
          user: req.user,
          question: text,
          logContext: `api.learning-bot.data userId=${userId}`,
        });
        content = agentResult.content;
        model = agentResult.model;
        dataBacked = agentResult.dataBacked;
        intent = agentResult.intent;
      } else {
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

        const systemPrompt = resolveSystemPrompt(chatMode === 'chat' ? 'chat' : 'workspace', studyFormat);
        const messages = [{ role: 'system', content: systemPrompt }, ...tail];

        const isChat = chatMode === 'chat';
        const llmResult = await ollamaChat({
          messages,
          temperature: isChat ? 0.65 : 0.55,
          num_predict: isChat ? 2048 : 12288,
          logContext: `api.learning-bot userId=${userId} mode=${chatMode}`,
        });
        content = llmResult.content;
        model = llmResult.model;
        structured = isChat ? null : parseLearningWorkspace(content);
      }

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
        dataBacked,
        intent,
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

/**
 * GET /api/learning-bot/conversation/:id/download
 * Download conversation as PDF
 */
router.get('/conversation/:id/download', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const check = await pool.query(
      `SELECT id FROM learning_bot_conversations WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Get conversation details
    const convCheck = await pool.query(
      `SELECT id, created_at, updated_at FROM learning_bot_conversations WHERE id = $1`,
      [id]
    );
    if (convCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const conversation = convCheck.rows[0];

    // Get all messages
    const msgs = await pool.query(
      `SELECT role, content, created_at FROM learning_bot_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [id]
    );

    const messages = msgs.rows.map((r) => ({
      role: r.role,
      content: r.content,
      timestamp: r.created_at,
    }));

    // Count messages by role
    const userCount = messages.filter((m) => m.role === 'user').length;
    const assistantCount = messages.filter((m) => m.role === 'assistant').length;

    // Create a simple HTML template for the conversation
    const topic = messages.find((m) => m.role === 'user')?.content?.substring(0, 50) || 'Chat Conversation';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Chat Export - ${topic}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #6366f1; margin: 0; font-size: 24px; }
          .header p { color: #666; margin: 5px 0 0 0; font-size: 14px; }
          .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
          .message.user { background: #e0e7ff; border-left: 4px solid #6366f1; }
          .message.assistant { background: #f9fafb; border-left: 4px solid #10b981; }
          .message-header { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; }
          .message-header .role { font-weight: bold; text-transform: uppercase; }
          .message-content { white-space: pre-wrap; line-height: 1.6; font-size: 14px; }
          .timestamp { color: #666; }
          .footer { border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #999; text-align: center; }
          .stats { display: flex; gap: 20px; justify-content: center; margin-top: 15px; }
          .stat { padding: 5px 15px; background: #f3f4f6; border-radius: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Guru AI Learning Chat</h1>
          <p>Exported on: ${new Date().toLocaleString()}</p>
          <div class="stats">
            <span class="stat">Total Messages: ${messages.length}</span>
            <span class="stat">Questions: ${userCount}</span>
            <span class="stat">Answers: ${assistantCount}</span>
          </div>
        </div>
        ${messages.map((m) => `
          <div class="message ${m.role}">
            <div class="message-header">
              <span class="role">${m.role === 'user' ? 'You' : 'AI Tutor'}</span>
              <span class="timestamp">${new Date(m.timestamp).toLocaleString()}</span>
            </div>
            <div class="message-content">${m.content.replace(/\n/g, '<br>')}</div>
          </div>
        `).join('')}
        <div class="footer">
          <p>Guru AI - AI-Powered Educational Platform</p>
          <p>Conversation ID: ${id}</p>
        </div>
      </body>
      </html>
    `;

    // Set headers for PDF download
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="chat_export_${id.substring(0, 8)}.pdf"`);

    // Send the HTML as the response
    // The frontend will handle converting HTML to PDF using jsPDF
    res.send(html);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
