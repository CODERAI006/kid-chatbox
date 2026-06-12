/**
 * Birth date parsing, validation, and age derivation for user profiles.
 */

const { ageFromNumber } = require('./resolveQuizAgeGroup');

const USER_MIN_AGE = 4;
const USER_MAX_AGE = 99;
const AGE_OUT_OF_RANGE_MESSAGE = `Learners must be aged ${USER_MIN_AGE} to ${USER_MAX_AGE}. Please use a valid date of birth.`;

function isAllowedUserAge(age) {
  return Number.isFinite(age) && age >= USER_MIN_AGE && age <= USER_MAX_AGE;
}

function formatBirthDateValue(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function parseBirthDate(value) {
  if (value == null || value === '') return { value: null };
  const str = String(value).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { error: 'Date of birth must be YYYY-MM-DD' };

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { error: 'Invalid date of birth' };
  }

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  if (date > todayUtc) return { error: 'Date of birth cannot be in the future' };

  const oldest = new Date(Date.UTC(today.getFullYear() - USER_MAX_AGE, today.getMonth(), today.getDate()));
  if (date < oldest) return { error: 'Date of birth is too far in the past' };

  return { value: `${match[1]}-${match[2]}-${match[3]}` };
}

function calculateAgeFromBirthDate(birthDateStr) {
  const normalized = formatBirthDateValue(birthDateStr);
  if (!normalized) return null;

  const [year, month, day] = normalized.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) age -= 1;

  return age > 0 && age <= USER_MAX_AGE ? age : null;
}

function deriveAgeFields(userRow) {
  const birthDate = formatBirthDateValue(userRow.birth_date);
  if (!birthDate) {
    return {
      age: userRow.age ?? null,
      ageGroup: userRow.age_group ?? null,
      birthDate: null,
    };
  }

  const age = calculateAgeFromBirthDate(birthDate);
  const ageGroup = age != null ? ageFromNumber(age) : (userRow.age_group ?? null);

  return { age, ageGroup, birthDate };
}

module.exports = {
  USER_MIN_AGE,
  USER_MAX_AGE,
  AGE_OUT_OF_RANGE_MESSAGE,
  isAllowedUserAge,
  formatBirthDateValue,
  parseBirthDate,
  calculateAgeFromBirthDate,
  deriveAgeFields,
  ageFromNumber,
};
