/**
 * Profile completeness checks (mirrors src/utils/profileComplete.ts).
 */

const { deriveAgeFields } = require('./birthDate');
const { isValidGrade } = require('./grades');

function isProfileComplete(userRow) {
  if (!userRow) return false;

  const { birthDate } = deriveAgeFields(userRow);
  const hasBirthDate = Boolean(birthDate);
  const hasGrade =
    typeof userRow.grade === 'string' &&
    userRow.grade.trim().length > 0 &&
    isValidGrade(userRow.grade.trim());
  const hasLanguage =
    typeof userRow.preferred_language === 'string' &&
    userRow.preferred_language.trim().length > 0;

  return hasBirthDate && hasGrade && hasLanguage;
}

module.exports = { isProfileComplete };
