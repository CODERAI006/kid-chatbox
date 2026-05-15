/**
 * Quiz Management API routes
 * Handles quiz creation, question management, and quiz attempts
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission, checkModuleAccess } = require('../middleware/rbac');
const {
  checkQuizLimit,
  incrementQuizUsage,
} = require('../middleware/plan-limits');
const { generateQuizQuestions } = require('../utils/openai');
const { trackQuizStart, trackQuizComplete, trackQuestionAnswer, trackQuizCreated } = require('../utils/eventTracker');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Create a new quiz
 * POST /api/quizzes
 */
router.post('/', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const {
      subtopicId,
      name,
      description,
      ageGroup,
      difficulty,
      numberOfQuestions,
      passingPercentage,
      timeLimit,
    } = req.body;

    if (!name || !ageGroup || !difficulty) {
      return res.status(400).json({
        success: false,
        message: 'Name, age group, and difficulty are required',
      });
    }

    const result = await pool.query(
      `INSERT INTO quizzes (
        subtopic_id, name, description, age_group, difficulty,
        number_of_questions, passing_percentage, time_limit, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        subtopicId || null,
        name,
        description || null,
        ageGroup,
        difficulty,
        numberOfQuestions || 15,
        passingPercentage || 60,
        timeLimit || null,
        req.user.id,
      ]
    );

    const quiz = result.rows[0];

    // Track quiz creation
    await trackQuizCreated(req.user.id, quiz.id);

    res.status(201).json({
      success: true,
      quiz,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get quizzes for a subtopic
 * GET /api/quizzes/subtopic/:subtopicId
 */
router.get('/subtopic/:subtopicId', async (req, res, next) => {
  try {
    const { subtopicId } = req.params;
    const { ageGroup } = req.query;

    let query = 'SELECT * FROM quizzes WHERE subtopic_id = $1 AND is_active = true';
    const params = [subtopicId];

    if (ageGroup) {
      query += ' AND age_group = $2';
      params.push(ageGroup);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      quizzes: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all quizzes available in the public library (student-accessible)
 * GET /api/quizzes/library
 * Must be registered before GET /:id — otherwise "library" is treated as a quiz id.
 */
router.get('/library', async (req, res, next) => {
  try {
    const { difficulty, subject, gradeLevel } = req.query;

    let query = `
      SELECT id, name, description, difficulty, grade_level, subject,
             number_of_questions, passing_percentage, time_limit, created_at
      FROM quizzes
      WHERE in_library = true AND is_active = true`;

    const params = [];
    let idx = 1;

    if (difficulty) { query += ` AND difficulty = $${idx++}`; params.push(difficulty); }
    if (subject)    { query += ` AND subject = $${idx++}`;    params.push(subject); }
    if (gradeLevel) { query += ` AND grade_level = $${idx++}`; params.push(gradeLevel); }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, quizzes: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * Get quiz by ID with questions
 * GET /api/quizzes/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const quizResult = await pool.query('SELECT * FROM quizzes WHERE id = $1', [id]);

    if (quizResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    const questionsResult = await pool.query(
      `SELECT * FROM quiz_questions 
       WHERE quiz_id = $1 
       ORDER BY order_index, created_at`,
      [id]
    );

    res.json({
      success: true,
      quiz: quizResult.rows[0],
      questions: questionsResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update quiz
 * PUT /api/quizzes/:id
 */
router.put('/:id', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      ageGroup,
      difficulty,
      numberOfQuestions,
      passingPercentage,
      timeLimit,
      isActive,
    } = req.body;

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name !== undefined) {
      updates.push(`name = $${++paramCount}`);
      params.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${++paramCount}`);
      params.push(description);
    }
    if (ageGroup !== undefined) {
      updates.push(`age_group = $${++paramCount}`);
      params.push(ageGroup);
    }
    if (difficulty !== undefined) {
      updates.push(`difficulty = $${++paramCount}`);
      params.push(difficulty);
    }
    if (numberOfQuestions !== undefined) {
      updates.push(`number_of_questions = $${++paramCount}`);
      params.push(numberOfQuestions);
    }
    if (passingPercentage !== undefined) {
      updates.push(`passing_percentage = $${++paramCount}`);
      params.push(passingPercentage);
    }
    if (timeLimit !== undefined) {
      updates.push(`time_limit = $${++paramCount}`);
      params.push(timeLimit);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${++paramCount}`);
      params.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await pool.query(
      `UPDATE quizzes SET ${updates.join(', ')} WHERE id = $${++paramCount} RETURNING *`,
      params
    );

    res.json({
      success: true,
      quiz: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Toggle quiz "in_library" flag (makes it accessible to all students on-demand)
 * PATCH /api/quizzes/:id/library
 */
router.patch('/:id/library', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { inLibrary } = req.body;

    const result = await pool.query(
      `UPDATE quizzes SET in_library = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, in_library`,
      [Boolean(inLibrary), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    res.json({ success: true, quiz: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete quiz
 * DELETE /api/quizzes/:id
 */
router.delete('/:id', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM quizzes WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Add question to quiz
 * POST /api/quizzes/:quizId/questions
 */
router.post('/:quizId/questions', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const { quizId } = req.params;
    const {
      questionType,
      questionText,
      questionImageUrl,
      options,
      correctAnswer,
      explanation,
      hint,
      points,
      orderIndex,
    } = req.body;

    if (!questionType || !questionText || !correctAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Question type, text, and correct answer are required',
      });
    }

    const validTypes = ['multiple_choice', 'true_false', 'fill_blank', 'match_pairs', 'image_based'];

    if (!validTypes.includes(questionType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid question type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const result = await pool.query(
      `INSERT INTO quiz_questions (
        quiz_id, question_type, question_text, question_image_url,
        options, correct_answer, explanation, hint, points, order_index
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        quizId,
        questionType,
        questionText,
        questionImageUrl || null,
        options ? JSON.stringify(options) : null,
        JSON.stringify(correctAnswer),
        explanation || null,
        hint || null,
        points || 1,
        orderIndex || 0,
      ]
    );

    res.status(201).json({
      success: true,
      question: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update question
 * PUT /api/quizzes/questions/:id
 */
router.put('/questions/:id', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      questionType,
      questionText,
      questionImageUrl,
      options,
      correctAnswer,
      explanation,
      hint,
      points,
      orderIndex,
    } = req.body;

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (questionType !== undefined) {
      updates.push(`question_type = $${++paramCount}`);
      params.push(questionType);
    }
    if (questionText !== undefined) {
      updates.push(`question_text = $${++paramCount}`);
      params.push(questionText);
    }
    if (questionImageUrl !== undefined) {
      updates.push(`question_image_url = $${++paramCount}`);
      params.push(questionImageUrl);
    }
    if (options !== undefined) {
      updates.push(`options = $${++paramCount}`);
      params.push(JSON.stringify(options));
    }
    if (correctAnswer !== undefined) {
      updates.push(`correct_answer = $${++paramCount}`);
      params.push(JSON.stringify(correctAnswer));
    }
    if (explanation !== undefined) {
      updates.push(`explanation = $${++paramCount}`);
      params.push(explanation);
    }
    if (hint !== undefined) {
      updates.push(`hint = $${++paramCount}`);
      params.push(hint);
    }
    if (points !== undefined) {
      updates.push(`points = $${++paramCount}`);
      params.push(points);
    }
    if (orderIndex !== undefined) {
      updates.push(`order_index = $${++paramCount}`);
      params.push(orderIndex);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await pool.query(
      `UPDATE quiz_questions SET ${updates.join(', ')} WHERE id = $${++paramCount} RETURNING *`,
      params
    );

    res.json({
      success: true,
      question: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete question
 * DELETE /api/quizzes/questions/:id
 */
router.delete('/questions/:id', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM quiz_questions WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Start quiz attempt
 * POST /api/quizzes/:quizId/attempt
 */
router.post(
  '/:quizId/attempt',
  checkModuleAccess('quiz'),
  checkQuizLimit,
  incrementQuizUsage,
  async (req, res, next) => {
  try {
    const { quizId } = req.params;

    // Get quiz details
    const quizResult = await pool.query('SELECT * FROM quizzes WHERE id = $1', [quizId]);

    if (quizResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    const quiz = quizResult.rows[0];

    // Create quiz attempt
    const attemptResult = await pool.query(
      `INSERT INTO quiz_attempts (
        user_id, quiz_id, total_questions, status
      )
      VALUES ($1, $2, $3, 'in_progress')
      RETURNING *`,
      [req.user.id, quizId, quiz.number_of_questions]
    );

    // Track quiz start
    await trackQuizStart(req.user.id, quizId);

    // Get questions for the quiz
    const questionsResult = await pool.query(
      `SELECT id, question_type, question_text, question_image_url, options, correct_answer, explanation, points
       FROM quiz_questions 
       WHERE quiz_id = $1 
       ORDER BY order_index, created_at
       LIMIT $2`,
      [quizId, quiz.number_of_questions]
    );

    res.json({
      success: true,
      attempt: attemptResult.rows[0],
      quiz: {
        ...quiz,
        questions: questionsResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Submit quiz answers
 * POST /api/quizzes/attempts/:attemptId/submit
 */
router.post('/attempts/:attemptId/submit', checkModuleAccess('quiz'), async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { answers, timeTaken } = req.body; // answers: [{ questionId, answer }]

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Answers must be an array',
      });
    }

    // Get attempt
    const attemptResult = await pool.query(
      'SELECT * FROM quiz_attempts WHERE id = $1 AND user_id = $2',
      [attemptId, req.user.id]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found',
      });
    }

    const attempt = attemptResult.rows[0];

    let correctCount = 0;
    let totalScore = 0;

    // Process each answer
    for (const answer of answers) {
      const questionResult = await pool.query(
        'SELECT * FROM quiz_questions WHERE id = $1',
        [answer.questionId]
      );

      if (questionResult.rows.length === 0) continue;

      const question = questionResult.rows[0];
      let correctAnswer;
      try {
        correctAnswer = JSON.parse(question.correct_answer);
      } catch {
        // If parsing fails, use as string
        correctAnswer = question.correct_answer;
      }
      
      const userAnswer = answer.answer;

      // Compare answers (simplified - may need more complex logic for different question types)
      let isCorrect = false;
      if (Array.isArray(correctAnswer)) {
        isCorrect = JSON.stringify(correctAnswer.sort()) === JSON.stringify(Array.isArray(userAnswer) ? userAnswer.sort() : [userAnswer]);
      } else {
        // Normalize both answers: trim whitespace, convert to uppercase for single-letter answers (A, B, C, D)
        const normalizedCorrect = String(correctAnswer).trim().toUpperCase();
        const normalizedUser = String(userAnswer).trim().toUpperCase();
        
        // For single-letter answers (A-D), compare directly
        if (['A', 'B', 'C', 'D'].includes(normalizedCorrect) && ['A', 'B', 'C', 'D'].includes(normalizedUser)) {
          isCorrect = normalizedCorrect === normalizedUser;
        } else {
          // For other answer types, use case-insensitive comparison
          isCorrect = normalizedCorrect === normalizedUser;
        }
      }

      if (isCorrect) {
        correctCount++;
        totalScore += question.points || 1;
      }

      // Save answer
      await pool.query(
        `INSERT INTO quiz_attempt_answers (
          attempt_id, question_id, user_answer, is_correct, time_spent
        )
        VALUES ($1, $2, $3, $4, $5)`,
        [
          attemptId,
          answer.questionId,
          JSON.stringify(userAnswer),
          isCorrect,
          answer.timeSpent || 0,
        ]
      );

      // Track question answer
      await trackQuestionAnswer(
        req.user.id,
        attempt.quiz_id,
        answer.questionId,
        isCorrect,
        answer.timeSpent || 0
      );
    }

    const wrongCount = attempt.total_questions - correctCount;
    const scorePercentage = (correctCount / attempt.total_questions) * 100;

    // Update attempt
    await pool.query(
      `UPDATE quiz_attempts 
       SET completed_at = CURRENT_TIMESTAMP,
           time_taken = $1,
           score = $2,
           correct_answers = $3,
           wrong_answers = $4,
           score_percentage = $5,
           status = 'completed'
       WHERE id = $6`,
      [timeTaken || 0, totalScore, correctCount, wrongCount, scorePercentage, attemptId]
    );

    // Track quiz completion
    await trackQuizComplete(
      req.user.id,
      attempt.quiz_id,
      scorePercentage,
      timeTaken || 0,
      correctCount,
      wrongCount
    );

    // Calculate tokens earned (simplified: 10 tokens per correct answer)
    const tokensEarned = correctCount * 10;
    if (tokensEarned > 0) {
      await pool.query(
        `INSERT INTO tokens_usage (user_id, tokens_earned, source, reference_id)
         VALUES ($1, $2, 'quiz_completion', $3)`,
        [req.user.id, tokensEarned, attemptId]
      );
    }

    // Send quiz completion email
    try {
      const userResult = await pool.query(
        'SELECT email, name FROM users WHERE id = $1',
        [req.user.id]
      );
      const quizResult = await pool.query(
        'SELECT subject, subtopic FROM quizzes WHERE id = $1',
        [attempt.quiz_id]
      );

      if (userResult.rows.length > 0 && quizResult.rows.length > 0) {
        const user = userResult.rows[0];
        const quiz = quizResult.rows[0];
        const { sendQuizCompletionEmail } = require('../utils/email');
        await sendQuizCompletionEmail({
          email: user.email,
          name: user.name,
          subject: quiz.subject || 'Quiz',
          subtopic: quiz.subtopic || null,
          scorePercentage,
          correctAnswers: correctCount,
          totalQuestions: attempt.total_questions,
          timeTaken: timeTaken || 0,
        });
      }
    } catch (emailError) {
      // Log error but don't fail quiz submission if email fails
      console.error(`Failed to send quiz completion email to user ${req.user.id}:`, emailError.message);
    }

    // Get detailed results
    const answersResult = await pool.query(
      `SELECT 
        qa.*,
        qq.question_text,
        qq.question_type,
        qq.correct_answer,
        qq.explanation
      FROM quiz_attempt_answers qa
      INNER JOIN quiz_questions qq ON qa.question_id = qq.id
      WHERE qa.attempt_id = $1
      ORDER BY qa.answered_at`,
      [attemptId]
    );

    res.json({
      success: true,
      result: {
        attemptId,
        totalQuestions: attempt.total_questions,
        correctAnswers: correctCount,
        wrongAnswers: wrongCount,
        score: totalScore,
        scorePercentage: Math.round(scorePercentage * 100) / 100,
        timeTaken: timeTaken || 0,
        tokensEarned,
        passed: scorePercentage >= (attempt.passing_percentage || 60),
        answers: answersResult.rows.map((row) => ({
          ...row,
          correctAnswer: JSON.parse(row.correct_answer),
          userAnswer: JSON.parse(row.user_answer),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get quiz attempt (for resuming)
 * GET /api/quizzes/attempts/:attemptId
 */
router.get('/attempts/:attemptId', checkModuleAccess('quiz'), async (req, res, next) => {
  try {
    const { attemptId } = req.params;

    const attemptResult = await pool.query(
      'SELECT * FROM quiz_attempts WHERE id = $1 AND user_id = $2',
      [attemptId, req.user.id]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found',
      });
    }

    const attempt = attemptResult.rows[0];

    // Only allow resuming in_progress attempts
    if (attempt.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'This attempt has already been completed',
      });
    }

    // Get quiz details
    const quizResult = await pool.query('SELECT * FROM quizzes WHERE id = $1', [attempt.quiz_id]);

    if (quizResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
      });
    }

    const quiz = quizResult.rows[0];

    // Get questions for the quiz
    const questionsResult = await pool.query(
      `SELECT id, question_type, question_text, question_image_url, options, correct_answer, explanation, points
       FROM quiz_questions 
       WHERE quiz_id = $1 
       ORDER BY order_index, created_at
       LIMIT $2`,
      [attempt.quiz_id, quiz.number_of_questions]
    );

    // Get existing answers
    const answersResult = await pool.query(
      `SELECT question_id, user_answer
       FROM quiz_attempt_answers
       WHERE attempt_id = $1
       ORDER BY answered_at`,
      [attemptId]
    );

    res.json({
      success: true,
      attempt: {
        ...attempt,
        answers: answersResult.rows,
      },
      quiz: {
        ...quiz,
        questions: questionsResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get quiz result
 * GET /api/quizzes/attempts/:attemptId/result
 */
router.get('/attempts/:attemptId/result', async (req, res, next) => {
  try {
    const { attemptId } = req.params;

    const attemptResult = await pool.query(
      'SELECT * FROM quiz_attempts WHERE id = $1 AND user_id = $2',
      [attemptId, req.user.id]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Quiz attempt not found',
      });
    }

    const answersResult = await pool.query(
      `SELECT 
        qa.*,
        qq.question_text,
        qq.question_type,
        qq.correct_answer,
        qq.explanation
      FROM quiz_attempt_answers qa
      INNER JOIN quiz_questions qq ON qa.question_id = qq.id
      WHERE qa.attempt_id = $1
      ORDER BY qa.answered_at`,
      [attemptId]
    );

    res.json({
      success: true,
      result: {
        ...attemptResult.rows[0],
        answers: answersResult.rows.map((row) => ({
          ...row,
          correctAnswer: JSON.parse(row.correct_answer),
          userAnswer: JSON.parse(row.user_answer),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate quiz with AI
 * POST /api/quizzes/generate
 */
router.post('/generate', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const {
      subtopicId,
      name,
      description,
      ageGroup,
      difficulty,
      numberOfQuestions,
      passingPercentage,
      timeLimit,
      topics,
      language,
      gradeLevel,
      sampleQuestion,
      examStyle,
    } = req.body;

    if (!name || !difficulty || !numberOfQuestions) {
      return res.status(400).json({
        success: false,
        message: 'Name, difficulty, and number of questions are required',
      });
    }

    // Generate questions using AI
    const generatedQuestions = await generateQuizQuestions({
      numberOfQuestions,
      difficulty,
      topics: topics || [],
      language: language || 'English',
      subtopicId,
      description: description || undefined,
      gradeLevel: gradeLevel || undefined,
      sampleQuestion: sampleQuestion || undefined,
      examStyle: examStyle || undefined,
    });

    // Create quiz
    const quizResult = await pool.query(
      `INSERT INTO quizzes (
        subtopic_id, name, description, age_group, grade_level, subject, difficulty,
        number_of_questions, passing_percentage, time_limit, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        subtopicId || null,
        name,
        description || null,
        ageGroup || null,
        gradeLevel || null,
        req.body.subject || null,
        difficulty,
        numberOfQuestions,
        passingPercentage || 60,
        timeLimit || null,
        req.user.id,
      ]
    );

    const quiz = quizResult.rows[0];

    // Add questions to quiz
    const questions = [];
    for (let i = 0; i < generatedQuestions.length; i++) {
      const q = generatedQuestions[i];
      const questionResult = await pool.query(
        `INSERT INTO quiz_questions (
          quiz_id, question_type, question_text, options,
          correct_answer, explanation, points, order_index
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          quiz.id,
          'multiple_choice',
          q.question,
          JSON.stringify(q.options),
          JSON.stringify(q.correctAnswer),
          q.explanation,
          1,
          i,
        ]
      );
      questions.push(questionResult.rows[0]);
    }

    res.status(201).json({
      success: true,
      quiz,
      questions,
      message: `Quiz created successfully with ${questions.length} AI-generated questions`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Upload quiz from JSON
 * POST /api/quizzes/upload
 */
router.post('/upload', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const {
      subtopicId,
      name,
      description,
      ageGroup,       // legacy — still accepted
      gradeLevel,     // preferred replacement for ageGroup
      subject,
      difficulty,
      passingPercentage,
      timeLimit,
      questions: uploadedQuestions,
    } = req.body;

    if (!name || !difficulty || !uploadedQuestions) {
      return res.status(400).json({
        success: false,
        message: 'Name, difficulty, and questions are required',
      });
    }

    if (!Array.isArray(uploadedQuestions) || uploadedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Questions must be a non-empty array',
      });
    }

    // Validate question structure - check all mandatory fields
    const validQuestionTypes = ['multiple_choice', 'true_false', 'fill_blank', 'match_pairs', 'image_based'];
    
    for (let i = 0; i < uploadedQuestions.length; i++) {
      const q = uploadedQuestions[i];
      const questionNum = i + 1;
      const errors = [];

      // Check mandatory fields - support both 'question' and 'questionText'
      const questionText = q.question || q.questionText;
      if (!questionText || (typeof questionText === 'string' && questionText.trim() === '')) {
        errors.push(`Question ${questionNum}: Missing or empty 'question' or 'questionText' field`);
      }

      if (!q.correctAnswer) {
        errors.push(`Question ${questionNum}: Missing 'correctAnswer' field`);
      }

      // For multiple choice questions, options are mandatory
      const questionType = q.questionType || 'multiple_choice';
      if (questionType === 'multiple_choice') {
        if (!q.options || typeof q.options !== 'object' || Object.keys(q.options).length === 0) {
          errors.push(`Question ${questionNum}: Missing or empty 'options' field (required for multiple choice)`);
        } else {
          // Validate that correctAnswer exists in options
          const correctAnswer = String(q.correctAnswer).toUpperCase();
          if (!q.options[correctAnswer] && !Object.keys(q.options).some(key => key.toUpperCase() === correctAnswer)) {
            errors.push(`Question ${questionNum}: 'correctAnswer' "${q.correctAnswer}" not found in options`);
          }
        }
      }

      // Validate questionType if provided
      if (q.questionType && !validQuestionTypes.includes(q.questionType)) {
        errors.push(`Question ${questionNum}: Invalid 'questionType'. Must be one of: ${validQuestionTypes.join(', ')}`);
      }

      // Validate correctAnswer format
      if (q.correctAnswer) {
        if (typeof q.correctAnswer !== 'string' && !Array.isArray(q.correctAnswer)) {
          errors.push(`Question ${questionNum}: 'correctAnswer' must be a string or array`);
        }
      }

      // Validate options format if provided
      if (q.options && typeof q.options !== 'object') {
        errors.push(`Question ${questionNum}: 'options' must be an object`);
      }

      // Validate points if provided
      if (q.points !== undefined && (typeof q.points !== 'number' || q.points < 0)) {
        errors.push(`Question ${questionNum}: 'points' must be a non-negative number`);
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors found in uploaded questions',
          errors,
        });
      }
    }

    // Create quiz
    const quizResult = await pool.query(
      `INSERT INTO quizzes (
        subtopic_id, name, description, age_group, grade_level, subject, difficulty,
        number_of_questions, passing_percentage, time_limit, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        subtopicId || null,
        name,
        description || null,
        ageGroup || gradeLevel || null,
        gradeLevel || null,
        subject || null,
        difficulty,
        uploadedQuestions.length,
        passingPercentage || 60,
        timeLimit || null,
        req.user.id,
      ]
    );

    const quiz = quizResult.rows[0];

    // Add questions to quiz
    const questions = [];
    for (let i = 0; i < uploadedQuestions.length; i++) {
      const q = uploadedQuestions[i];
      // Support both 'question' and 'questionText' fields
      const questionText = q.question || q.questionText;
      
      const questionResult = await pool.query(
        `INSERT INTO quiz_questions (
          quiz_id, question_type, question_text, question_image_url,
          options, correct_answer, explanation, hint, points, order_index
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          quiz.id,
          q.questionType || 'multiple_choice',
          questionText,
          q.questionImageUrl || null,
          q.options ? JSON.stringify(q.options) : null,
          JSON.stringify(q.correctAnswer),
          q.explanation || q.justification || null,
          q.hint || null,
          q.points || 1,
          i,
        ]
      );
      questions.push(questionResult.rows[0]);
    }

    res.status(201).json({
      success: true,
      quiz,
      questions,
      message: `Quiz created successfully with ${questions.length} questions`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all quizzes (for admin)
 * GET /api/quizzes
 */
router.get('/', checkPermission('manage_quizzes'), async (req, res, next) => {
  try {
    const { ageGroup, difficulty, subtopicId } = req.query;

    let query = `
      SELECT q.*, s.title as subtopic_title, t.title as topic_title
      FROM quizzes q
      LEFT JOIN subtopics s ON q.subtopic_id = s.id
      LEFT JOIN topics t ON s.topic_id = t.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (ageGroup) {
      query += ` AND q.age_group = $${++paramCount}`;
      params.push(ageGroup);
    }
    if (difficulty) {
      query += ` AND q.difficulty = $${++paramCount}`;
      params.push(difficulty);
    }
    if (subtopicId) {
      query += ` AND q.subtopic_id = $${++paramCount}`;
      params.push(subtopicId);
    }

    query += ' ORDER BY q.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      quizzes: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

