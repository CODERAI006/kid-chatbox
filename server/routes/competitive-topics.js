/**
 * Competitive exam topics — AI suggestions + per-user saved lists.
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { ollamaChat, isLlmConfigured } = require('../utils/ollamaClient');

const router = express.Router();
router.use(authenticateToken);

const TRACK_META = {
  engineering: { label: 'Engineering (JEE)', defaults: ['Mechanics', 'Organic Chemistry', 'Calculus'] },
  mbbs: { label: 'MBBS / NEET', defaults: ['Human Physiology', 'Genetics', 'Organic Chemistry'] },
  law: { label: 'Law (CLAT)', defaults: ['Legal Reasoning', 'Logical Reasoning', 'English'] },
  upsc: { label: 'UPSC', defaults: ['Indian Polity', 'Modern History', 'Current Affairs'] },
  banking: { label: 'Banking', defaults: ['Quant', 'Reasoning', 'Banking Awareness'] },
  ssc: { label: 'SSC', defaults: ['Arithmetic', 'General Intelligence', 'English'] },
  commerce: { label: 'CA / Commerce', defaults: ['Accounts', 'Business Laws', 'Economics'] },
  defence: { label: 'Defence (NDA)', defaults: ['Mathematics', 'GAT', 'English'] },
};

function normalizeTopics(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((t) => String(t).trim()).filter(Boolean))].slice(0, 40);
}

function parseTopicsFromAi(text) {
  const trimmed = String(text || '').trim();
  const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) return normalizeTopics(parsed);
    } catch {
      /* fall through */
    }
  }
  return normalizeTopics(
    trimmed
      .split(/\n|,/)
      .map((line) => line.replace(/^[\d\.\-\*•)\]]+\s*/, '').trim())
      .filter(Boolean)
  );
}

/** GET /api/competitive-topics/:trackId */
router.get('/:trackId', async (req, res, next) => {
  try {
    const trackId = String(req.params.trackId || '').trim();
    if (!TRACK_META[trackId]) {
      return res.status(400).json({ success: false, message: 'Unknown competitive track' });
    }
    const result = await pool.query(
      `SELECT topics, updated_at FROM user_competitive_topics
       WHERE user_id = $1 AND track_id = $2`,
      [req.user.id, trackId]
    );
    const row = result.rows[0];
    res.json({
      success: true,
      trackId,
      topics: row?.topics || [],
      updatedAt: row?.updated_at || null,
    });
  } catch (err) {
    next(err);
  }
});

/** PUT /api/competitive-topics/:trackId  body: { topics: string[] } */
router.put('/:trackId', async (req, res, next) => {
  try {
    const trackId = String(req.params.trackId || '').trim();
    if (!TRACK_META[trackId]) {
      return res.status(400).json({ success: false, message: 'Unknown competitive track' });
    }
    const topics = normalizeTopics(req.body?.topics);
    const result = await pool.query(
      `INSERT INTO user_competitive_topics (user_id, track_id, topics, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, track_id)
       DO UPDATE SET topics = EXCLUDED.topics, updated_at = CURRENT_TIMESTAMP
       RETURNING topics, updated_at`,
      [req.user.id, trackId, topics]
    );
    res.json({
      success: true,
      trackId,
      topics: result.rows[0].topics,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/competitive-topics/:trackId/generate */
router.post('/:trackId/generate', async (req, res, next) => {
  try {
    const trackId = String(req.params.trackId || '').trim();
    const meta = TRACK_META[trackId];
    if (!meta) {
      return res.status(400).json({ success: false, message: 'Unknown competitive track' });
    }

    const saved = await pool.query(
      `SELECT topics FROM user_competitive_topics WHERE user_id = $1 AND track_id = $2`,
      [req.user.id, trackId]
    );
    const existing = saved.rows[0]?.topics || [];

    if (!isLlmConfigured()) {
      const topics = normalizeTopics([...meta.defaults, ...existing]).slice(0, 12);
      return res.json({ success: true, trackId, topics, source: 'defaults' });
    }

    const gradeHint = req.body?.gradeLevel ? `Student grade: ${req.body.gradeLevel}. ` : '';
    const prompt = `${gradeHint}List 12 high-yield quiz topics for ${meta.label} competitive exam preparation in India.
Return ONLY a JSON array of strings, no markdown. Example: ["Topic A","Topic B"]`;

    const reply = await ollamaChat({
      messages: [
        { role: 'system', content: 'You output valid JSON arrays of short topic names for Indian competitive exams.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      num_predict: 1024,
      requestTimeoutMs: 120000,
    });

    let topics = parseTopicsFromAi(reply?.content || '');
    if (topics.length < 4) {
      topics = normalizeTopics([...meta.defaults, ...existing]);
    } else {
      topics = normalizeTopics([...topics, ...existing]).slice(0, 20);
    }

    await pool.query(
      `INSERT INTO user_competitive_topics (user_id, track_id, topics, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, track_id)
       DO UPDATE SET topics = EXCLUDED.topics, updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, trackId, topics]
    );

    res.json({ success: true, trackId, topics, source: 'ai' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
