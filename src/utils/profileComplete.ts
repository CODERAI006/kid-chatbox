/**
 * Profile completeness checks for mandatory onboarding fields.
 */

import { isValidGrade } from '@/constants/auth';
import { formatBirthDateValue } from '@/utils/birthDate';
import { User } from '@/types';

export function isBirthDateMissing(user: Partial<User> | null | undefined): boolean {
  return !formatBirthDateValue(user?.birthDate);
}

export function isProfileComplete(user: Partial<User> | null | undefined): boolean {
  if (!user) return false;

  if (user.profileComplete === true) return true;
  if (user.profileComplete === false) return false;

  const hasBirthDate = Boolean(formatBirthDateValue(user.birthDate));
  const hasGrade = isValidGrade(user.grade);
  const preferredLanguage =
    user.preferredLanguage ??
    (typeof (user as { preferred_language?: string }).preferred_language === 'string'
      ? (user as { preferred_language: string }).preferred_language
      : undefined);
  const hasLanguage =
    typeof preferredLanguage === 'string' && preferredLanguage.trim().length > 0;

  return hasBirthDate && hasGrade && hasLanguage;
}

export function getMissingFieldLabels(flags: {
  missingBirthDate: boolean;
  missingGrade: boolean;
  missingLanguage: boolean;
}): string[] {
  const labels: string[] = [];
  if (flags.missingBirthDate) labels.push('date of birth');
  if (flags.missingGrade) labels.push('grade');
  if (flags.missingLanguage) labels.push('preferred language');
  return labels;
}

export function getPostAuthPath(user: Partial<User> | null | undefined): string {
  return isProfileComplete(user) ? '/dashboard' : '/profile';
}
