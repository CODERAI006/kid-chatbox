/**
 * Builds SQL visibility filters for study library content shown to students.
 * General content is visible to everyone; grade/subject narrow the audience.
 */

function isAdminUser(user) {
  return Array.isArray(user?.roles) && user.roles.includes('admin');
}

/**
 * @param {object} opts
 * @param {string|null} opts.userGrade
 * @param {boolean} opts.skipFilter - admins see all published content
 * @returns {{ clause: string, params: unknown[], nextIndex: number }}
 */
function buildStudentVisibilityClause({ userGrade, skipFilter }, startIndex = 0) {
  if (skipFilter) {
    return { clause: '', params: [], nextIndex: startIndex };
  }

  let idx = startIndex;
  const params = [];

  if (!userGrade) {
    idx += 1;
    params.push(true);
    const clause = ` AND (slc.is_general = $${idx} OR slc.grade IS NULL)`;
    return { clause, params, nextIndex: idx };
  }

  idx += 1;
  params.push(true);
  const generalParam = idx;

  idx += 1;
  params.push(userGrade);
  const gradeParam = idx;

  const clause = ` AND (
    slc.is_general = $${generalParam}
    OR slc.grade IS NULL
    OR slc.grade = $${gradeParam}
  )`;

  return { clause, params, nextIndex: idx };
}

module.exports = { isAdminUser, buildStudentVisibilityClause };
