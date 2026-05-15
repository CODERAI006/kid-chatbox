/**
 * Quiz Scheduler API routes
 * CRUD for scheduler jobs + manual trigger + active quizzes for users
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { runSchedulerJob } = require('../services/schedulerEngine');

const router = express.Router();

// ─── helpers ────────────────────────────────────────────────────────────────

const isAdmin = (req, res, next) => {
  if (!req.user?.roles?.includes('admin') && !req.user?.roles?.includes('super_admin')) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

const validateJob = (body) => {
  const { job_name, frequency_type, run_time, topics, question_count, difficulty } = body;
  if (!job_name || !frequency_type || !run_time || !topics || !question_count || !difficulty) {
    return 'Missing required fields: job_name, frequency_type, run_time, topics, question_count, difficulty';
  }
  if (!['daily', 'weekly'].includes(frequency_type)) return 'frequency_type must be daily or weekly';
  if (!/^\d{2}:\d{2}$/.test(run_time)) return 'run_time must be HH:mm format';
  if (frequency_type === 'weekly' && (body.day_of_week == null || body.day_of_week < 0 || body.day_of_week > 6)) {
    return 'day_of_week (0-6) required for weekly jobs';
  }
  if (!['Easy', 'Medium', 'Hard', 'Mixed'].includes(difficulty)) {
    return 'difficulty must be Easy, Medium, Hard, or Mixed';
  }
  if (!Array.isArray(topics) || topics.length === 0) return 'topics must be a non-empty array';
  return null;
};

// ─── Admin: CRUD ─────────────────────────────────────────────────────────────

// GET /api/quiz-scheduler/jobs
router.get('/jobs', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM quiz_scheduler_jobs ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// GET /api/quiz-scheduler/jobs/:id
router.get('/jobs/:id', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM quiz_scheduler_jobs WHERE id = $1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// POST /api/quiz-scheduler/jobs
router.post('/jobs', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const err = validateJob(req.body);
    if (err) return res.status(400).json({ success: false, message: err });

    const {
      job_name, frequency_type, run_time, day_of_week = null,
      topics, question_count, difficulty,
      visibility_start_offset_mins = 0,
      visibility_duration_mins = null,
      status = 'active',
    } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO quiz_scheduler_jobs
         (job_name, frequency_type, run_time, day_of_week, topics, question_count,
          difficulty, visibility_start_offset_mins, visibility_duration_mins, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [job_name, frequency_type, run_time, day_of_week, JSON.stringify(topics),
       question_count, difficulty, visibility_start_offset_mins, visibility_duration_mins,
       status, req.user.id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// PUT /api/quiz-scheduler/jobs/:id
router.put('/jobs/:id', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const err = validateJob(req.body);
    if (err) return res.status(400).json({ success: false, message: err });

    const {
      job_name, frequency_type, run_time, day_of_week = null,
      topics, question_count, difficulty,
      visibility_start_offset_mins = 0, visibility_duration_mins = null, status = 'active',
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE quiz_scheduler_jobs SET
         job_name=$1, frequency_type=$2, run_time=$3, day_of_week=$4, topics=$5,
         question_count=$6, difficulty=$7, visibility_start_offset_mins=$8,
         visibility_duration_mins=$9, status=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [job_name, frequency_type, run_time, day_of_week, JSON.stringify(topics),
       question_count, difficulty, visibility_start_offset_mins, visibility_duration_mins,
       status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// PATCH /api/quiz-scheduler/jobs/:id/toggle
router.patch('/jobs/:id/toggle', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE quiz_scheduler_jobs
       SET status = CASE WHEN status='active' THEN 'inactive' ELSE 'active' END, updated_at=NOW()
       WHERE id=$1 RETURNING *`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// DELETE /api/quiz-scheduler/jobs/:id
router.delete('/jobs/:id', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM quiz_scheduler_jobs WHERE id=$1`, [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, message: 'Job deleted' });
  } catch (err) { next(err); }
});

// POST /api/quiz-scheduler/jobs/:id/run-now  (manual trigger)
router.post('/jobs/:id/run-now', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM quiz_scheduler_jobs WHERE id=$1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found' });
    const quiz = await runSchedulerJob(rows[0], true);
    res.json({ success: true, message: 'Quiz generated', data: quiz });
  } catch (err) { next(err); }
});

// ─── Admin: Generated quizzes list ───────────────────────────────────────────

router.get('/generated', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT gq.*, sj.job_name
       FROM generated_quizzes gq
       LEFT JOIN quiz_scheduler_jobs sj ON sj.id = gq.scheduler_job_id
       ORDER BY gq.created_at DESC LIMIT 100`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ─── Public: Active quizzes for users ────────────────────────────────────────

// GET /api/quiz-scheduler/active   (authenticated users)
router.get('/active', authenticateToken, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, quiz_title, topics, questions, difficulty, question_count,
              visibility_start_time, visibility_end_time, status, created_at
       FROM generated_quizzes
       WHERE status = 'live'
         AND visibility_start_time <= NOW()
         AND (visibility_end_time IS NULL OR visibility_end_time >= NOW())
       ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
