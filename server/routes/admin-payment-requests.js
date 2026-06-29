/**
 * Admin — review payment proofs and activate plans
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { assignPlanToUser } = require('../utils/plans');
const { createUserNotification } = require('../utils/userNotifications');

const router = express.Router();
router.use(authenticateToken);
router.use(checkPermission('manage_users'));

const proofsDir = path.join(__dirname, '../../uploads/payment-proofs');

function mapRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    planId: row.plan_id,
    planName: row.plan_name,
    amount: parseFloat(row.amount),
    screenshotPath: row.screenshot_path,
    screenshotUrl: row.screenshot_path ? `/api/admin/payment-requests/${row.id}/screenshot` : null,
    transactionRef: row.transaction_ref,
    status: row.status,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
  };
}

/** GET /api/admin/payment-requests?status=pending&page=1&limit=20 */
router.get('/', async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10) || 20, 50);
    const offset = (page - 1) * limit;

    const params = [];
    let where = '1=1';
    if (status !== 'all') {
      params.push(status);
      where += ` AND pr.status = $${params.length}`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM payment_requests pr WHERE ${where}`,
      params
    );

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT pr.*, u.name AS user_name, u.email AS user_email, p.name AS plan_name
       FROM payment_requests pr
       INNER JOIN users u ON u.id = pr.user_id
       INNER JOIN plans p ON p.id = pr.plan_id
       WHERE ${where}
       ORDER BY pr.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      success: true,
      requests: rows.map(mapRow),
      total: countRes.rows[0]?.total ?? 0,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/admin/payment-requests/:id/screenshot */
router.get('/:id/screenshot', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT screenshot_path FROM payment_requests WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length || !rows[0].screenshot_path) {
      return res.status(404).json({ success: false, message: 'Screenshot not found' });
    }
    const filePath = path.join(proofsDir, rows[0].screenshot_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File missing' });
    }
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

/** POST /api/admin/payment-requests/:id/approve */
router.post('/:id/approve', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT * FROM payment_requests WHERE id = $1 FOR UPDATE`,
      [req.params.id]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Payment request not found' });
    }
    const pr = rows[0];
    if (pr.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Request already ${pr.status}` });
    }

    await assignPlanToUser(pr.user_id, pr.plan_id, req.user.id, client);

    await client.query(
      `UPDATE payment_requests
       SET status = 'approved', reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [pr.id, req.user.id]
    );

    const planRes = await client.query('SELECT name FROM plans WHERE id = $1', [pr.plan_id]);
    const planName = planRes.rows[0]?.name || 'your plan';

    await createUserNotification(client, {
      userId: pr.user_id,
      type: 'plan_activated',
      title: 'Plan activated!',
      body: `Your ${planName} plan is now active. Enjoy learning!`,
      linkPath: '/dashboard',
    });

    await client.query('COMMIT');
    res.json({ success: true, message: `Plan "${planName}" activated for user.` });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/** POST /api/admin/payment-requests/:id/reject */
router.post('/:id/reject', async (req, res, next) => {
  try {
    const { adminNotes } = req.body || {};
    const { rows } = await pool.query(
      `UPDATE payment_requests
       SET status = 'rejected',
           admin_notes = $2,
           reviewed_by = $3,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [req.params.id, adminNotes ? String(adminNotes).trim() : null, req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Pending request not found' });
    }

    const pr = rows[0];
    const planRes = await pool.query('SELECT name FROM plans WHERE id = $1', [pr.plan_id]);

    await createUserNotification(pool, {
      userId: pr.user_id,
      type: 'payment_rejected',
      title: 'Payment not verified',
      body: adminNotes
        ? String(adminNotes)
        : 'We could not verify your payment. Please try again or contact support.',
      linkPath: '/upgrade-plan',
    });

    res.json({ success: true, message: 'Payment request rejected.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
