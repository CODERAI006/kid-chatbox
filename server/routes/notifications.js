/**
 * In-app notification routes for students.
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function mapNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    linkPath: row.link_path,
    metadata: row.metadata || {},
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

/** GET /api/notifications */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const unreadOnly = req.query.unreadOnly === 'true';
    const params = [req.user.id];
    let query = `
      SELECT id, type, title, body, link_path, metadata, is_read, created_at
      FROM user_notifications
      WHERE user_id = $1`;
    if (unreadOnly) query += ' AND is_read = false';
    query += ` ORDER BY created_at DESC LIMIT $2`;
    params.push(limit);

    const result = await pool.query(query, params);
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM user_notifications WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );

    res.json({
      success: true,
      notifications: result.rows.map(mapNotification),
      unreadCount: countRes.rows[0]?.count ?? 0,
    });
  } catch (error) {
    next(error);
  }
});

/** PATCH /api/notifications/read-all — must be before /:id/read */
router.patch('/read-all', authenticateToken, async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE user_notifications
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/** PATCH /api/notifications/:id/read */
router.patch('/:id/read', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE user_notifications
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
