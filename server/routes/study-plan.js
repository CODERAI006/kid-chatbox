/**
 * Exam prep study plans — daily topic schedules per student.
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { ollamaChat, isLlmConfigured } = require('../utils/ollamaClient');
const { resolveSystemPrompt } = require('../utils/learningBotPrompt');
const { parseLearningWorkspace } = require('../utils/learningWorkspaceParse');
const { expandStudySubtopics } = require('../utils/studyPlanSubtopics');

const router = express.Router();
router.use(authenticateToken);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function findTodayEntry(schedule) {
  const key = todayKey();
  return (Array.isArray(schedule) ? schedule : []).find((d) => d.date === key) || null;
}

function normalizeDateValue(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const s = String(val);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s.slice(0, 10);
}

function mapPlanRow(row) {
  const schedule = row.schedule || [];
  return {
    id: row.id,
    examName: row.exam_name,
    examBoard: row.exam_board || null,
    examDate: normalizeDateValue(row.exam_date),
    hoursPerDay: Number(row.hours_per_day),
    schedule,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function autoCompletePastPlans(userId) {
  await pool.query(
    `UPDATE study_plans SET status = 'completed', updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND status = 'active' AND exam_date < CURRENT_DATE`,
    [userId]
  );
}

/**
 * GET /api/study-plan/active
 */
