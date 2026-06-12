/**
 * Birth date formatting and age derivation (mirrors server/utils/birthDate.js).
 */

export function formatBirthDateValue(value?: string | null): string | null {
  if (value == null || value === '') return null;
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export function calculateAgeFromBirthDate(birthDateStr?: string | null): number | null {
  const normalized = formatBirthDateValue(birthDateStr);
  if (!normalized) return null;

  const [year, month, day] = normalized.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age -= 1;
  }

  return age > 0 && age <= 99 ? age : null;
}

export function resolveProfileAge(user: {
  age?: number | null;
  birthDate?: string | null;
}): number | null {
  const fromBirthDate = calculateAgeFromBirthDate(user.birthDate);
  if (fromBirthDate != null) return fromBirthDate;
  return user.age != null ? Number(user.age) : null;
}

/** Mirrors server/utils/resolveQuizAgeGroup.js ageFromNumber */
export function ageGroupFromNumber(age: number): string | null {
  if (!Number.isFinite(age) || age <= 0) return null;
  if (age <= 8) return '6-8';
  if (age <= 11) return '9-11';
  if (age <= 14) return '12-14';
  return '15+';
}

export function deriveRegistrationAgeFields(birthDateStr?: string | null): {
  age: number | null;
  ageGroup: string | null;
} {
  const age = calculateAgeFromBirthDate(birthDateStr);
  const ageGroup = age != null ? ageGroupFromNumber(age) : null;
  return { age, ageGroup };
}
