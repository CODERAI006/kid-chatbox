/**
 * User payment proof submissions
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { getPublicPaymentConfig } = require('../utils/paymentSettings');

const router = express.Router();

const proofsDir = path.join(__dirname, '../../uploads/payment-proofs');
if (!fs.existsSync(proofsDir)) {
  fs.mkdirSync(proofsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, proofsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase();
    if (mime.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image screenshots are allowed'));
  },
});

function mapRequest(row) {
  return {
    id: row.id,
    planId: row.plan_id,
    planName: row.plan_name,
    amount: parseFloat(row.amount),
    transactionRef: row.transaction_ref,
    status: row.status,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

/** GET /api/payment-requests/mine */
router.get('/mine', authenticateToken, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT pr.*, p.name AS plan_name
       FROM payment_requests pr
       INNER JOIN plans p ON p.id = pr.plan_id
       WHERE pr.user_id = $1
       ORDER BY pr.created_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    res.json({ success: true, requests: rows.map(mapRequest) });
  } catch (err) {
    next(err);
  }
});

/** POST /api/payment-requests — submit payment proof */
router.post('/', authenticateToken, upload.single('screenshot'), async (req, res, next) => {
  try {
    const config = await getPublicPaymentConfig();
    if (!config.enabled) {
      return res.status(400).json({ success: false, message: 'Online payments are not enabled yet. Contact admin.' });
    }

    const { planId, transactionRef } = req.body || {};
    if (!planId) {
      return res.status(400).json({ success: false, message: 'Plan ID is required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Payment screenshot is required' });
    }

    const planRes = await pool.query(
      `SELECT id, name, monthly_cost, status FROM plans WHERE id = $1`,
      [planId]
    );
    if (!planRes.rows.length || planRes.rows[0].status !== 'active') {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    const plan = planRes.rows[0];
    if (parseFloat(plan.monthly_cost) <= 0) {
      return res.status(400).json({ success: false, message: 'This plan is free — no payment needed' });
    }

    const pending = await pool.query(
      `SELECT id FROM payment_requests
       WHERE user_id = $1 AND plan_id = $2 AND status = 'pending'`,
      [req.user.id, planId]
    );
    if (pending.rows.length) {
      return res.status(409).json({
        success: false,
        message: 'You already have a pending payment request for this plan.',
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO payment_requests (user_id, plan_id, amount, screenshot_path, transaction_ref)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        req.user.id,
        planId,
        plan.monthly_cost,
        req.file.filename,
        transactionRef ? String(transactionRef).trim().slice(0, 120) : null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Payment proof submitted. We will activate your plan after verification.',
      request: {
        id: rows[0].id,
        planName: plan.name,
        amount: parseFloat(rows[0].amount),
        status: rows[0].status,
        phoneNumber: config.phoneNumber,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
