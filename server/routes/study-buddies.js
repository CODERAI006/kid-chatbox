/**
 * Study buddy routes — connect by buddy ID, share quizzes.
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkModuleAccess } = require('../middleware/rbac');
const { copyLibraryToQuiz } = require('../utils/libraryToQuiz');
const { createUserNotification } = require('../utils/userNotifications');

const router = express.Router();

function pairIds(a, b) {
  return a < b ? [a, b] : [b, a];
}

async function areBuddies(userId, otherUserId) {
  const [userA, userB] = pairIds(userId, otherUserId);
  const res = await pool.query(
    `SELECT 1 FROM study_buddy_connections WHERE user_a_id = $1 AND user_b_id = $2 LIMIT 1`,
    [userA, userB]
  );
  return res.rows.length > 0;
}

async function findUserByBuddyId(buddyId) {
  const res = await pool.query(
    `SELECT id, name, buddy_id, grade, age FROM users WHERE LOWER(buddy_id) = LOWER($1) AND status IN ('approved', 'enabled')`,
    [String(buddyId || '').trim()]
  );
  return res.rows[0] || null;
}

function mapBuddyRow(row) {
  let connectedVia = null;
  if (row.connected_via === 'sent') connectedVia = 'you_sent';
  else if (row.connected_via === 'received') connectedVia = 'they_sent';

  return {
    id: row.id,
    buddyId: row.buddy_id,
    name: row.name,
    grade: row.grade,
    age: row.age,
    connectedAt: row.connected_at,
    connectedVia,
  };
}

/** GET /api/study-buddies — dashboard summary */
router.get('/', authenticateToken, checkModuleAccess('quiz'), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const meRes = await pool.query(
      'SELECT buddy_id, name FROM users WHERE id = $1',
      [userId]
    );
    const buddiesRes = await pool.query(
      `SELECT u.id, u.buddy_id, u.name, u.grade, u.age, c.connected_at,
              CASE
                WHEN latest.from_user_id = $1 THEN 'sent'
                WHEN latest.to_user_id = $1 THEN 'received'
                ELSE NULL
              END AS connected_via
       FROM study_buddy_connections c
       JOIN users u ON u.id = CASE WHEN c.user_a_id = $1 THEN c.user_b_id ELSE c.user_a_id END
       LEFT JOIN LATERAL (
         SELECT r.from_user_id, r.to_user_id
         FROM study_buddy_requests r
         WHERE r.status = 'accepted'
           AND (
             (r.from_user_id = $1 AND r.to_user_id = u.id)
             OR (r.from_user_id = u.id AND r.to_user_id = $1)
           )
         ORDER BY r.updated_at DESC NULLS LAST, r.created_at DESC
         LIMIT 1
       ) latest ON true
       WHERE c.user_a_id = $1 OR c.user_b_id = $1
       ORDER BY c.connected_at DESC`,
      [userId]
    );
    const incomingRes = await pool.query(
      `SELECT r.id, r.message, r.created_at, u.id AS from_user_id, u.name, u.buddy_id
       FROM study_buddy_requests r
       JOIN users u ON u.id = r.from_user_id
       WHERE r.to_user_id = $1 AND r.status = 'pending'
       ORDER BY r.created_at DESC`,
      [userId]
    );
    const outgoingRes = await pool.query(
      `SELECT r.id, r.message, r.created_at, u.id AS to_user_id, u.name, u.buddy_id
       FROM study_buddy_requests r
       JOIN users u ON u.id = r.to_user_id
       WHERE r.from_user_id = $1 AND r.status = 'pending'
       ORDER BY r.created_at DESC`,
      [userId]
    );
    const sharesRes = await pool.query(
      `SELECT s.id, s.message, s.status, s.created_at,
              u.id AS from_user_id, u.name AS from_name, u.buddy_id AS from_buddy_id,
              q.id AS quiz_library_id, q.title, q.subject, q.difficulty, q.question_count
       FROM study_buddy_quiz_shares s
       JOIN users u ON u.id = s.from_user_id
       JOIN quiz_library q ON q.id = s.quiz_library_id
       WHERE s.to_user_id = $1
       ORDER BY s.created_at DESC
       LIMIT 30`,
      [userId]
    );

    res.json({
      success: true,
      myBuddyId: meRes.rows[0]?.buddy_id || null,
      myName: meRes.rows[0]?.name || null,
      buddies: buddiesRes.rows.map(mapBuddyRow),
      incomingRequests: incomingRes.rows.map((r) => ({
        id: r.id,
        message: r.message,
        createdAt: r.created_at,
        from: { id: r.from_user_id, name: r.name, buddyId: r.buddy_id },
      })),
      outgoingRequests: outgoingRes.rows.map((r) => ({
        id: r.id,
        message: r.message,
        createdAt: r.created_at,
        to: { id: r.to_user_id, name: r.name, buddyId: r.buddy_id },
      })),
      receivedQuizShares: sharesRes.rows.map((s) => ({
        id: s.id,
        message: s.message,
        status: s.status,
        createdAt: s.created_at,
        from: { id: s.from_user_id, name: s.from_name, buddyId: s.from_buddy_id },
        quiz: {
          id: s.quiz_library_id,
          title: s.title,
          subject: s.subject,
          difficulty: s.difficulty,
          questionCount: s.question_count,
        },
      })),
    });
  } catch (error) {
    next(error);
  }
});