router.get('/active', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT id, exam_name, exam_board, exam_date, hours_per_day, schedule, status, created_at, updated_at
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
    const today = findTodayEntry(row.schedule || []);

    res.json({
      success: true,
      plan: mapPlanRow(row),
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
    const { examName, examDate, hoursPerDay, schedule, examBoard } = req.body || {};

    if (!examName?.trim() || !examDate || !Array.isArray(schedule) || schedule.length === 0) {
      return res.status(400).json({ success: false, message: 'examName, examDate, and schedule are required' });
    }

    await autoCompletePastPlans(userId);

    const board = typeof examBoard === 'string' && examBoard.trim() ? examBoard.trim() : null;

    const insert = await pool.query(
      `INSERT INTO study_plans (user_id, exam_name, exam_board, exam_date, hours_per_day, schedule)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id, exam_name, exam_board, exam_date, hours_per_day, schedule, status, created_at`,
      [userId, examName.trim(), board, examDate, Number(hoursPerDay) || 1, JSON.stringify(schedule)]
    );

    const row = insert.rows[0];
    res.json({
      success: true,
      plan: mapPlanRow(row),
      today: findTodayEntry(row.schedule),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/study-plan/list — all schedules (ongoing + completed)
 */
router.get('/list', async (req, res, next) => {
  try {
    const userId = req.user.id;
    await autoCompletePastPlans(userId);

    const result = await pool.query(
      `SELECT id, exam_name, exam_board, exam_date, hours_per_day, schedule, status, created_at, updated_at
       FROM study_plans
       WHERE user_id = $1 AND status IN ('active', 'completed', 'cancelled')
       ORDER BY
         CASE status WHEN 'active' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END,
         created_at DESC`,
      [userId]
    );

    const plans = result.rows.map(mapPlanRow);
    const activePlans = plans.filter((p) => p.status === 'active');
    const activePlan = activePlans[0] || null;
    let today = null;
    for (const p of activePlans) {
      const entry = findTodayEntry(p.schedule);
      if (entry) {
        today = entry;
        break;
      }
    }

    res.json({
      success: true,
      plans,
      activePlans,
      activePlan,
      today,
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
       ORDER BY created_at DESC`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, hasPlan: false, today: null });
    }

    for (const row of result.rows) {
      const today = findTodayEntry(row.schedule);
      if (today) {
        return res.json({
          success: true,
          hasPlan: true,
          planId: row.id,
          examName: row.exam_name,
          today,
        });
      }
    }

    res.json({
      success: true,
      hasPlan: true,
      planId: result.rows[0].id,
      examName: result.rows[0].exam_name,
      today: null,
    });
  } catch (err) {
    next(err);
  }
});

const BOARD_LESSON_HINTS = {
  CBSE: 'Align to CBSE / NCERT syllabus depth, terminology, and HOTS-style exam questions.',
  NCERT: 'Follow NCERT chapter flow, definitions, and exercise-style questions.',
  ICSE: 'Use ICSE depth, application-based examples, and board-style phrasing.',
  Olympiad: 'Add challenge-level reasoning, puzzles, and extension problems beyond school basics.',
  Competitive: 'Include exam-trick tips, time-saving methods, and higher-difficulty practice.',
  'State Board': 'Match regional state-board syllabus emphasis and typical question patterns.',
};

function buildBoardLessonBlock(examBoard, grade) {
  const parts = [];
  if (examBoard) {
    const hint = BOARD_LESSON_HINTS[examBoard] || `Align content to ${examBoard} exam patterns and syllabus.`;
    parts.push(`Board: ${examBoard}. ${hint}`);
  }
  if (grade) {
    parts.push(`Student class/grade: ${grade}. Match vocabulary and difficulty to this level.`);
  }
  return parts.length ? `${parts.join(' ')} ` : '';
}

function buildLessonUserText(examName, day, { examBoard, grade } = {}) {
  const topics = Array.isArray(day.topics) ? day.topics.join(', ') : '';
  const tasks = Array.isArray(day.tasks) ? day.tasks.join('; ') : '';
  const parentLine = day.sourceTopic ? ` Parent topic: ${day.sourceTopic}.` : '';
  const boardBlock = buildBoardLessonBlock(examBoard, grade);
  return (
    `${boardBlock}` +
    `Exam prep lesson for "${examName}" — Day ${day.dayNumber} (${day.date}). ` +
    `Focus: ${day.focus || ''}. Today's sub-topic: ${topics}.${parentLine} Today's tasks: ${tasks}. ` +
    'Make this lesson exciting for a school student — stories, analogies, surprising facts. ' +
    'Avoid boring textbook tone. Cover every listed topic clearly. ' +
    (examBoard
      ? `Include extra board-specific facts, typical exam traps, and marking-scheme tips for ${examBoard}. `
      : '') +
    'Return exactly 15 quiz cards (15 questions minimum).'
  );
}

/**
 * POST /api/study-plan/expand-schedule — AI sub-topics per study day
 * Body: { examName, topics[], studyDayCount, examBoard? }
 */
router.post('/expand-schedule', async (req, res, next) => {
  try {
    const { examName, topics, studyDayCount, examBoard } = req.body || {};
    const topicList = Array.isArray(topics)
      ? topics.map((t) => String(t).trim()).filter(Boolean)
      : [];

    if (!examName?.trim() || topicList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'examName and topics are required',
      });
    }

    const count = Math.max(1, Number(studyDayCount) || 1);
    const grade = req.user.grade ? String(req.user.grade) : null;
    const subtopics = await expandStudySubtopics({
      examName: examName.trim(),
      topics: topicList,
      studyDayCount: count,
      examBoard: typeof examBoard === 'string' && examBoard.trim() ? examBoard.trim() : null,
      grade,
    });

    res.json({ success: true, subtopics });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/study-plan/lesson — generate rich in-page lesson (no chat thread).
 * Body: { examName, day }
 */
router.post('/lesson', async (req, res, next) => {
  try {
    if (!isLlmConfigured()) {
      return res.status(503).json({ success: false, message: 'AI is disabled (OLLAMA_DISABLED).' });
    }

    const { examName, day, examBoard: bodyBoard } = req.body || {};
    if (!examName?.trim() || !day || typeof day !== 'object') {
      return res.status(400).json({ success: false, message: 'examName and day are required' });
    }

    const { planId } = req.body || {};
    let examBoard = typeof bodyBoard === 'string' && bodyBoard.trim() ? bodyBoard.trim() : null;
    if (!examBoard) {
      const planQuery = planId
        ? pool.query(
            `SELECT exam_board FROM study_plans WHERE id = $1 AND user_id = $2 LIMIT 1`,
            [planId, req.user.id]
          )
        : pool.query(
            `SELECT exam_board FROM study_plans
             WHERE user_id = $1 AND status = 'active'
             ORDER BY created_at DESC LIMIT 1`,
            [req.user.id]
          );
      const planRow = await planQuery;
      examBoard = planRow.rows[0]?.exam_board || null;
    }

    const grade = req.user.grade ? String(req.user.grade) : null;
    const systemPrompt = resolveSystemPrompt('workspace', 'studyplan-lesson');
    const userText = buildLessonUserText(examName.trim(), day, { examBoard, grade });
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText },
    ];

    const { content, model } = await ollamaChat({
      messages,
      temperature: 0.6,
      num_predict: 8192,
      logContext: `api.study-plan.lesson userId=${req.user.id}`,
    });

    const structured = parseLearningWorkspace(content);

    res.json({
      success: true,
      content,
      structured,
      model,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
