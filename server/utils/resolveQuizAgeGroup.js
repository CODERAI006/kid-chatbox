/**
 * Resolve quizzes.age_group (NOT NULL) from AI job / create payloads.
 */

const { pool } = require('../config/database');

function ageFromNumber(age) {
  const n = Number(age);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n <= 8) return '6-8';
  if (n <= 11) return '9-11';
  if (n <= 14) return '12-14';
  return '15+';
}

/**
 * @param {object} payload
 * @param {string|number} [payload.ageGroup]
 * @param {string} [payload.gradeLevel]
 * @param {number} [payload.age]
 * @param {string} [payload.subtopicId]
 * @returns {Promise<string>}
 */
async function resolveQuizAgeGroup(payload) {
  const fromAgeGroup =
    payload?.ageGroup != null && String(payload.ageGroup).trim()
      ? String(payload.ageGroup).trim()
      : null;
  if (fromAgeGroup) return fromAgeGroup;

  const fromUserAgeGroup =
    payload?.userAgeGroup != null && String(payload.userAgeGroup).trim()
      ? String(payload.userAgeGroup).trim()
      : null;
  if (fromUserAgeGroup) return fromUserAgeGroup;

  const fromAge = ageFromNumber(payload?.age);
  if (fromAge) return fromAge;

  const fromGrade =
    payload?.gradeLevel != null && String(payload.gradeLevel).trim()
      ? String(payload.gradeLevel).trim()
      : null;
  if (fromGrade) return fromGrade;

  if (payload?.subtopicId) {
    const topicRes = await pool.query(
      `SELECT t.age_group
       FROM subtopics s
       INNER JOIN topics t ON t.id = s.topic_id
       WHERE s.id = $1`,
      [payload.subtopicId]
    );
    const topicAge = topicRes.rows[0]?.age_group;
    if (topicAge && String(topicAge).trim()) {
      return String(topicAge).trim();
    }
  }

  return '9-14';
}

module.exports = { resolveQuizAgeGroup, ageFromNumber };
