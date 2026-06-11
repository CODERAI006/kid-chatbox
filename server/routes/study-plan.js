/**
 * Exam prep study plans — daily topic schedules per student.
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function findTodayEntry(schedule) {
  const key = todayKey();
  return (Array.isArray(schedule) ? schedule : []).find((d) => d.date === key) || null;
}

/**
 * GET /api/study-plan/active
 */
router.get('/active', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT id, exam_name, exam_date, hours_per_day, schedule, status, created_at, updated_at
       FROM study_plans
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, plan: null, today: null });
    }

    const row = result.rows[0];
    const schedule = row.schedule || [];
    const today = findTodayEntry(schedule);

    res.json({
      success: true,
      plan: {
        id: row.id,
        examName: row.exam_name,
        examDate: row.exam_date,
        hoursPerDay: Number(row.hours_per_day),
        schedule,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      today,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/study-plan
 */
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { examName, examDate, hoursPerDay, schedule } = req.body || {};

    if (!examName?.trim() || !examDate || !Array.isArray(schedule) || schedule.length === 0) {
      return res.status(400).json({ success: false, message: 'examName, examDate, and schedule are required' });
    }

    await pool.query(
      `UPDATE study_plans SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    const insert = await pool.query(
      `INSERT INTO study_plans (user_id, exam_name, exam_date, hours_per_day, schedule)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, exam_name, exam_date, hours_per_day, schedule, status, created_at`,
      [userId, examName.trim(), examDate, Number(hoursPerDay) || 1, JSON.stringify(schedule)]
    );

    const row = insert.rows[0];
    res.json({
      success: true,
      plan: {
        id: row.id,
        examName: row.exam_name,
        examDate: row.exam_date,
        hoursPerDay: Number(row.hours_per_day),
        schedule: row.schedule,
        status: row.status,
        createdAt: row.created_at,
      },
      today: findTodayEntry(row.schedule),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/study-plan/today — lightweight check for notifications
 */
router.get('/today', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT id, exam_name, schedule FROM study_plans
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, hasPlan: false, today: null });
    }

    const row = result.rows[0];
    const today = findTodayEntry(row.schedule);

    res.json({
      success: true,
      hasPlan: true,
      planId: row.id,
      examName: row.exam_name,
      today,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
