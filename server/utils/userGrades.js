/**
 * Resolve distinct grades from active users for nightly content batch jobs.
 */

const { pool } = require('../config/database');
const { gradesMatch } = require('./normalizeGrade');
const { getAllSettings: getWordOfDaySettings } = require('./wordOfDaySettings');
const { getAllSettings: getFactsSettings } = require('./dailyFactsSettings');

const ACTIVE_STATUSES = ['approved', 'enabled'];

async function getActiveUserGradeCounts() {
  const { rows } = await pool.query(
    `SELECT TRIM(grade) AS grade, COUNT(*)::int AS user_count
     FROM users
     WHERE status = ANY($1::text[])
       AND grade IS NOT NULL
       AND TRIM(grade) <> ''
     GROUP BY TRIM(grade)
     ORDER BY user_count DESC, grade ASC`,
    [ACTIVE_STATUSES],
  );
  return rows;
}

function resolveToCanonicalGrade(rawGrade, settingsRows) {
  const input = String(rawGrade || '').trim();
  if (!input) return null;

  for (const row of settingsRows) {
    if (gradesMatch(row.grade, input)) return row.grade;
  }
  return input;
}

/**
 * Grades to pregenerate: only classes with at least one active user,
 * mapped to canonical word-of-day / facts settings labels.
 */
async function getGradesForDailyBatch() {
  const [userGrades, wotdSettings, factsSettings] = await Promise.all([
    getActiveUserGradeCounts(),
    getWordOfDaySettings(),
    getFactsSettings(),
  ]);

  const byCanonical = new Map();

  for (const row of userGrades) {
    const canonical = resolveToCanonicalGrade(row.grade, wotdSettings);
    if (!canonical) continue;

    const wotd = wotdSettings.find((s) => gradesMatch(s.grade, canonical));
    const facts = factsSettings.find((s) => gradesMatch(s.grade, canonical));

    const existing = byCanonical.get(canonical);
    if (existing) {
      existing.userCount += row.user_count;
      if (!existing.rawGrades.includes(row.grade)) {
        existing.rawGrades.push(row.grade);
      }
      continue;
    }

    byCanonical.set(canonical, {
      grade: canonical,
      userCount: row.user_count,
      rawGrades: [row.grade],
      wordOfDayEnabled: Boolean(wotd?.enabled),
      factsEnabled: Boolean(facts?.enabled),
    });
  }

  return Array.from(byCanonical.values()).sort((a, b) => b.userCount - a.userCount);
}

module.exports = {
  ACTIVE_STATUSES,
  getActiveUserGradeCounts,
  getGradesForDailyBatch,
  resolveToCanonicalGrade,
};
