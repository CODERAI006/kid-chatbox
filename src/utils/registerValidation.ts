/**
 * Client-side registration field validation (mirrors server auth rules).
 */

import { REGISTER_CONSTANTS, isValidGrade } from '@/constants/auth';
import { QUIZ_CONSTANTS } from '@/constants/quiz';
import { RegisterData } from '@/types';
import { deriveRegistrationAgeFields } from '@/utils/birthDate';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RegisterFieldKey = keyof Pick<
  RegisterData,
  'name' | 'email' | 'password' | 'birthDate' | 'grade'
>;

export type RegisterFieldErrors = Partial<Record<RegisterFieldKey, string>>;

export interface PasswordCheck {
  id: string;
  label: string;
  passed: boolean;
}

export function getPasswordChecks(password: string): PasswordCheck[] {
  const value = password.trim();
  return [
    {
      id: 'length',
      label: REGISTER_CONSTANTS.PASSWORD_MIN_LENGTH,
      passed: value.length >= 8,
    },
    {
      id: 'letter',
      label: REGISTER_CONSTANTS.PASSWORD_NEEDS_LETTER,
      passed: /[a-zA-Z]/.test(value),
    },
    {
      id: 'number',
      label: REGISTER_CONSTANTS.PASSWORD_NEEDS_NUMBER,
      passed: /\d/.test(value),
    },
  ];
}

export function validatePasswordField(password: string): string | undefined {
  if (!password.trim()) {
    return REGISTER_CONSTANTS.PASSWORD_REQUIRED;
  }
  const checks = getPasswordChecks(password);
  if (checks.every((check) => check.passed)) {
    return undefined;
  }
  return REGISTER_CONSTANTS.PASSWORD_HINT;
}

export function validateEmailField(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) {
    return REGISTER_CONSTANTS.EMAIL_REQUIRED;
  }
  if (!EMAIL_PATTERN.test(trimmed.toLowerCase())) {
    return REGISTER_CONSTANTS.EMAIL_INVALID;
  }
  return undefined;
}

export function validateNameField(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) {
    return REGISTER_CONSTANTS.NAME_REQUIRED;
  }
  if (trimmed.length < 2) {
    return REGISTER_CONSTANTS.NAME_TOO_SHORT;
  }
  return undefined;
}

export function validateBirthDateField(birthDate: string): string | undefined {
  if (!birthDate) {
    return REGISTER_CONSTANTS.BIRTH_DATE_REQUIRED;
  }
  const { age } = deriveRegistrationAgeFields(birthDate);
  if (age == null) {
    return REGISTER_CONSTANTS.BIRTH_DATE_INVALID;
  }
  if (age < QUIZ_CONSTANTS.MIN_AGE || age > QUIZ_CONSTANTS.MAX_AGE) {
    return REGISTER_CONSTANTS.AGE_OUT_OF_RANGE;
  }
  return undefined;
}

export function validateGradeField(grade: string): string | undefined {
  if (!isValidGrade(grade)) {
    return REGISTER_CONSTANTS.GRADE_REQUIRED;
  }
  return undefined;
}

export function validateRegisterField(
  field: RegisterFieldKey,
  data: RegisterData
): string | undefined {
  switch (field) {
    case 'name':
      return validateNameField(data.name);
    case 'email':
      return validateEmailField(data.email);
    case 'password':
      return validatePasswordField(data.password);
    case 'birthDate':
      return validateBirthDateField(data.birthDate);
    case 'grade':
      return validateGradeField(data.grade);
    default:
      return undefined;
  }
}

export function validateRegisterForm(data: RegisterData): RegisterFieldErrors {
  const fields: RegisterFieldKey[] = ['name', 'email', 'password', 'birthDate', 'grade'];
  const errors: RegisterFieldErrors = {};

  for (const field of fields) {
    const message = validateRegisterField(field, data);
    if (message) {
      errors[field] = message;
    }
  }

  return errors;
}

export function isRegisterFormValid(data: RegisterData): boolean {
  return Object.keys(validateRegisterForm(data)).length === 0;
}