/** GET /api/study-buddies/lookup/:buddyId */
router.get('/lookup/:buddyId', authenticateToken, checkModuleAccess('quiz'), async (req, res, next) => {
  try {
    const target = await findUserByBuddyId(req.params.buddyId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'No student found with that Buddy ID' });
    }
    if (target.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'That is your own Buddy ID' });
    }
    const connected = await areBuddies(req.user.id, target.id);
    res.json({
      success: true,
      user: {
        id: target.id,
        buddyId: target.buddy_id,
        name: target.name,
        grade: target.grade,
        age: target.age,
        isBuddy: connected,
      },
    });
  } catch (error) {
    next(error);
  }
});

/** POST /api/study-buddies/requests { buddyId, message? } */
router.post('/requests', authenticateToken, checkModuleAccess('quiz'), async (req, res, next) => {
  try {
    const { buddyId, message } = req.body;
    if (!buddyId) {
      return res.status(400).json({ success: false, message: 'buddyId is required' });
    }
    const target = await findUserByBuddyId(buddyId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'No student found with that Buddy ID' });
    }
    if (target.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot send a request to yourself' });
    }
    if (await areBuddies(req.user.id, target.id)) {
      return res.status(409).json({ success: false, message: 'You are already study buddies' });
    }
    const pending = await pool.query(
      `SELECT id, from_user_id FROM study_buddy_requests
       WHERE status = 'pending'
         AND ((from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1))`,
      [req.user.id, target.id]
    );
    if (pending.rows.length > 0) {
      const row = pending.rows[0];
      const msg = row.from_user_id === req.user.id
        ? 'You already sent a buddy request to this student'
        : 'This student already sent you a request — check incoming requests';
      return res.status(409).json({ success: false, message: msg });
    }

    const senderRes = await pool.query('SELECT name, buddy_id FROM users WHERE id = $1', [req.user.id]);
    const sender = senderRes.rows[0];

    const result = await pool.query(
      `INSERT INTO study_buddy_requests (from_user_id, to_user_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [req.user.id, target.id, message?.trim() || null]
    );

    await createUserNotification(pool, {
      userId: target.id,
      type: 'buddy_request',
      title: `${sender?.name || 'A student'} sent you a study buddy request`,
      body: message?.trim() || 'Open Study Buddies to accept and share quizzes together.',
      linkPath: '/study-buddies',
      metadata: {
        requestId: result.rows[0].id,
        fromUserId: req.user.id,
        fromBuddyId: sender?.buddy_id,
        fromName: sender?.name,
      },
    });

    res.status(201).json({
      success: true,
      request: {
        id: result.rows[0].id,
        createdAt: result.rows[0].created_at,
        to: { id: target.id, name: target.name, buddyId: target.buddy_id },
      },
      message: 'Study buddy request sent!',
    });
  } catch (error) {
    next(error);
  }
});

/** PATCH /api/study-buddies/requests/:id { action: accept|reject|cancel } */
router.patch('/requests/:id', authenticateToken, checkModuleAccess('quiz'), async (req, res, next) => {
  const { action } = req.body;
  if (!['accept', 'reject', 'cancel'].includes(action)) {
    return res.status(400).json({ success: false, message: 'action must be accept, reject, or cancel' });
  }

  const client = await pool.connect();
  let inTransaction = false;

  const abort = async (status, message) => {
    if (inTransaction) {
      await client.query('ROLLBACK').catch(() => {});
      inTransaction = false;
    }
    res.status(status).json({ success: false, message });
  };

  try {
    const userId = String(req.user.id);
    await client.query('BEGIN');
    inTransaction = true;

    const reqRes = await client.query(
      'SELECT * FROM study_buddy_requests WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (!reqRes.rows.length) {
      await abort(404, 'Request not found');
      return;
    }

    const row = reqRes.rows[0];
    if (row.status !== 'pending') {
      await abort(409, 'Request is no longer pending');
      return;
    }

    const isRecipient = String(row.to_user_id) === userId;
    const isSender = String(row.from_user_id) === userId;
    if (action === 'cancel' && !isSender) {
      await abort(403, 'Only the sender can cancel');
      return;
    }
    if ((action === 'accept' || action === 'reject') && !isRecipient) {
      await abort(403, 'Only the recipient can accept or reject');
      return;
    }

    const newStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'cancelled';
    await client.query(
      `UPDATE study_buddy_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newStatus, row.id]
    );

    if (action === 'accept') {
      await client.query(
        `INSERT INTO study_buddy_connections (user_a_id, user_b_id)
         SELECT LEAST($1::uuid, $2::uuid), GREATEST($1::uuid, $2::uuid)
         ON CONFLICT (user_a_id, user_b_id) DO NOTHING`,
        [row.from_user_id, row.to_user_id]
      );
    }

    await client.query('COMMIT');
    inTransaction = false;

    res.json({
      success: true,
      status: newStatus,
      message: action === 'accept' ? 'You are now study buddies!' : `Request ${newStatus}`,
    });
  } catch (error) {
    if (inTransaction) {
      await client.query('ROLLBACK').catch(() => {});
    }
    if (error.code === '42P01') {
      return res.status(503).json({
        success: false,
        message: 'Study buddy tables are missing. Run database migrations and try again.',
      });
    }
    if (error.code === '42703') {
      return res.status(503).json({
        success: false,
        message: 'Study buddy database schema is out of date. Run database migrations and try again.',
      });
    }
    next(error);
  } finally {
    client.release();
  }
});

