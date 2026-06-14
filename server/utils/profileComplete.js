/**
 * Profile completeness checks (mirrors src/utils/profileComplete.ts).
 */

const { deriveAgeFields } = require('./birthDate');
const { isValidGrade } = require('./grades');

function isProfileComplete(userRow) {
  if (!userRow) return false;

  const { age, birthDate } = deriveAgeFields(userRow);
  const hasAge = age != null && Number.isFinite(Number(age)) && Number(age) > 0;
  const hasBirthDate = Boolean(birthDate);
  const hasGrade =
    typeof userRow.grade === 'string' &&
    userRow.grade.trim().length > 0 &&
    isValidGrade(userRow.grade.trim());
  const hasLanguage =
    typeof userRow.preferred_language === 'string' &&
    userRow.preferred_language.trim().length > 0;

  return (hasAge || hasBirthDate) && hasGrade && hasLanguage;
}

module.exports = { isProfileComplete };
