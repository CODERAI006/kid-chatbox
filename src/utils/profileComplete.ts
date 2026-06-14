/**
 * Profile completeness checks for mandatory onboarding fields.
 */

import { isValidGrade } from '@/constants/auth';
import { resolveProfileAge, formatBirthDateValue } from '@/utils/birthDate';
import { User } from '@/types';

export function isProfileComplete(user: Partial<User> | null | undefined): boolean {
  if (!user) return false;

  const age = resolveProfileAge(user);
  const hasAge = age != null && age > 0;
  const hasBirthDate = Boolean(formatBirthDateValue(user.birthDate));
  const hasGrade = isValidGrade(user.grade);
  const hasLanguage =
    typeof user.preferredLanguage === 'string' && user.preferredLanguage.trim().length > 0;

  return (hasAge || hasBirthDate) && hasGrade && hasLanguage;
}

export function getPostAuthPath(user: Partial<User> | null | undefined): string {
  return isProfileComplete(user) ? '/dashboard' : '/profile';
}
