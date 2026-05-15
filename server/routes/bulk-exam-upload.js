/**
 * Bulk Exam Upload route
 * POST /api/bulk-exam-upload/single — create one exam (quiz + questions) from JSON payload
 *
 * Called once per exam by the frontend BulkExamUpload component.
 * The frontend loops through all parsed exams and calls this for each one.
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

const router = express.Router();

const MAX_QUESTIONS = 50;

/**
 * Create a single exam with its questions
 * POST /api/bulk-exam-upload/single
 */
router.post(
  '/single',
  authenticateToken,
  checkPermission('manage_quizzes'),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const {
        name,
        description,
        ageGroup,      // legacy field — still accepted for backwards compatibility
        gradeLevel,    // new field from Excel metadata
        subject,       // new field from Excel metadata
        difficulty,
        passingPercentage,
        timeLimit,
        topicId,
        subtopicId,
        questions,
      } = req.body;

      // Validate required fields (ageGroup is now optional — gradeLevel replaces it)
      if (!name || !difficulty) {
        return res.status(400).json({
          success: false,
          message: 'name and difficulty are required',
        });
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'questions array is required and must not be empty',
        });
      }

      // Determine subtopic — use explicit subtopicId or fall back to topicId lookup
      let resolvedSubtopicId = subtopicId || null;

      if (!resolvedSubtopicId && topicId) {
        const sub = await client.query(
          'SELECT id FROM subtopics WHERE topic_id = $1 ORDER BY created_at LIMIT 1',
          [topicId]
        );
        if (sub.rows.length > 0) {
          resolvedSubtopicId = sub.rows[0].id;
        }
      }

      const cappedQuestions = questions.slice(0, MAX_QUESTIONS);

      // Ensure extended columns exist — run outside transaction (DDL is auto-commit in PG)
      await client.query(`
        ALTER TABLE quizzes
          ADD COLUMN IF NOT EXISTS grade_level VARCHAR(100),
          ADD COLUMN IF NOT EXISTS subject     VARCHAR(100),
          ADD COLUMN IF NOT EXISTS in_library  BOOLEAN DEFAULT false
      `).catch(() => {});

      await client.query('BEGIN');

      // Insert quiz — include grade_level and subject if provided
      const quizResult = await client.query(
        `INSERT INTO quizzes (
          subtopic_id, name, description, age_group, grade_level, subject, difficulty,
          number_of_questions, passing_percentage, time_limit, created_by, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
        RETURNING *`,
        [
          resolvedSubtopicId,
          name.trim(),
          description || null,
          ageGroup || gradeLevel || null,   // accept either field for age_group
          gradeLevel || null,
          subject || null,
          difficulty,
          cappedQuestions.length,
          passingPercentage || 60,
          timeLimit ? parseInt(String(timeLimit)) : null,
          req.user.id,
        ]
      );

      const quiz = quizResult.rows[0];

      // Insert questions
      for (let i = 0; i < cappedQuestions.length; i++) {
        const q = cappedQuestions[i];

        // Build options object — accept { A, B, C, D } or flat optionA/B/C/D
        let options = q.options;
        if (!options || typeof options !== 'object') {
          options = {
            A: q.optionA || '',
            B: q.optionB || '',
            C: q.optionC || '',
            D: q.optionD || '',
          };
        }

        const correctAnswer = String(q.correctAnswer || '').toUpperCase();

        await client.query(
          `INSERT INTO quiz_questions (
            quiz_id, question_type, question_text, question_image_url,
            options, correct_answer, explanation, hint, points, order_index
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            quiz.id,
            'multiple_choice',
            String(q.question || '').trim(),
            null,
            JSON.stringify(options),
            JSON.stringify(correctAnswer),
            q.explanation || null,
            q.hint || null,
            q.points || 1,
            i,
          ]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        quiz: {
          id: quiz.id,
          name: quiz.name,
          questionCount: cappedQuestions.length,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      next(error);
    } finally {
      client.release();
    }
  }
);

/**
 * Upload multiple exams in a single request (optional batch endpoint)
 * POST /api/bulk-exam-upload/batch
 * Body: { exams: [...] }  — array of exam objects (same shape as /single)
 */
router.post(
  '/batch',
  authenticateToken,
  checkPermission('manage_quizzes'),
  async (req, res, next) => {
    try {
      const { exams } = req.body;

      if (!Array.isArray(exams) || exams.length === 0) {
        return res.status(400).json({ success: false, message: 'exams array is required' });
      }

      if (exams.length > 50) {
        return res.status(400).json({ success: false, message: 'Maximum 50 exams per batch' });
      }

      const results = [];
      const errors = [];

      for (const exam of exams) {
        const client = await pool.connect();
        try {
          const {
            name, description, ageGroup, difficulty,
            passingPercentage, timeLimit, subtopicId, topicId, questions,
          } = exam;

          if (!name || !ageGroup || !difficulty || !Array.isArray(questions) || questions.length === 0) {
            errors.push({ name: name || 'unnamed', reason: 'Missing required fields' });
            continue;
          }

          let resolvedSubtopicId = subtopicId || null;
          if (!resolvedSubtopicId && topicId) {
            const sub = await client.query(
              'SELECT id FROM subtopics WHERE topic_id = $1 ORDER BY created_at LIMIT 1',
              [topicId]
            );
            if (sub.rows.length > 0) resolvedSubtopicId = sub.rows[0].id;
          }

          const cappedQuestions = questions.slice(0, MAX_QUESTIONS);

          await client.query('BEGIN');

          const quizResult = await client.query(
            `INSERT INTO quizzes (
              subtopic_id, name, description, age_group, difficulty,
              number_of_questions, passing_percentage, time_limit, created_by, is_active
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
            RETURNING id, name`,
            [
              resolvedSubtopicId,
              name.trim(),
              description || null,
              ageGroup,
              difficulty,
              cappedQuestions.length,
              passingPercentage || 60,
              timeLimit ? parseInt(timeLimit) : null,
              req.user.id,
            ]
          );

          const quiz = quizResult.rows[0];

          for (let i = 0; i < cappedQuestions.length; i++) {
            const q = cappedQuestions[i];
            let options = q.options;
            if (!options || typeof options !== 'object') {
              options = { A: q.optionA || '', B: q.optionB || '', C: q.optionC || '', D: q.optionD || '' };
            }
            await client.query(
              `INSERT INTO quiz_questions (
                quiz_id, question_type, question_text, options, correct_answer,
                explanation, hint, points, order_index
              )
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
              [
                quiz.id, 'multiple_choice', String(q.question || '').trim(),
                JSON.stringify(options), JSON.stringify(String(q.correctAnswer || '').toUpperCase()),
                q.explanation || null, q.hint || null, q.points || 1, i,
              ]
            );
          }

          await client.query('COMMIT');
          results.push({ id: quiz.id, name: quiz.name, questions: cappedQuestions.length });
        } catch (err) {
          await client.query('ROLLBACK');
          errors.push({ name: exam.name || 'unnamed', reason: err.message });
        } finally {
          client.release();
        }
      }

      res.status(201).json({
        success: true,
        created: results.length,
        failed: errors.length,
        results,
        errors,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
