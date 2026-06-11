/**
 * Analytics routes
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { getRankableQuizzes, getQuizRankings } = require('../utils/quizRankings');

const router = express.Router();

/**
 * Get available quizzes for filtering
 * Fetches from quiz_library table and also includes quizzes from quiz_results
 * GET /api/analytics/quiz-rankings/quizzes
 */
router.get('/quiz-rankings/quizzes', authenticateToken, async (req, res, next) => {
  try {
    const quizzes = await getRankableQuizzes(pool);
    res.json({ success: true, quizzes });
  } catch (error) {
    console.error('Error fetching quiz list:', error);
    next(error);
  }
});

/**
 * Get quiz rankings (student accessible)
 * GET /api/analytics/quiz-rankings?quizId=&subject=&subtopic=&sortBy=score|time|questions|composite
 * NOTE: This must come BEFORE /:userId route to avoid route conflict
 */
router.get('/quiz-rankings', authenticateToken, async (req, res, next) => {
  try {
    const { quizId, subject, subtopic, sortBy = 'composite', limit = 100 } = req.query;
    const data = await getQuizRankings(pool, { quizId, subject, subtopic, sortBy, limit });
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('Error in quiz rankings:', error);
    next(error);
  }
});

/**
 * Get user analytics
 */
router.get('/:userId', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Verify user can only access their own analytics
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Get total quizzes
    const totalQuizzesResult = await pool.query(
      'SELECT COUNT(*) as count FROM quiz_results WHERE user_id = $1',
      [userId]
    );
    const totalQuizzes = parseInt(totalQuizzesResult.rows[0].count, 10);

    // Get per-subject accuracy
    const subjectAccuracyResult = await pool.query(
      `SELECT 
        subject,
        AVG(score_percentage) as avg_score,
        COUNT(*) as quiz_count
      FROM quiz_results
      WHERE user_id = $1
      GROUP BY subject`,
      [userId]
    );

    const perSubjectAccuracy = {};
    subjectAccuracyResult.rows.forEach((row) => {
      perSubjectAccuracy[row.subject] = Math.round(parseFloat(row.avg_score));
    });

    // Get per-subtopic accuracy
    const subtopicAccuracyResult = await pool.query(
      `SELECT 
        subtopic,
        AVG(score_percentage) as avg_score,
        COUNT(*) as quiz_count
      FROM quiz_results
      WHERE user_id = $1
      GROUP BY subtopic`,
      [userId]
    );

    const perSubtopicAccuracy = {};
    subtopicAccuracyResult.rows.forEach((row) => {
      perSubtopicAccuracy[row.subtopic] = Math.round(parseFloat(row.avg_score));
    });

    // Get total time spent studying (sum of time_taken)
    const timeSpentResult = await pool.query(
      'SELECT SUM(time_taken) as total_time FROM quiz_results WHERE user_id = $1',
      [userId]
    );
    const timeSpentStudying = parseInt(timeSpentResult.rows[0].total_time || 0, 10);

    // Get improvement trend (last 10 quizzes)
    const trendResult = await pool.query(
      `SELECT score_percentage
       FROM quiz_results
       WHERE user_id = $1
       ORDER BY timestamp DESC
       LIMIT 10`,
      [userId]
    );
    const improvementTrend = trendResult.rows
      .reverse()
      .map((row) => Math.round(parseFloat(row.score_percentage)));

    // Get last three scores (legacy)
    const lastScoresResult = await pool.query(
      `SELECT 
        score_percentage,
        subject,
        timestamp
      FROM quiz_results
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT 3`,
      [userId]
    );

    const lastThreeScores = lastScoresResult.rows.map((row) => ({
      score: Math.round(parseFloat(row.score_percentage)),
      subject: row.subject,
      date: row.timestamp.toISOString(),
    }));

    // Unified recent activity — last 2 study or quiz events
    const recentActivityResult = await pool.query(
      `(SELECT 'quiz' AS type, subject AS title, subtopic AS subtitle,
               score_percentage AS score, timestamp
        FROM quiz_results WHERE user_id = $1)
       UNION ALL
       (SELECT 'study' AS type,
               COALESCE(lesson_title, topic) AS title,
               subject AS subtitle,
               NULL AS score,
               timestamp
        FROM study_sessions WHERE user_id = $1)
       ORDER BY timestamp DESC
       LIMIT 2`,
      [userId]
    );

    const recentActivities = recentActivityResult.rows.map((row) => ({
      type: row.type,
      title: row.title,
      subtitle: row.subtitle,
      date: row.timestamp.toISOString(),
      score: row.score != null ? Math.round(parseFloat(row.score)) : undefined,
    }));

    // Identify strengths (subjects with >70% accuracy)
    const strengths = Object.entries(perSubjectAccuracy)
      .filter(([_, score]) => score >= 70)
      .map(([subject]) => subject);

    // Identify weaknesses (subjects with <50% accuracy)
    const weaknesses = Object.entries(perSubjectAccuracy)
      .filter(([_, score]) => score < 50)
      .map(([subject]) => subject);

    // Get recommended topics (weakest subtopics)
    const recommendedTopics = subtopicAccuracyResult.rows
      .filter((row) => parseFloat(row.avg_score) < 60)
      .sort((a, b) => parseFloat(a.avg_score) - parseFloat(b.avg_score))
      .slice(0, 5)
      .map((row) => row.subtopic);

    res.json({
      success: true,
      total_quizzes: totalQuizzes,
      per_subject_accuracy: perSubjectAccuracy,
      per_subtopic_accuracy: perSubtopicAccuracy,
      time_spent_studying: timeSpentStudying,
      improvement_trend: improvementTrend,
      last_three_scores: lastThreeScores,
      recent_activities: recentActivities,
      strengths,
      weaknesses,
      recommended_topics: recommendedTopics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get recommended topics for improvement
 */
router.get('/recommendations/:userId', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Verify user can only access their own recommendations
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Get weakest subtopics
    const result = await pool.query(
      `SELECT 
        DISTINCT qr.subject,
        qr.subtopic,
        AVG(qr.score_percentage) as avg_score,
        COUNT(*) as quiz_count
      FROM quiz_results qr
      WHERE qr.user_id = $1
      GROUP BY qr.subject, qr.subtopic
      HAVING AVG(qr.score_percentage) < 70
      ORDER BY AVG(qr.score_percentage) ASC
      LIMIT 10`,
      [userId]
    );

    const topics = result.rows.map((row) => ({
      subject: row.subject,
      subtopic: row.subtopic,
      reason: `Your average score is ${Math.round(parseFloat(row.avg_score))}%. Practice more to improve!`,
    }));

    res.json({
      success: true,
      topics,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

