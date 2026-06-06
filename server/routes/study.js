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
const { trackStudySessionStart, trackStudySessionComplete } = require('../utils/eventTracker');

const router = express.Router();

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
    } = req.body;

    const userId = req.user.id;

    // Validate input
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

    // Insert study session
    const query = `
      INSERT INTO study_sessions (
        user_id, subject, topic, age, language, difficulty,
        lesson_title, lesson_introduction, lesson_explanation,
        lesson_key_points, lesson_examples, lesson_summary
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
    ]);

    res.status(201).json({
      success: true,
      id: result.rows[0].id,
      message: 'Study session saved successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get user's study history
 */
router.get('/history/:userId', authenticateToken, checkModuleAccess('study'), async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Verify user can only access their own history
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
        lesson_summary
      FROM study_sessions
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT 50`,
      [userId]
    );

    // Parse JSON fields
    const sessions = result.rows.map((row) => ({
      ...row,
      lesson_explanation:
        typeof row.lesson_explanation === 'string'
          ? JSON.parse(row.lesson_explanation)
          : row.lesson_explanation,
      lesson_key_points:
        typeof row.lesson_key_points === 'string'
          ? JSON.parse(row.lesson_key_points)
          : row.lesson_key_points,
      lesson_examples:
        typeof row.lesson_examples === 'string'
          ? JSON.parse(row.lesson_examples)
          : row.lesson_examples,
    }));

    res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