/** POST /api/study-buddies/quiz-shares { buddyIds[], buddyId?, quizLibraryId, message? } */
router.post('/quiz-shares', authenticateToken, checkModuleAccess('quiz'), async (req, res, next) => {
  try {
    const { buddyId, buddyIds, quizLibraryId, message } = req.body;
    const idList = [
      ...(Array.isArray(buddyIds) ? buddyIds : []),
      ...(buddyId ? [buddyId] : []),
    ]
      .map((v) => String(v || '').trim().toLowerCase())
      .filter(Boolean);
    const uniqueBuddyIds = [...new Set(idList)];

    if (!uniqueBuddyIds.length || !quizLibraryId) {
      return res.status(400).json({
        success: false,
        message: 'buddyIds (or buddyId) and quizLibraryId are required',
      });
    }

    const quizRes = await pool.query(
      'SELECT id, title FROM quiz_library WHERE id = $1 AND is_active = true',
      [quizLibraryId]
    );
    if (!quizRes.rows.length) {
      return res.status(404).json({ success: false, message: 'Quiz not found in library' });
    }

    const senderRes = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const senderName = senderRes.rows[0]?.name || 'Your study buddy';
    const shares = [];
    const skipped = [];

    for (const bid of uniqueBuddyIds) {
      const target = await findUserByBuddyId(bid);
      if (!target) {
        skipped.push({ buddyId: bid, reason: 'not_found' });
        continue;
      }
      if (!(await areBuddies(req.user.id, target.id))) {
        skipped.push({ buddyId: bid, reason: 'not_buddy' });
        continue;
      }

      const result = await pool.query(
        `INSERT INTO study_buddy_quiz_shares (from_user_id, to_user_id, quiz_library_id, message)
         VALUES ($1, $2, $3, $4)
         RETURNING id, created_at`,
        [req.user.id, target.id, quizLibraryId, message?.trim() || null]
      );

      await createUserNotification(pool, {
        userId: target.id,
        type: 'buddy_quiz_share',
        title: `${senderName} shared a quiz with you`,
        body: quizRes.rows[0].title,
        linkPath: '/study-buddies',
        metadata: {
          shareId: result.rows[0].id,
          quizLibraryId,
          quizTitle: quizRes.rows[0].title,
          fromUserId: req.user.id,
        },
      });

      shares.push({
        id: result.rows[0].id,
        createdAt: result.rows[0].created_at,
        to: { id: target.id, name: target.name, buddyId: target.buddy_id },
      });
    }

    if (!shares.length) {
      return res.status(400).json({
        success: false,
        message: 'Quiz was not shared — pick accepted study buddies only',
        skipped,
      });
    }

    res.status(201).json({
      success: true,
      shares,
      sharedCount: shares.length,
      skipped,
      message:
        shares.length === 1
          ? 'Quiz shared with your study buddy!'
          : `Quiz shared with ${shares.length} study buddies!`,
    });
  } catch (error) {
    next(error);
  }
});

/** POST /api/study-buddies/quiz-shares/:id/start */
router.post('/quiz-shares/:id/start', authenticateToken, checkModuleAccess('quiz'), async (req, res, next) => {
  try {
    const shareRes = await pool.query(
      `SELECT * FROM study_buddy_quiz_shares WHERE id = $1 AND to_user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!shareRes.rows.length) {
      return res.status(404).json({ success: false, message: 'Shared quiz not found' });
    }
    const share = shareRes.rows[0];
    const quizId = await copyLibraryToQuiz(share.quiz_library_id, req.user.id);
    await pool.query(
      `UPDATE study_buddy_quiz_shares
       SET status = 'started', read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE id = $1`,
      [share.id]
    );
    res.json({ success: true, quizId, message: 'Quiz ready — good luck!' });
  } catch (error) {
    if (error.message === 'Quiz library item not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
});

/** PATCH /api/study-buddies/quiz-shares/:id/read */
router.patch('/quiz-shares/:id/read', authenticateToken, checkModuleAccess('quiz'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE study_buddy_quiz_shares
       SET status = CASE WHEN status = 'unread' THEN 'read' ELSE status END,
           read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE id = $1 AND to_user_id = $2
       RETURNING id, status`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Shared quiz not found' });
    }
    res.json({ success: true, status: result.rows[0].status });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
