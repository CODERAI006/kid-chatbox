/**
 * Quiz Scheduler API — jobs, batches, today's library sets (IST).
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { runSchedulerJob } = require('../services/schedulerEngine');
const { getZonedParts, DEFAULT_TIMEZONE } = require('../utils/timezoneUtils');

const router = express.Router();

const isAdmin = (req, res, next) => {
  if (!req.user?.roles?.includes('admin') && !req.user?.roles?.includes('super_admin')) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

const validateJob = (body) => {
  const { job_name, frequency_type, run_time, question_count, difficulty } = body;
  if (!job_name || !frequency_type || !run_time || !question_count || !difficulty) {
    return 'Missing required fields: job_name, frequency_type, run_time, question_count, difficulty';
  }
  if (!['daily', 'weekly'].includes(frequency_type)) return 'frequency_type must be daily or weekly';
  if (!/^\d{2}:\d{2}$/.test(run_time)) return 'run_time must be HH:mm format';
  if (frequency_type === 'weekly' && (body.day_of_week == null || body.day_of_week < 0 || body.day_of_week > 6)) {
    return 'day_of_week (0-6) required for weekly jobs';
  }
  if (!['Easy', 'Medium', 'Hard', 'Mixed'].includes(difficulty)) {
    return 'difficulty must be Easy, Medium, Hard, or Mixed';
  }

  const subtopicIds = body.subtopic_ids || [];
  const topicIds = body.topic_ids || [];
  const legacyTopics = body.topics || [];

  if (subtopicIds.length === 0 && topicIds.length === 0) {
    if (!Array.isArray(legacyTopics) || legacyTopics.length === 0) {
      return 'Select at least one topic or subtopic (or legacy topics array)';
    }
  }

  return null;
};

const jobColumns = `id, job_name, frequency_type, run_time, day_of_week, topics,
  question_count, difficulty, visibility_start_offset_mins, visibility_duration_mins,
  status, last_run_at, created_by, created_at, updated_at,
  sets_per_run, topic_ids, subtopic_ids, timezone, last_batch_id`;

function normalizeJobPayload(body) {
  return {
    job_name: body.job_name,
    frequency_type: body.frequency_type,
    run_time: body.run_time,
    day_of_week: body.day_of_week ?? null,
    topics: JSON.stringify(body.topics || []),
    question_count: body.question_count,
    difficulty: body.difficulty,
    visibility_start_offset_mins: body.visibility_start_offset_mins ?? 0,
    visibility_duration_mins: body.visibility_duration_mins ?? null,
    status: body.status || 'active',
    sets_per_run: Math.min(10, Math.max(1, Number(body.sets_per_run) || 5)),
    topic_ids: body.topic_ids || [],
    subtopic_ids: body.subtopic_ids || [],
    timezone: body.timezone || DEFAULT_TIMEZONE,
  };
}

router.get('/jobs', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${jobColumns} FROM quiz_scheduler_jobs ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/jobs/:id', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${jobColumns} FROM quiz_scheduler_jobs WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/jobs', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const err = validateJob(req.body);
    if (err) return res.status(400).json({ success: false, message: err });

    const p = normalizeJobPayload(req.body);
    const { rows } = await pool.query(
      `INSERT INTO quiz_scheduler_jobs
         (job_name, frequency_type, run_time, day_of_week, topics, question_count,
          difficulty, visibility_start_offset_mins, visibility_duration_mins, status,
          created_by, sets_per_run, topic_ids, subtopic_ids, timezone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        p.job_name, p.frequency_type, p.run_time, p.day_of_week, p.topics, p.question_count,
        p.difficulty, p.visibility_start_offset_mins, p.visibility_duration_mins, p.status,
        req.user.id, p.sets_per_run, p.topic_ids, p.subtopic_ids, p.timezone,
      ]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/jobs/:id', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const err = validateJob(req.body);
    if (err) return res.status(400).json({ success: false, message: err });

    const p = normalizeJobPayload(req.body);
    const { rows } = await pool.query(
      `UPDATE quiz_scheduler_jobs SET
         job_name=$1, frequency_type=$2, run_time=$3, day_of_week=$4, topics=$5,
         question_count=$6, difficulty=$7, visibility_start_offset_mins=$8,
         visibility_duration_mins=$9, status=$10, sets_per_run=$11, topic_ids=$12,
         subtopic_ids=$13, timezone=$14, updated_at=NOW()
       WHERE id=$15 RETURNING *`,
      [
        p.job_name, p.frequency_type, p.run_time, p.day_of_week, p.topics, p.question_count,
        p.difficulty, p.visibility_start_offset_mins, p.visibility_duration_mins, p.status,
        p.sets_per_run, p.topic_ids, p.subtopic_ids, p.timezone, req.params.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.patch('/jobs/:id/toggle', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE quiz_scheduler_jobs
       SET status = CASE WHEN status='active' THEN 'inactive' ELSE 'active' END, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/jobs/:id', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(`DELETE FROM quiz_scheduler_jobs WHERE id=$1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, message: 'Job deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/jobs/:id/run-now', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM quiz_scheduler_jobs WHERE id=$1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Job not found' });
    const result = await runSchedulerJob(rows[0], true);
    res.json({ success: true, message: 'Batch generation started', data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/batches', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, j.job_name
       FROM quiz_generation_batches b
       LEFT JOIN quiz_scheduler_jobs j ON j.id = b.scheduler_job_id
       ORDER BY b.started_at DESC LIMIT 50`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/generated', authenticateToken, isAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT gq.*, sj.job_name
       FROM generated_quizzes gq
       LEFT JOIN quiz_scheduler_jobs sj ON sj.id = gq.scheduler_job_id
       ORDER BY gq.created_at DESC LIMIT 100`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

/** Today's nightly sets from quiz_library (IST day boundary) */
router.get('/today', authenticateToken, async (req, res, next) => {
  try {
    const tz = DEFAULT_TIMEZONE;
    const { dateKey } = getZonedParts(new Date(), tz);
    const batchPrefix = `${dateKey}-`;

    const { rows: batches } = await pool.query(
      `SELECT id, batch_tag, sets_completed, sets_requested, status, started_at
       FROM quiz_generation_batches
       WHERE batch_tag LIKE $1 || '%'
       ORDER BY started_at DESC LIMIT 1`,
      [batchPrefix]
    );

    if (!batches.length) {
      return res.json({
        success: true,
        data: { batchTag: null, sets: [], dateKey, timezone: tz },
      });
    }

    const batch = batches[0];
    const { rows: sets } = await pool.query(
      `SELECT id, title, subject, subtopics, difficulty, question_count, tags,
              linked_quiz_id, created_at
       FROM quiz_library
       WHERE generation_batch_id = $1 AND is_active = true
       ORDER BY title`,
      [batch.id]
    );

    res.json({
      success: true,
      data: {
        batchTag: batch.batch_tag,
        batchStatus: batch.status,
        dateKey,
        timezone: tz,
        sets,
      },
    });
  } catch (err) {
    next(err);
  }
});

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
  } catch (err) {
    next(err);
  }
});

module.exports = router;
