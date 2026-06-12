/**
 * Admin — student app feedback review & analytics
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);
router.use(checkPermission('view_analytics'));

function buildGradeClause(grade, params) {
  if (!grade || grade === 'all') return { sql: '', params };
  params.push(String(grade));
  return { sql: ` AND u.grade = $${params.length}`, params };
}

function mapFeedbackRow(row) {
  let wishes = row.feature_wishes;
  if (typeof wishes === 'string') {
    try {
      wishes = JSON.parse(wishes);
    } catch {
      wishes = [];
    }
  }
  return {
    id: row.id,
    rating: row.rating,
    featureWishes: Array.isArray(wishes) ? wishes : [],
    message: row.message,
    source: row.source,
    quizSubject: row.quiz_subject,
    quizScore: row.quiz_score,
    quizTotal: row.quiz_total,
    createdAt: row.created_at,
    studentName: row.student_name,
    studentEmail: row.student_email,
    grade: row.grade,
  };
}

/** GET /api/admin/feedback/grades */
router.get('/grades', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT u.grade
      FROM app_feedback f
      INNER JOIN users u ON u.id = f.user_id
      WHERE u.grade IS NOT NULL AND TRIM(u.grade) <> ''
      ORDER BY u.grade
    `);
    res.json({ success: true, grades: rows.map((r) => r.grade) });
  } catch (error) {
    next(error);
  }
});

/** GET /api/admin/feedback/analytics?grade=&days=30 */
router.get('/analytics', async (req, res, next) => {
  try {
    const grade = req.query.grade;
    const days = Math.min(Math.max(parseInt(String(req.query.days || '30'), 10) || 30, 7), 90);
    const params = [days];
    const gradeClause = buildGradeClause(grade, params);

    const summarySql = `
      SELECT
        COUNT(*)::int AS total,
        ROUND(AVG(f.rating)::numeric, 2) AS avg_rating,
        COUNT(*) FILTER (WHERE f.created_at >= NOW() - INTERVAL '7 days')::int AS this_week
      FROM app_feedback f
      INNER JOIN users u ON u.id = f.user_id
      WHERE f.created_at >= NOW() - ($1::int || ' days')::interval
      ${gradeClause.sql}
    `;

    const ratingSql = `
      SELECT f.rating, COUNT(*)::int AS count
      FROM app_feedback f
      INNER JOIN users u ON u.id = f.user_id
      WHERE f.created_at >= NOW() - ($1::int || ' days')::interval
      ${gradeClause.sql}
      GROUP BY f.rating ORDER BY f.rating
    `;

    const sourceSql = `
      SELECT f.source, COUNT(*)::int AS count
      FROM app_feedback f
      INNER JOIN users u ON u.id = f.user_id
      WHERE f.created_at >= NOW() - ($1::int || ' days')::interval
      ${gradeClause.sql}
      GROUP BY f.source ORDER BY count DESC
    `;

    const gradeSql = `
      SELECT COALESCE(NULLIF(TRIM(u.grade), ''), 'Unknown') AS grade,
             COUNT(*)::int AS count,
             ROUND(AVG(f.rating)::numeric, 2) AS avg_rating
      FROM app_feedback f
      INNER JOIN users u ON u.id = f.user_id
      WHERE f.created_at >= NOW() - ($1::int || ' days')::interval
      ${gradeClause.sql}
      GROUP BY COALESCE(NULLIF(TRIM(u.grade), ''), 'Unknown')
      ORDER BY count DESC
    `;

    const timelineSql = `
      SELECT DATE(f.created_at) AS date,
             COUNT(*)::int AS count,
             ROUND(AVG(f.rating)::numeric, 2) AS avg_rating
      FROM app_feedback f
      INNER JOIN users u ON u.id = f.user_id
      WHERE f.created_at >= NOW() - ($1::int || ' days')::interval
      ${gradeClause.sql}
      GROUP BY DATE(f.created_at)
      ORDER BY date
    `;

    const wishesSql = `
      SELECT wish, COUNT(*)::int AS count
      FROM app_feedback f
      INNER JOIN users u ON u.id = f.user_id,
      LATERAL jsonb_array_elements_text(f.feature_wishes) AS wish
      WHERE f.created_at >= NOW() - ($1::int || ' days')::interval
      ${gradeClause.sql}
      GROUP BY wish
      ORDER BY count DESC
      LIMIT 12
    `;

    const [
      summaryRes,
      ratingRes,
      sourceRes,
      gradeRes,
      timelineRes,
      wishesRes,
    ] = await Promise.all([
      pool.query(summarySql, params),
      pool.query(ratingSql, params),
      pool.query(sourceSql, params),
      pool.query(gradeSql, params),
      pool.query(timelineSql, params),
      pool.query(wishesSql, params),
    ]);

    const summary = summaryRes.rows[0] || { total: 0, avg_rating: 0, this_week: 0 };

    res.json({
      success: true,
      days,
      grade: grade && grade !== 'all' ? grade : null,
      summary: {
        total: summary.total,
        avgRating: Number(summary.avg_rating) || 0,
        thisWeek: summary.this_week,
      },
      ratingDistribution: ratingRes.rows.map((r) => ({
        rating: r.rating,
        count: r.count,
      })),
      bySource: sourceRes.rows,
      byGrade: gradeRes.rows.map((r) => ({
        grade: r.grade,
        count: r.count,
        avgRating: Number(r.avg_rating) || 0,
      })),
      overTime: timelineRes.rows.map((r) => ({
        date: r.date,
        count: r.count,
        avgRating: Number(r.avg_rating) || 0,
      })),
      featureWishes: wishesRes.rows,
    });
  } catch (error) {
    next(error);
  }
});

/** GET /api/admin/feedback?grade=&page=1&limit=20 */
router.get('/', async (req, res, next) => {
  try {
    const grade = req.query.grade;
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 5), 100);
    const offset = (page - 1) * limit;
    const params = [];
    const gradeClause = buildGradeClause(grade, params);

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM app_feedback f
      INNER JOIN users u ON u.id = f.user_id
      WHERE 1=1 ${gradeClause.sql}
    `;

    params.push(limit, offset);
    const listSql = `
      SELECT
        f.id, f.rating, f.feature_wishes, f.message, f.source,
        f.quiz_subject, f.quiz_score, f.quiz_total, f.created_at,
        u.name AS student_name, u.email AS student_email, u.grade
      FROM app_feedback f
      INNER JOIN users u ON u.id = f.user_id
      WHERE 1=1 ${gradeClause.sql}
      ORDER BY f.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const countParams = params.slice(0, params.length - 2);
    const [countRes, listRes] = await Promise.all([
      pool.query(countSql, countParams),
      pool.query(listSql, params),
    ]);

    res.json({
      success: true,
      items: listRes.rows.map(mapFeedbackRow),
      total: countRes.rows[0]?.total || 0,
      page,
      pageSize: limit,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
