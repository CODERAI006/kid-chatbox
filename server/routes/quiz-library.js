/**
 * Quiz Library routes
 * Handles saving, retrieving, and searching quiz library items
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkModuleAccess } = require('../middleware/rbac');
const { extractTags } = require('../utils/quizTags');
const { copyLibraryToQuiz } = require('../utils/libraryToQuiz');

const router = express.Router();

/** Only match real UUIDs so paths like /suggestions never bind as :id */
const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const QUIZ_LIBRARY_ID_PARAM =
  '/:id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})';

function isValidQuizLibraryId(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * Save quiz to library
 * POST /api/quiz-library
 */
router.post('/', authenticateToken, checkModuleAccess('quiz'), async (req, res, next) => {
  try {
    const {
      title,
      description,
      subject,
      subtopics,
      difficulty,
      age_group,
      language,
      question_count,
      time_limit,
      grade_level,
      exam_style,
      questions,
      config,
    } = req.body;

    if (!subject || !difficulty || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: subject, difficulty, and questions are required',
      });
    }

    // Extract tags automatically
    const tags = extractTags({
      subject,
      difficulty,
      subtopics: subtopics || [],
      gradeLevel: grade_level,
      examStyle: exam_style,
      age: age_group,
      language,
      instructions: config?.instructions || '',
    });

    // Generate title if not provided
    const quizTitle = title || `${subject} - ${subtopics?.[0] || 'Quiz'} (${difficulty})`;

    const result = await pool.query(
      `INSERT INTO quiz_library (
        title, description, subject, subtopics, difficulty, age_group,
        language, question_count, time_limit, grade_level, exam_style,
        tags, questions, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        quizTitle,
        description || null,
        subject,
        subtopics || [],
        difficulty,
        age_group || null,
        language || null,
        question_count || questions.length,
        time_limit || null,
        grade_level || null,
        exam_style || null,
        tags,
        JSON.stringify(questions),
        req.user.id,
      ]
    );

    res.status(201).json({
      success: true,
      quiz: result.rows[0],
      message: 'Quiz saved to library successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get quizzes from library with optional filtering
 * GET /api/quiz-library?subject=&difficulty=&tags=&limit=20&offset=0
 */
router.get('/', authenticateToken, checkModuleAccess('quiz'), async (req, res, next) => {
  try {
    const {
      subject,
      difficulty,
      tags,
      grade_level,
      exam_style,
      limit = 20,
      offset = 0,
    } = req.query;

    let query = `
      SELECT 
        id, title, description, subject, subtopics, difficulty,
        age_group, language, question_count, time_limit, grade_level,
        exam_style, tags, created_at, usage_count, last_used_at
      FROM quiz_library
      WHERE is_active = true
    `;
    const params = [];
    let paramCount = 0;

    if (subject) {
      paramCount++;
      query += ` AND subject = $${paramCount}`;
      params.push(subject);
    }

    if (difficulty) {
      paramCount++;
      query += ` AND difficulty = $${paramCount}`;
      params.push(difficulty);
    }

    if (grade_level) {
      paramCount++;
      query += ` AND grade_level = $${paramCount}`;
      params.push(grade_level);
    }

    if (exam_style) {
      paramCount++;
      query += ` AND exam_style = $${paramCount}`;
      params.push(exam_style);
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      paramCount++;
      query += ` AND tags && $${paramCount}`;
      params.push(tagArray);
    }

    query += ` ORDER BY usage_count DESC, created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      quizzes: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get suggested quizzes based on subject and tags
 * GET /api/quiz-library/suggestions?subject=&tags=
 * MUST be registered before /:id or "suggestions" is parsed as a UUID id.
 */
router.get('/suggestions', authenticateToken, checkModuleAccess('quiz'), async (req, res, next) => {
  try {
    const { subject, tags } = req.query;

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required',
      });
    }

    let query = `
      SELECT 
        id, title, description, subject, subtopics, difficulty,
        age_group, language, question_count, time_limit, grade_level,
        exam_style, tags, usage_count
      FROM quiz_library
      WHERE is_active = true AND subject = $1
    `;
    const params = [subject];
    let paramCount = 1;

    // If tags provided, prioritize quizzes with matching tags
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      paramCount++;
      query += ` AND tags && $${paramCount}`;
      params.push(tagArray);
    }

    query += ` ORDER BY 
      CASE WHEN tags && $${++paramCount} THEN 1 ELSE 2 END,
      usage_count DESC,
      created_at DESC
      LIMIT 10`;
    
    const tagArray = tags ? (Array.isArray(tags) ? tags : [tags]) : [];
    params.push(tagArray);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      suggestions: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get quiz by ID with full questions
 * GET /api/quiz-library/:id
 */
router.get(QUIZ_LIBRARY_ID_PARAM, authenticateToken, checkModuleAccess('quiz'), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidQuizLibraryId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quiz library id. Use GET /api/quiz-library/suggestions for suggestions.',
      });
    }

    const result = await pool.query(
      `SELECT * FROM quiz_library WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    const quiz = result.rows[0];
    
    // Parse questions JSON
    quiz.questions = typeof quiz.questions === 'string' 
      ? JSON.parse(quiz.questions) 
      : quiz.questions;

    // Increment usage count
    await pool.query(
      `UPDATE quiz_library 
       SET usage_count = usage_count + 1,
           last_used_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    // Track usage
    await pool.query(
      `INSERT INTO quiz_library_usage (quiz_library_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [id, req.user.id]
    );

    res.json({
      success: true,
      quiz,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Start tracked quiz — copy library → quizzes if needed, return quizId
 * POST /api/quiz-library/:id/start-tracked
 */
router.post(
  `${QUIZ_LIBRARY_ID_PARAM}/start-tracked`,
  authenticateToken,
  checkModuleAccess('quiz'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!isValidQuizLibraryId(id)) {
        return res.status(400).json({ success: false, message: 'Invalid quiz library id' });
      }

      const quizId = await copyLibraryToQuiz(id, req.user.id);
      res.json({ success: true, quizId });
    } catch (error) {
      if (error.message === 'Quiz library item not found') {
        return res.status(404).json({ success: false, message: error.message });
      }
      next(error);
    }
  }
);

module.exports = router;

