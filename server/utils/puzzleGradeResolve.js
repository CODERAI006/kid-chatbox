/**
 * Resolve puzzle grade — logged-in students see ONLY their class.
 */

const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { resolveGradeLabel } = require('../services/wordOfDayService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function resolvePuzzleGrade(req) {
  const { getGlobalConfig } = require('../utils/puzzleSettings');
  const global = await getGlobalConfig();

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const r = await pool.query(
        `SELECT grade FROM users WHERE id = $1 AND grade IS NOT NULL AND grade != ''`,
        [decoded.userId],
      );
      if (r.rows[0]?.grade) {
        const grade = await resolveGradeLabel(r.rows[0].grade);
        return { grade, locked: true, classOnly: true };
      }
    }
  } catch {
    /* public fallback */
  }

  const grade = await resolveGradeLabel(req.query.grade || req.body?.grade || global.default_grade);
  return { grade, locked: false, classOnly: false };
}

module.exports = { resolvePuzzleGrade };
