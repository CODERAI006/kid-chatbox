/**
 * Study routes
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkModuleAccess } = require('../middleware/rbac');
const {
  checkTopicLimit,
  incrementTopicUsage,
} = require('../middleware/plan-limits');
const { checkPlanAiStudy } = require('../middleware/plan-ai-features');

const router = express.Router();

function parseJsonField(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function mapStudySessionRow(row) {
  return {
    ...row,
    lesson_explanation: parseJsonField(row.lesson_explanation) || [],
    lesson_key_points: parseJsonField(row.lesson_key_points) || [],
    lesson_examples: parseJsonField(row.lesson_examples) || [],
    lesson_content: parseJsonField(row.lesson_content),
  };
}

/**
 * Save study session
 */
router.post(
  '/sessions',
  authenticateToken,
  checkModuleAccess('study'),
  checkPlanAiStudy,
  checkTopicLimit,
  incrementTopicUsage,
  async (req, res, next) => {
    try {
      const {
        subject,
        topic,
        age,
        language,
        difficulty,
        lesson_title,
        lesson_introduction,
        lesson_explanation,
        lesson_key_points,
        lesson_examples,
        lesson_summary,
        lesson_content,
      } = req.body;

      const userId = req.user.id;

      if (
        !subject ||
        !topic ||
        !age ||
        !language ||
        !difficulty ||
        !lesson_title ||
        !lesson_introduction ||
        !lesson_explanation ||
        !Array.isArray(lesson_explanation) ||
        !lesson_key_points ||
        !Array.isArray(lesson_key_points) ||
        !lesson_examples ||
        !Array.isArray(lesson_examples) ||
        !lesson_summary
      ) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
      }

      const contentJson =
        lesson_content && typeof lesson_content === 'object'
          ? JSON.stringify(lesson_content)
          : null;

      const query = `
      INSERT INTO study_sessions (
        user_id, subject, topic, age, language, difficulty,
        lesson_title, lesson_introduction, lesson_explanation,
        lesson_key_points, lesson_examples, lesson_summary, lesson_content
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `;

      const result = await pool.query(query, [
        userId,
        subject,
        topic,
        age,
        language,
        difficulty,
        lesson_title,
        lesson_introduction,
        JSON.stringify(lesson_explanation),
        JSON.stringify(lesson_key_points),
        JSON.stringify(lesson_examples),
        lesson_summary,
        contentJson,
      ]);

      res.status(201).json({
        success: true,
        id: result.rows[0].id,
        message: 'Study session saved successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get user's study history
 */
router.get('/history/:userId', authenticateToken, checkModuleAccess('study'), async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const result = await pool.query(
      `SELECT 
        id,
        timestamp,
        subject,
        topic,
        age,
        language,
        difficulty,
        lesson_title,
        lesson_introduction,
        lesson_explanation,
        lesson_key_points,
        lesson_examples,
        lesson_summary,
        lesson_content
      FROM study_sessions
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT 50`,
      [userId]
    );

    res.json({
      success: true,
      sessions: result.rows.map(mapStudySessionRow),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
