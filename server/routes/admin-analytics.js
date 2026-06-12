/**
 * Admin Analytics API routes
 * Comprehensive analytics and reporting for admins
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

const router = express.Router();

// All routes require authentication and view_analytics permission
router.use(authenticateToken);
router.use(checkPermission('view_analytics'));

/**
 * Get platform summary statistics
 * GET /api/admin/analytics/summary
 */
router.get('/summary', async (req, res, next) => {
  try {
    // Total users
    const totalUsersResult = await pool.query(
      'SELECT COUNT(*) as count FROM users'
    );
    const totalUsers = parseInt(totalUsersResult.rows[0].count);

    // Active users (approved)
    const activeUsersResult = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE status IN ('approved', 'enabled')"
    );
    const activeUsers = parseInt(activeUsersResult.rows[0].count);

    // Pending users
    const pendingUsersResult = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE status = 'pending'"
    );
    const pendingUsers = parseInt(pendingUsersResult.rows[0].count);

    // Total topics
    const totalTopicsResult = await pool.query(
      'SELECT COUNT(*) as count FROM topics WHERE is_active = true'
    );
    const totalTopics = parseInt(totalTopicsResult.rows[0].count);

    // Total quizzes
    const totalQuizzesResult = await pool.query(
      'SELECT COUNT(*) as count FROM quizzes WHERE is_active = true'
    );
    const totalQuizzes = parseInt(totalQuizzesResult.rows[0].count);

    // Total quiz attempts
    const totalAttemptsResult = await pool.query(
      'SELECT COUNT(*) as count FROM quiz_attempts'
    );
    const totalAttempts = parseInt(totalAttemptsResult.rows[0].count);

    // Average quiz score
    const avgScoreResult = await pool.query(
      'SELECT AVG(score_percentage) as avg FROM quiz_attempts WHERE status = \'completed\''
    );
    const avgScore = avgScoreResult.rows[0].avg
      ? Math.round(parseFloat(avgScoreResult.rows[0].avg) * 100) / 100
      : 0;

    res.json({
      success: true,
      summary: {
        totalUsers,
        activeUsers,
        pendingUsers,
        totalTopics,
        totalQuizzes,
        totalAttempts,
        avgScore,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get user analytics
 * GET /api/admin/analytics/users
 */
router.get('/users', async (req, res, next) => {
  try {
    const { ageGroup, startDate, endDate } = req.query;

    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.age_group,
        u.status,
        u.created_at,
        u.last_login,
        COUNT(DISTINCT qa.id) as quiz_attempts,
        COUNT(DISTINCT sp.id) as study_sessions,
        COALESCE(AVG(qa.score_percentage), 0) as avg_score,
        COALESCE(SUM(qa.time_taken), 0) as total_study_time,
        COALESCE(SUM(tu.tokens_earned), 0) as total_tokens
      FROM users u
      LEFT JOIN quiz_attempts qa ON u.id = qa.user_id
      LEFT JOIN study_progress sp ON u.id = sp.user_id
      LEFT JOIN tokens_usage tu ON u.id = tu.user_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (ageGroup) {
      paramCount++;
      query += ` AND u.age_group = $${paramCount}`;
      params.push(ageGroup);
    }

    if (startDate) {
      paramCount++;
      query += ` AND u.created_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND u.created_at <= $${paramCount}`;
      params.push(endDate);
    }

    query += `
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      users: result.rows.map((row) => ({
        ...row,
        avg_score: Math.round(parseFloat(row.avg_score) * 100) / 100,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get topic analytics
 * GET /api/admin/analytics/topics
 */
router.get('/topics', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        t.id,
        t.title,
        t.age_group,
        t.category,
        t.difficulty_level,
        COUNT(DISTINCT s.id) as subtopic_count,
        COUNT(DISTINCT q.id) as quiz_count,
        COUNT(DISTINCT qa.id) as attempt_count,
        COALESCE(AVG(qa.score_percentage), 0) as avg_score,
        COUNT(DISTINCT sp.user_id) as unique_students
      FROM topics t
      LEFT JOIN subtopics s ON t.id = s.topic_id
      LEFT JOIN quizzes q ON s.id = q.subtopic_id
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
      LEFT JOIN study_progress sp ON s.id = sp.subtopic_id
      WHERE t.is_active = true
      GROUP BY t.id
      ORDER BY attempt_count DESC`
    );

    res.json({
      success: true,
      topics: result.rows.map((row) => ({
        ...row,
        avg_score: Math.round(parseFloat(row.avg_score) * 100) / 100,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get age group distribution
 * GET /api/admin/analytics/age-groups
 */
router.get('/age-groups', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        age_group,
        COUNT(*) as user_count
      FROM users
      WHERE age_group IS NOT NULL
      GROUP BY age_group
      ORDER BY age_group`
    );

    res.json({
      success: true,
      distribution: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get most popular topics
 * GET /api/admin/analytics/popular-topics
 */
router.get('/popular-topics', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(
      `SELECT 
        t.title,
        t.category,
        COUNT(DISTINCT qa.user_id) as unique_students,
        COUNT(qa.id) as total_attempts,
        COALESCE(AVG(qa.score_percentage), 0) as avg_score
      FROM topics t
      INNER JOIN subtopics s ON t.id = s.topic_id
      INNER JOIN quizzes q ON s.id = q.subtopic_id
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
      WHERE t.is_active = true
      GROUP BY t.id, t.title, t.category
      ORDER BY total_attempts DESC
      LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      topics: result.rows.map((row) => ({
        ...row,
        avg_score: Math.round(parseFloat(row.avg_score) * 100) / 100,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get quiz success rates
 * GET /api/admin/analytics/quiz-success-rates
 */
router.get('/quiz-success-rates', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        q.id,
        q.name,
        q.difficulty,
        q.passing_percentage,
        COUNT(qa.id) as total_attempts,
        COUNT(CASE WHEN qa.score_percentage >= q.passing_percentage THEN 1 END) as passed_attempts,
        COALESCE(AVG(qa.score_percentage), 0) as avg_score,
        ROUND(
          COUNT(CASE WHEN qa.score_percentage >= q.passing_percentage THEN 1 END)::numeric / 
          NULLIF(COUNT(qa.id), 0) * 100, 
          2
        ) as success_rate
      FROM quizzes q
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.status = 'completed'
      WHERE q.is_active = true
      GROUP BY q.id, q.name, q.difficulty, q.passing_percentage
      ORDER BY success_rate DESC`
    );

    res.json({
      success: true,
      quizzes: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get activity logs
 * GET /api/admin/analytics/activity-logs
 */
router.get('/activity-logs', async (req, res, next) => {
  try {
    const { userId, action, eventType, startDate, endDate, limit = 100 } = req.query;

    let query = `
      SELECT 
        al.*,
        u.name as user_name,
        u.email as user_email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (userId) {
      paramCount++;
      query += ` AND al.user_id = $${paramCount}`;
      params.push(userId);
    }

    if (action) {
      paramCount++;
      query += ` AND al.action = $${paramCount}`;
      params.push(action);
    }

    if (eventType) {
      paramCount++;
      query += ` AND al.event_type = $${paramCount}`;
      params.push(eventType);
    }

    if (startDate) {
      paramCount++;
      query += ` AND al.created_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND al.created_at <= $${paramCount}`;
      params.push(endDate);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${++paramCount}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      logs: result.rows,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get engagement analytics
 * GET /api/admin/analytics/engagement
 */
router.get('/engagement', async (req, res, next) => {
  try {
    const { startDate, endDate, ageGroup } = req.query;

    // Daily active users
    const dauQuery = `
      SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as count
      FROM activity_logs
      WHERE event_type = 'USER_LOGIN' AND user_id IS NOT NULL
      ${startDate ? `AND created_at >= '${startDate}'` : ''}
      ${endDate ? `AND created_at <= '${endDate}'` : ''}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;
    const dauResult = await pool.query(dauQuery);

    // Weekly active users
    const wauQuery = `
      SELECT DATE_TRUNC('week', created_at) as week, COUNT(DISTINCT user_id) as count
      FROM activity_logs
      WHERE event_type = 'USER_LOGIN' AND user_id IS NOT NULL
      ${startDate ? `AND created_at >= '${startDate}'` : ''}
      ${endDate ? `AND created_at <= '${endDate}'` : ''}
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week DESC
      LIMIT 12
    `;
    const wauResult = await pool.query(wauQuery);

    // Monthly active users
    const mauQuery = `
      SELECT DATE_TRUNC('month', created_at) as month, COUNT(DISTINCT user_id) as count
      FROM activity_logs
      WHERE event_type = 'USER_LOGIN' AND user_id IS NOT NULL
      ${startDate ? `AND created_at >= '${startDate}'` : ''}
      ${endDate ? `AND created_at <= '${endDate}'` : ''}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC
      LIMIT 12
    `;
    const mauResult = await pool.query(mauQuery);

    // Session duration distribution
    const sessionDurationQuery = `
      SELECT 
        CASE 
          WHEN duration < 60 THEN '0-1 min'
          WHEN duration < 300 THEN '1-5 min'
          WHEN duration < 600 THEN '5-10 min'
          WHEN duration < 1800 THEN '10-30 min'
          ELSE '30+ min'
        END as duration_range,
        COUNT(*) as count
      FROM activity_logs
      WHERE event_type = 'USER_LOGOUT' AND duration IS NOT NULL
      ${startDate ? `AND created_at >= '${startDate}'` : ''}
      ${endDate ? `AND created_at <= '${endDate}'` : ''}
      GROUP BY duration_range
      ORDER BY duration_range
    `;
    const sessionDurationResult = await pool.query(sessionDurationQuery);

    // Most active hours
    const activeHoursQuery = `
      SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
      FROM activity_logs
      WHERE event_type IN ('USER_LOGIN', 'QUIZ_STARTED', 'STUDY_SESSION_STARTED')
      ${startDate ? `AND created_at >= '${startDate}'` : ''}
      ${endDate ? `AND created_at <= '${endDate}'` : ''}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `;
    const activeHoursResult = await pool.query(activeHoursQuery);

    res.json({
      success: true,
      engagement: {
        dailyActiveUsers: dauResult.rows,
        weeklyActiveUsers: wauResult.rows,
        monthlyActiveUsers: mauResult.rows,
        sessionDuration: sessionDurationResult.rows,
        activeHours: activeHoursResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get study analytics
 * GET /api/admin/analytics/study
 */
router.get('/study', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Most studied topics
    const mostStudiedQuery = `
      SELECT 
        t.id,
        t.title,
        COUNT(DISTINCT al.user_id) as unique_students,
        COUNT(al.id) as total_views,
        AVG(al.duration) as avg_duration
      FROM activity_logs al
      INNER JOIN topics t ON al.resource_id = t.id AND al.resource_type = 'topic'
      WHERE al.event_type IN ('TOPIC_VIEWED', 'STUDY_SESSION_STARTED')
      ${startDate ? `AND al.created_at >= '${startDate}'` : ''}
      ${endDate ? `AND al.created_at <= '${endDate}'` : ''}
      GROUP BY t.id, t.title
      ORDER BY total_views DESC
      LIMIT 10
    `;
    const mostStudiedResult = await pool.query(mostStudiedQuery);

    // Least studied topics
    const leastStudiedQuery = `
      SELECT 
        t.id,
        t.title,
        COUNT(DISTINCT al.user_id) as unique_students,
        COUNT(al.id) as total_views
      FROM topics t
      LEFT JOIN activity_logs al ON al.resource_id = t.id AND al.resource_type = 'topic'
        AND al.event_type IN ('TOPIC_VIEWED', 'STUDY_SESSION_STARTED')
        ${startDate ? `AND al.created_at >= '${startDate}'` : ''}
        ${endDate ? `AND al.created_at <= '${endDate}'` : ''}
      WHERE t.is_active = true
      GROUP BY t.id, t.title
      ORDER BY total_views ASC, unique_students ASC
      LIMIT 10
    `;
    const leastStudiedResult = await pool.query(leastStudiedQuery);

    // Study completion rates
    const completionQuery = `
      SELECT 
        COUNT(CASE WHEN event_type = 'STUDY_SESSION_STARTED' THEN 1 END) as started,
        COUNT(CASE WHEN event_type = 'STUDY_SESSION_COMPLETED' THEN 1 END) as completed
      FROM activity_logs
      WHERE event_type IN ('STUDY_SESSION_STARTED', 'STUDY_SESSION_COMPLETED')
      ${startDate ? `AND created_at >= '${startDate}'` : ''}
      ${endDate ? `AND created_at <= '${endDate}'` : ''}
    `;
    const completionResult = await pool.query(completionQuery);

    // Average study time per session
    const avgStudyTimeQuery = `
      SELECT AVG(duration) as avg_duration
      FROM activity_logs
      WHERE event_type = 'STUDY_SESSION_COMPLETED' AND duration IS NOT NULL
      ${startDate ? `AND created_at >= '${startDate}'` : ''}
      ${endDate ? `AND created_at <= '${endDate}'` : ''}
    `;
    const avgStudyTimeResult = await pool.query(avgStudyTimeQuery);

    res.json({
      success: true,
      study: {
        mostStudied: mostStudiedResult.rows,
        leastStudied: leastStudiedResult.rows,
        completionRate: completionResult.rows[0]?.started
          ? (completionResult.rows[0].completed / completionResult.rows[0].started) * 100
          : 0,
        avgStudyTime: avgStudyTimeResult.rows[0]?.avg_duration || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get quiz analytics
 * GET /api/admin/analytics/quizzes
 */
router.get('/quizzes', async (req, res, next) => {
  try {
    const { startDate, endDate, ageGroup } = req.query;

    // Most attempted quizzes
    const mostAttemptedQuery = `
      SELECT 
        q.id,
        q.name,
        q.difficulty,
        COUNT(qa.id) as total_attempts,
        COUNT(DISTINCT qa.user_id) as unique_students,
        AVG(qa.score_percentage) as avg_score,
        COUNT(CASE WHEN qa.score_percentage >= q.passing_percentage THEN 1 END) as passed_count
      FROM quizzes q
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
        ${startDate ? `AND qa.created_at >= '${startDate}'` : ''}
        ${endDate ? `AND qa.created_at <= '${endDate}'` : ''}
      WHERE q.is_active = true
      GROUP BY q.id, q.name, q.difficulty, q.passing_percentage
      ORDER BY total_attempts DESC
      LIMIT 10
    `;
    const mostAttemptedResult = await pool.query(mostAttemptedQuery);

    // Quiz success rates by difficulty
    const successByDifficultyQuery = `
      SELECT 
        q.difficulty,
        COUNT(qa.id) as total_attempts,
        COUNT(CASE WHEN qa.score_percentage >= q.passing_percentage THEN 1 END) as passed,
        AVG(qa.score_percentage) as avg_score
      FROM quizzes q
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.status = 'completed'
        ${startDate ? `AND qa.created_at >= '${startDate}'` : ''}
        ${endDate ? `AND qa.created_at <= '${endDate}'` : ''}
      WHERE q.is_active = true
      GROUP BY q.difficulty
    `;
    const successByDifficultyResult = await pool.query(successByDifficultyQuery);

    // Questions with high error rate
    const highErrorRateQuery = `
      SELECT 
        qq.id,
        qq.question_text,
        q.name as quiz_name,
        COUNT(qaa.id) as total_attempts,
        COUNT(CASE WHEN qaa.is_correct = false THEN 1 END) as wrong_answers,
        ROUND(
          COUNT(CASE WHEN qaa.is_correct = false THEN 1 END)::numeric / 
          NULLIF(COUNT(qaa.id), 0) * 100, 
          2
        ) as error_rate
      FROM quiz_questions qq
      INNER JOIN quizzes q ON qq.quiz_id = q.id
      LEFT JOIN quiz_attempt_answers qaa ON qq.id = qaa.question_id
        ${startDate ? `AND qaa.created_at >= '${startDate}'` : ''}
        ${endDate ? `AND qaa.created_at <= '${endDate}'` : ''}
      WHERE q.is_active = true
      GROUP BY qq.id, qq.question_text, q.name
      HAVING COUNT(qaa.id) > 5
      ORDER BY error_rate DESC
      LIMIT 10
    `;
    const highErrorRateResult = await pool.query(highErrorRateQuery);

    res.json({
      success: true,
      quizzes: {
        mostAttempted: mostAttemptedResult.rows,
        successByDifficulty: successByDifficultyResult.rows,
        highErrorRateQuestions: highErrorRateResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get insights and recommendations
 * GET /api/admin/analytics/insights
 */
router.get('/insights', async (req, res, next) => {
  try {
    const insights = [];

    // Topics rarely studied
    const rareTopicsQuery = `
      SELECT t.id, t.title, COUNT(al.id) as view_count
      FROM topics t
      LEFT JOIN activity_logs al ON al.resource_id = t.id 
        AND al.resource_type = 'topic'
        AND al.event_type IN ('TOPIC_VIEWED', 'STUDY_SESSION_STARTED')
        AND al.created_at >= NOW() - INTERVAL '30 days'
      WHERE t.is_active = true
      GROUP BY t.id, t.title
      HAVING COUNT(al.id) < 5
      ORDER BY view_count ASC
      LIMIT 5
    `;
    const rareTopicsResult = await pool.query(rareTopicsQuery);
    if (rareTopicsResult.rows.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Topics Rarely Studied',
        message: `${rareTopicsResult.rows.length} topics have been viewed less than 5 times in the last 30 days.`,
        data: rareTopicsResult.rows,
        recommendation: 'Consider updating content or promoting these topics.',
      });
    }

    // Quizzes with high failure rate
    const highFailureQuery = `
      SELECT q.id, q.name, 
        COUNT(qa.id) as total_attempts,
        COUNT(CASE WHEN qa.score_percentage < q.passing_percentage THEN 1 END) as failed,
        ROUND(
          COUNT(CASE WHEN qa.score_percentage < q.passing_percentage THEN 1 END)::numeric / 
          NULLIF(COUNT(qa.id), 0) * 100, 
          2
        ) as failure_rate
      FROM quizzes q
      LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id 
        AND qa.status = 'completed'
        AND qa.created_at >= NOW() - INTERVAL '30 days'
      WHERE q.is_active = true
      GROUP BY q.id, q.name, q.passing_percentage
      HAVING COUNT(qa.id) >= 10 AND 
        COUNT(CASE WHEN qa.score_percentage < q.passing_percentage THEN 1 END)::numeric / 
        NULLIF(COUNT(qa.id), 0) > 0.5
      ORDER BY failure_rate DESC
      LIMIT 5
    `;
    const highFailureResult = await pool.query(highFailureQuery);
    if (highFailureResult.rows.length > 0) {
      insights.push({
        type: 'error',
        title: 'Quizzes with High Failure Rate',
        message: `${highFailureResult.rows.length} quizzes have failure rates above 50%.`,
        data: highFailureResult.rows,
        recommendation: 'Review difficulty level or question quality.',
      });
    }

    // Inactive users
    const inactiveUsersQuery = `
      SELECT u.id, u.name, u.email, u.last_login
      FROM users u
      WHERE u.status IN ('approved', 'enabled')
        AND (u.last_login IS NULL OR u.last_login < NOW() - INTERVAL '30 days')
      ORDER BY u.last_login ASC NULLS FIRST
      LIMIT 10
    `;
    const inactiveUsersResult = await pool.query(inactiveUsersQuery);
    if (inactiveUsersResult.rows.length > 0) {
      insights.push({
        type: 'info',
        title: 'Inactive Users',
        message: `${inactiveUsersResult.rows.length} approved users haven't logged in for 30+ days.`,
        data: inactiveUsersResult.rows,
        recommendation: 'Send notification or reminder to re-engage.',
      });
    }

    res.json({
      success: true,
      insights,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get quiz results analytics with rankings
 * GET /api/admin/analytics/quiz-results?subject=&subtopic=&sortBy=score|time|questions|composite
 * Rankings based on: Score (60%), Questions Correct (20%), Time Efficiency (20%)
 */
router.get('/quiz-results', async (req, res, next) => {
  try {
    const { subject, subtopic, sortBy = 'composite', limit = 100 } = req.query;

    let query = `
      SELECT 
        qr.id,
        qr.user_id,
        qr.timestamp,
        qr.subject,
        qr.subtopic,
        qr.age,
        qr.language,
        qr.correct_count,
        qr.wrong_count,
        qr.time_taken,
        qr.score_percentage,
        u.name as user_name,
        u.email as user_email,
        (qr.correct_count + qr.wrong_count) as total_questions
      FROM quiz_results qr
      LEFT JOIN users u ON qr.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (subject) {
      paramCount++;
      query += ` AND qr.subject ILIKE $${paramCount}`;
      params.push(`%${subject}%`);
    }

    if (subtopic) {
      paramCount++;
      query += ` AND qr.subtopic ILIKE $${paramCount}`;
      params.push(`%${subtopic}%`);
    }

    query += ` ORDER BY qr.timestamp DESC LIMIT $${++paramCount}`;
    params.push(parseInt(limit) || 100);

    const result = await pool.query(query, params);

    // Calculate composite scores and rankings
    const participants = result.rows.map((row) => {
      const totalQuestions = parseInt(row.total_questions) || 1;
      const correctAnswers = parseInt(row.correct_count) || 0;
      const timeTaken = parseInt(row.time_taken) || 1; // in seconds
      const scorePercentage = parseFloat(row.score_percentage) || 0;

      // Calculate components (normalized to 0-100 scale)
      // Score component (60% weight) - already 0-100
      const scoreComponent = scorePercentage * 0.6;

      // Questions component (20% weight) - percentage of correct answers
      const questionsComponent = (correctAnswers / totalQuestions) * 100 * 0.2;

      // Time efficiency component (20% weight) - faster is better
      // Normalize: assume average time per question is 30 seconds
      // More efficient = less time per question
      const avgTimePerQuestion = timeTaken / totalQuestions;
      const idealTimePerQuestion = 30; // seconds
      const timeEfficiency = Math.max(0, Math.min(100, (idealTimePerQuestion / avgTimePerQuestion) * 100));
      const timeComponent = timeEfficiency * 0.2;

      // Composite score
      const compositeScore = scoreComponent + questionsComponent + timeComponent;

      return {
        attemptId: row.id,
        userId: row.user_id,
        userName: row.user_name || 'Unknown',
        userEmail: row.user_email || '',
        subject: row.subject,
        subtopic: row.subtopic,
        age: row.age,
        language: row.language,
        timestamp: row.timestamp,
        scorePercentage: Math.round(scorePercentage),
        correctAnswers,
        totalQuestions,
        wrongAnswers: parseInt(row.wrong_count) || 0,
        timeTaken,
        timeTakenFormatted: formatTime(timeTaken),
        compositeScore: Math.round(compositeScore * 10) / 10,
        scoreBreakdown: {
          scoreComponent: Math.round(scoreComponent * 10) / 10,
          questionsComponent: Math.round(questionsComponent * 10) / 10,
          timeComponent: Math.round(timeComponent * 10) / 10,
        },
      };
    });

    // Sort by selected criteria
    let sortedParticipants = [...participants];
    switch (sortBy) {
      case 'score':
        sortedParticipants.sort((a, b) => b.scorePercentage - a.scorePercentage);
        break;
      case 'time':
        sortedParticipants.sort((a, b) => a.timeTaken - b.timeTaken);
        break;
      case 'questions':
        sortedParticipants.sort((a, b) => {
          const ratioA = a.correctAnswers / a.totalQuestions;
          const ratioB = b.correctAnswers / b.totalQuestions;
          return ratioB - ratioA;
        });
        break;
      case 'composite':
      default:
        sortedParticipants.sort((a, b) => b.compositeScore - a.compositeScore);
        break;
    }

    // Assign ranks
    sortedParticipants.forEach((participant, index) => {
      participant.rank = index + 1;
    });

    // Group by subject/subtopic for summary
    const summary = {
      totalAttempts: participants.length,
      totalParticipants: new Set(participants.map((p) => p.userId)).size,
      averageScore: participants.length > 0
        ? Math.round(participants.reduce((sum, p) => sum + p.scorePercentage, 0) / participants.length)
        : 0,
      averageTime: participants.length > 0
        ? Math.round(participants.reduce((sum, p) => sum + p.timeTaken, 0) / participants.length)
        : 0,
      subjects: {},
    };

    participants.forEach((p) => {
      if (!summary.subjects[p.subject]) {
        summary.subjects[p.subject] = {
          attempts: 0,
          averageScore: 0,
          participants: new Set(),
        };
      }
      summary.subjects[p.subject].attempts++;
      summary.subjects[p.subject].participants.add(p.userId);
    });

    // Calculate average scores per subject
    Object.keys(summary.subjects).forEach((subject) => {
      const subjectParticipants = participants.filter((p) => p.subject === subject);
      summary.subjects[subject].averageScore = subjectParticipants.length > 0
        ? Math.round(
            subjectParticipants.reduce((sum, p) => sum + p.scorePercentage, 0) /
              subjectParticipants.length
          )
        : 0;
      summary.subjects[subject].participants = summary.subjects[subject].participants.size;
    });

    res.json({
      success: true,
      summary,
      leaderboard: sortedParticipants,
      participants: sortedParticipants,
    });
  } catch (error) {
    console.error('Error in quiz results analytics:', error);
    next(error);
  }
});

/**
 * Format time in seconds to readable format
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

module.exports = router;

